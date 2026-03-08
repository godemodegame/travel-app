# Hokus Mint Guard (Solana Program)

Purpose:
- enforce max supply: `10_000`
- enforce mint fee: `0.1 SOL`
- issue on-chain mint receipt PDA for each approved mint

The mobile app recognizes Hokus NFTs only if a valid receipt PDA exists for the mint.

## PDA Layout

- Config PDA: seeds `["hokus_config"]`
- Receipt PDA: seeds `["receipt", mint_pubkey]`

## Instructions

- `Initialize` (`tag=0`)
  - Accounts:
    - `config` (PDA, writable)
    - `authority` (signer, payer)
    - `treasury`
    - `system_program`

- `Mint` (`tag=1` + 32 bytes `mint_pubkey`)
  - Accounts:
    - `config` (writable)
    - `payer` (signer, writable)
    - `treasury` (writable)
    - `receipt_pda` (writable)
    - `system_program`
  - Effects:
    - transfers `0.1 SOL` from payer to treasury
    - increments `minted_supply`
    - creates receipt account for mint

## Integration in App

1. Deploy this program.
2. Run `Initialize` once.
3. Set deployed addresses in:
   - `src/solana/contract/hokusMintGuard.ts`
4. Mint flow in app sends `Mint Guard` instruction before NFT mint instructions.
5. App only loads NFTs that have valid guard receipt PDA.

## Note

This repo currently does not include local Solana/Anchor toolchain binaries in environment.
Compile/deploy should be done in a Solana-capable environment.
