use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    system_program,
    sysvar::Sysvar,
};
use thiserror::Error;

const CONFIG_SEED: &[u8] = b"hokus_config";
const RECEIPT_SEED: &[u8] = b"receipt";

const CONFIG_SIZE: usize = 82;
const RECEIPT_SIZE: usize = 37;
const MAX_SUPPLY: u32 = 10_000;
const MINT_PRICE_LAMPORTS: u64 = 100_000_000; // 0.1 SOL

const CONFIG_BUMP_OFFSET: usize = 1;
const CONFIG_AUTHORITY_OFFSET: usize = 2;
const CONFIG_TREASURY_OFFSET: usize = 34;
const CONFIG_MAX_SUPPLY_OFFSET: usize = 66;
const CONFIG_MINTED_SUPPLY_OFFSET: usize = 70;
const CONFIG_PRICE_OFFSET: usize = 74;

const TAG_INITIALIZE: u8 = 0;
const TAG_MINT: u8 = 1;

#[derive(Debug, Error)]
pub enum GuardError {
    #[error("Invalid instruction")]
    InvalidInstruction,
    #[error("Invalid account")]
    InvalidAccount,
    #[error("Invalid PDA")]
    InvalidPda,
    #[error("Unauthorized")]
    Unauthorized,
    #[error("Supply cap reached")]
    SupplyCapReached,
    #[error("Already initialized")]
    AlreadyInitialized,
    #[error("Already minted receipt")]
    ReceiptExists,
}

impl From<GuardError> for ProgramError {
    fn from(value: GuardError) -> Self {
        ProgramError::Custom(value as u32)
    }
}

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let tag = *instruction_data
        .first()
        .ok_or(GuardError::InvalidInstruction)?;

    match tag {
        TAG_INITIALIZE => process_initialize(program_id, accounts),
        TAG_MINT => {
            if instruction_data.len() != 33 {
                return Err(GuardError::InvalidInstruction.into());
            }
            let mint = Pubkey::new_from_array(
                instruction_data[1..33]
                    .try_into()
                    .map_err(|_| GuardError::InvalidInstruction)?,
            );
            process_mint(program_id, accounts, &mint)
        }
        _ => Err(GuardError::InvalidInstruction.into()),
    }
}

fn process_initialize(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let config = next_account_info(account_info_iter)?;
    let authority = next_account_info(account_info_iter)?;
    let treasury = next_account_info(account_info_iter)?;
    let system = next_account_info(account_info_iter)?;

    if !authority.is_signer {
        return Err(GuardError::Unauthorized.into());
    }
    if *system.key != system_program::id() {
        return Err(GuardError::InvalidAccount.into());
    }

    let (expected_pda, bump) = Pubkey::find_program_address(&[CONFIG_SEED], program_id);
    if expected_pda != *config.key {
        return Err(GuardError::InvalidPda.into());
    }

    if config.lamports() > 0 {
        return Err(GuardError::AlreadyInitialized.into());
    }

    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(CONFIG_SIZE);
    invoke_signed(
        &system_instruction::create_account(
            authority.key,
            config.key,
            lamports,
            CONFIG_SIZE as u64,
            program_id,
        ),
        &[authority.clone(), config.clone(), system.clone()],
        &[&[CONFIG_SEED, &[bump]]],
    )?;

    let mut data = config.try_borrow_mut_data()?;
    data.fill(0);
    data[0] = 1;
    data[CONFIG_BUMP_OFFSET] = bump;
    data[CONFIG_AUTHORITY_OFFSET..CONFIG_AUTHORITY_OFFSET + 32]
        .copy_from_slice(authority.key.as_ref());
    data[CONFIG_TREASURY_OFFSET..CONFIG_TREASURY_OFFSET + 32]
        .copy_from_slice(treasury.key.as_ref());
    data[CONFIG_MAX_SUPPLY_OFFSET..CONFIG_MAX_SUPPLY_OFFSET + 4]
        .copy_from_slice(&MAX_SUPPLY.to_le_bytes());
    data[CONFIG_MINTED_SUPPLY_OFFSET..CONFIG_MINTED_SUPPLY_OFFSET + 4]
        .copy_from_slice(&0u32.to_le_bytes());
    data[CONFIG_PRICE_OFFSET..CONFIG_PRICE_OFFSET + 8]
        .copy_from_slice(&MINT_PRICE_LAMPORTS.to_le_bytes());

    msg!("Hokus guard initialized");
    Ok(())
}

