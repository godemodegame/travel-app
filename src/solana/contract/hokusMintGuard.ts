import {PublicKey, SystemProgram, TransactionInstruction} from '@solana/web3.js';

const CONFIG_SEED = Buffer.from('hokus_config', 'utf8');
const RECEIPT_SEED = Buffer.from('receipt', 'utf8');
const MINT_INSTRUCTION_TAG = 1;

const HOKUS_GUARD_PROGRAM_ID = '9HKJzk2RBA9UkLchsfiwJFxxa5diSHcEGG8VdorNMWQa';
const HOKUS_TREASURY_ADDRESS = 'HgbKwfPdSYEepJbr5swoSYLfJbjywEgQgzDtG1tUoUrv';

export type HokusMintGuardConfig = {
  programId: PublicKey;
  treasury: PublicKey;
};

export const resolveHokusMintGuardConfig = (): HokusMintGuardConfig => {
  return {
    programId: new PublicKey(HOKUS_GUARD_PROGRAM_ID),
    treasury: new PublicKey(HOKUS_TREASURY_ADDRESS)
  };
};

export const deriveHokusGuardConfigPda = (programId: PublicKey): PublicKey => {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], programId)[0];
};

export const deriveHokusMintReceiptPda = (programId: PublicKey, mint: PublicKey): PublicKey => {
  return PublicKey.findProgramAddressSync([RECEIPT_SEED, mint.toBuffer()], programId)[0];
};

export const createHokusGuardMintInstruction = (params: {
  programId: PublicKey;
  configPda: PublicKey;
  payer: PublicKey;
  treasury: PublicKey;
  receiptPda: PublicKey;
  mint: PublicKey;
}): TransactionInstruction => {
  const {programId, configPda, payer, treasury, receiptPda, mint} = params;
  const data = Buffer.alloc(33);
  data.writeUInt8(MINT_INSTRUCTION_TAG, 0);
  mint.toBuffer().copy(data, 1);

  return new TransactionInstruction({
    programId,
    keys: [
      {pubkey: configPda, isSigner: false, isWritable: true},
      {pubkey: payer, isSigner: true, isWritable: true},
      {pubkey: treasury, isSigner: false, isWritable: true},
      {pubkey: receiptPda, isSigner: false, isWritable: true},
      {pubkey: SystemProgram.programId, isSigner: false, isWritable: false}
    ],
    data
  });
};