fn process_mint(program_id: &Pubkey, accounts: &[AccountInfo], mint: &Pubkey) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let config = next_account_info(account_info_iter)?;
    let payer = next_account_info(account_info_iter)?;
    let treasury = next_account_info(account_info_iter)?;
    let receipt = next_account_info(account_info_iter)?;
    let system = next_account_info(account_info_iter)?;

    if !payer.is_signer {
        return Err(GuardError::Unauthorized.into());
    }
    if *system.key != system_program::id() {
        return Err(GuardError::InvalidAccount.into());
    }

    let (expected_config_pda, _config_bump) = Pubkey::find_program_address(&[CONFIG_SEED], program_id);
    if expected_config_pda != *config.key {
        return Err(GuardError::InvalidPda.into());
    }

    if config.owner != program_id {
        return Err(GuardError::InvalidAccount.into());
    }

    let mut config_data = config.try_borrow_mut_data()?;
    if config_data.len() < CONFIG_SIZE || config_data[0] != 1 {
        return Err(GuardError::InvalidAccount.into());
    }

    let configured_treasury = Pubkey::new_from_array(
        config_data[CONFIG_TREASURY_OFFSET..CONFIG_TREASURY_OFFSET + 32]
            .try_into()
            .map_err(|_| GuardError::InvalidAccount)?,
    );
    if configured_treasury != *treasury.key {
        return Err(GuardError::InvalidAccount.into());
    }

    let max_supply = u32::from_le_bytes(
        config_data[CONFIG_MAX_SUPPLY_OFFSET..CONFIG_MAX_SUPPLY_OFFSET + 4]
            .try_into()
            .map_err(|_| GuardError::InvalidAccount)?,
    );
    let minted_supply = u32::from_le_bytes(
        config_data[CONFIG_MINTED_SUPPLY_OFFSET..CONFIG_MINTED_SUPPLY_OFFSET + 4]
            .try_into()
            .map_err(|_| GuardError::InvalidAccount)?,
    );
    let mint_price = u64::from_le_bytes(
        config_data[CONFIG_PRICE_OFFSET..CONFIG_PRICE_OFFSET + 8]
            .try_into()
            .map_err(|_| GuardError::InvalidAccount)?,
    );

    if minted_supply >= max_supply {
        return Err(GuardError::SupplyCapReached.into());
    }

    let (expected_receipt_pda, receipt_bump) =
        Pubkey::find_program_address(&[RECEIPT_SEED, mint.as_ref()], program_id);
    if expected_receipt_pda != *receipt.key {
        return Err(GuardError::InvalidPda.into());
    }

    if receipt.lamports() > 0 {
        return Err(GuardError::ReceiptExists.into());
    }

    invoke(
        &system_instruction::transfer(payer.key, treasury.key, mint_price),
        &[payer.clone(), treasury.clone(), system.clone()],
    )?;

    let rent = Rent::get()?;
    let receipt_lamports = rent.minimum_balance(RECEIPT_SIZE);
    invoke_signed(
        &system_instruction::create_account(
            payer.key,
            receipt.key,
            receipt_lamports,
            RECEIPT_SIZE as u64,
            program_id,
        ),
        &[payer.clone(), receipt.clone(), system.clone()],
        &[&[RECEIPT_SEED, mint.as_ref(), &[receipt_bump]]],
    )?;

    let mut receipt_data = receipt.try_borrow_mut_data()?;
    receipt_data.fill(0);
    receipt_data[0] = 1;
    receipt_data[1..33].copy_from_slice(mint.as_ref());
    receipt_data[33..37].copy_from_slice(&(minted_supply + 1).to_le_bytes());

    config_data[CONFIG_MINTED_SUPPLY_OFFSET..CONFIG_MINTED_SUPPLY_OFFSET + 4]
        .copy_from_slice(&(minted_supply + 1).to_le_bytes());

    msg!("Hokus mint guard approved mint #{}", minted_supply + 1);
    Ok(())
}
