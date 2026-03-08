import type {HokusNftClient, MintedHokusNft} from '@/solana/nft/HokusNftClient';
import type {HokusNftMetadata} from '@/solana/nft/HokusNftMetadata';
import {
  MINT_SIZE,
  ACCOUNT_SIZE,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
  getMinimumBalanceForRentExemptAccount
} from '@solana/spl-token';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl
} from '@solana/web3.js';
import {
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
  Metadata,
  createCreateMetadataAccountV3Instruction,
  createCreateMasterEditionV3Instruction
} from '@metaplex-foundation/mpl-token-metadata';
import {
  createHokusGuardMintInstruction,
  deriveHokusGuardConfigPda,
  deriveHokusMintReceiptPda,
  resolveHokusMintGuardConfig
} from '@/solana/contract/hokusMintGuard';
import {transact} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import {Buffer} from 'buffer';
import bs58 from 'bs58';

const SOLANA_DEVNET_CHAIN = 'solana:devnet';
const APP_IDENTITY = {
  name: 'Hokus',
  uri: 'https://hokus.app',
  icon: 'favicon.ico'
} as const;
const LAMPORTS_PER_SOL = 1_000_000_000;
const METADATA_ACCOUNT_SIZE = 679;
const MASTER_EDITION_ACCOUNT_SIZE = 282;
const TX_SAFETY_BUFFER_LAMPORTS = 25_000;
const HOKUS_SYMBOL = 'HOKUS';
const HOKUS_MAX_SUPPLY = 10_000;
const SYMBOL_OFFSET = 1 + 32 + 32 + 4 + 32 + 4;
const CONFIG_ACCOUNT_SIZE = 82;
const RECEIPT_ACCOUNT_SIZE = 37;
const CONFIG_MAX_SUPPLY_OFFSET = 66;
const CONFIG_MINTED_SUPPLY_OFFSET = 70;

const lamportsToSol = (lamports: number): number => {
  return lamports / LAMPORTS_PER_SOL;
};

const formatSol = (lamports: number): string => {
  return lamportsToSol(lamports).toFixed(6);
};

const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const normalizeWalletAddress = (address: string): string => {
  try {
    return new PublicKey(address).toBase58();
  } catch {
    const decoded = Buffer.from(address, 'base64');
    return new PublicKey(decoded).toBase58();
  }
};

const findMetadataPda = (mint: PublicKey): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID
  )[0];
};

const findMasterEditionPda = (mint: PublicKey): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer(), Buffer.from('edition')],
    TOKEN_METADATA_PROGRAM_ID
  )[0];
};

const toMetadataUri = (metadata: HokusNftMetadata): string => {
  if (metadata.audioScriptUri) {
    return metadata.audioScriptUri;
  }

  return `https://example.com/hokus/${encodeURIComponent(metadata.name)}.json`;
};

const toMetadataName = (name: string): string => {
  return name.slice(0, 32);
};

const toMetadataSymbol = (): string => {
  return HOKUS_SYMBOL;
};

export class MetaplexHokusNftClient implements HokusNftClient {
  constructor(
    private readonly connection: Connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
  ) {}

  getMaxSupply(): number {
    return HOKUS_MAX_SUPPLY;
  }

  async getMintedSupply(): Promise<number> {
    const guard = resolveHokusMintGuardConfig();
    const configPda = deriveHokusGuardConfigPda(guard.programId);
    const account = await this.connection.getAccountInfo(configPda, 'confirmed');
    if (!account || !account.owner.equals(guard.programId) || account.data.length < CONFIG_ACCOUNT_SIZE) {
      return 0;
    }

    return account.data.readUInt32LE(CONFIG_MINTED_SUPPLY_OFFSET);
  }

  async mintSoundNft(metadata: HokusNftMetadata): Promise<MintedHokusNft> {
    const guard = resolveHokusMintGuardConfig();
    const guardConfigPda = deriveHokusGuardConfigPda(guard.programId);
    const mintedSupply = await this.getMintedSupply();
    if (mintedSupply >= HOKUS_MAX_SUPPLY) {
      throw new Error(`Hokus supply cap reached (${HOKUS_MAX_SUPPLY}). Mint is closed.`);
    }

    return transact(async wallet => {
      const authorization = await wallet.authorize({
        identity: APP_IDENTITY,
        chain: SOLANA_DEVNET_CHAIN
      });

      const [account] = authorization.accounts;
      if (!account) {
        throw new Error('Wallet authorized without any accounts');
      }

      const ownerWallet = normalizeWalletAddress(account.address);
      const ownerPublicKey = new PublicKey(ownerWallet);

      const mintKeypair = Keypair.generate();
      const mintPublicKey = mintKeypair.publicKey;
      const tokenAccount = getAssociatedTokenAddressSync(
        mintPublicKey,
        ownerPublicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const metadataPda = findMetadataPda(mintPublicKey);
      const masterEditionPda = findMasterEditionPda(mintPublicKey);
      const receiptPda = deriveHokusMintReceiptPda(guard.programId, mintPublicKey);
      const mintRent = await getMinimumBalanceForRentExemptMint(this.connection);
      const tokenAccountRent = await getMinimumBalanceForRentExemptAccount(this.connection);
      const metadataRent = await this.connection.getMinimumBalanceForRentExemption(METADATA_ACCOUNT_SIZE);
      const masterEditionRent = await this.connection.getMinimumBalanceForRentExemption(
        MASTER_EDITION_ACCOUNT_SIZE
      );
      const latestBlockhash = await this.connection.getLatestBlockhash('finalized');
      const walletBalance = await this.connection.getBalance(ownerPublicKey, 'confirmed');

      const metadataUri = toMetadataUri(metadata);
      const attributes = Object.entries(metadata.attributes).map(([trait_type, value]) => ({
        trait_type,
        value
      }));

      const tx = new Transaction({
        feePayer: ownerPublicKey,
        recentBlockhash: latestBlockhash.blockhash
      }).add(
        createHokusGuardMintInstruction({
          programId: guard.programId,
          configPda: guardConfigPda,
          payer: ownerPublicKey,
          treasury: guard.treasury,
          receiptPda,
          mint: mintPublicKey
        }),
        SystemProgram.createAccount({
          fromPubkey: ownerPublicKey,
          newAccountPubkey: mintPublicKey,
          lamports: mintRent,
          space: MINT_SIZE,
          programId: TOKEN_PROGRAM_ID
        }),
        createInitializeMintInstruction(mintPublicKey, 0, ownerPublicKey, ownerPublicKey),
        createAssociatedTokenAccountInstruction(
          ownerPublicKey,
          tokenAccount,
          ownerPublicKey,
          mintPublicKey,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        ),
        createMintToInstruction(mintPublicKey, tokenAccount, ownerPublicKey, 1),
        createCreateMetadataAccountV3Instruction(
          {
            metadata: metadataPda,
            mint: mintPublicKey,
            mintAuthority: ownerPublicKey,
            payer: ownerPublicKey,
            updateAuthority: ownerPublicKey
          },
          {
            createMetadataAccountArgsV3: {
              data: {
                name: toMetadataName(metadata.name),
                symbol: toMetadataSymbol(),
                uri: metadataUri,
                sellerFeeBasisPoints: 0,
                creators: null,
                collection: null,
                uses: null
              },
              isMutable: true,
              collectionDetails: null
            }
          }
        ),
        createCreateMasterEditionV3Instruction(
          {
            edition: masterEditionPda,
            mint: mintPublicKey,
            updateAuthority: ownerPublicKey,
            mintAuthority: ownerPublicKey,
            payer: ownerPublicKey,
            metadata: metadataPda
          },
          {
            createMasterEditionArgs: {
              maxSupply: 0
            }
          }
        )
      );

      const feeForMessage =
        (await this.connection.getFeeForMessage(tx.compileMessage(), 'confirmed')).value ?? 5000;
      const requiredLamports =
        mintRent +
        tokenAccountRent +
        metadataRent +
        masterEditionRent +
        feeForMessage +
        TX_SAFETY_BUFFER_LAMPORTS;

      if (walletBalance < requiredLamports) {
        const missingLamports = requiredLamports - walletBalance;
        throw new Error(
          `Insufficient SOL for mint. Need ~${formatSol(requiredLamports)} SOL, wallet has ${formatSol(walletBalance)} SOL. Top up at least ${formatSol(missingLamports)} SOL and try again.`
        );
      }

      tx.partialSign(mintKeypair);

      const signedTxs = await wallet.signTransactions({
        transactions: [tx]
      });
      const [signedTx] = signedTxs;
      if (!signedTx) {
        throw new Error('Wallet returned no signed transaction');
      }

      let signature: string | null = null;
      let lastError: unknown = null;
      const serializedTx = signedTx.serialize();

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          signature = await this.connection.sendRawTransaction(serializedTx, {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
          });

          await this.connection.confirmTransaction(
            {
              signature,
              blockhash: latestBlockhash.blockhash,
              lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
            },
            'confirmed'
          );
          break;
        } catch (error) {
          lastError = error;
          if (attempt < 3) {
            await delay(550 * attempt);
          }
        }
      }

      if (!signature) {
        const message = lastError instanceof Error ? lastError.message : String(lastError);
        if (message.toLowerCase().includes('network request failed')) {
          throw new Error(
            'Devnet RPC is temporarily unavailable. Check internet and try mint again in 10-20 seconds.'
          );
        }
        throw new Error(`Mint transaction failed: ${message}`);
      }

      return {
        mintAddress: mintPublicKey.toBase58(),
        signature,
        ownerWallet
      };
    });
  }

  async updateSoundNft(mintAddress: string, metadata: HokusNftMetadata): Promise<void> {
    void mintAddress;
    void metadata;
    // TODO: Integrate metadata update flow.
  }

  async getOwnedSoundNfts(ownerWallet: string): Promise<HokusNftMetadata[]> {
    let guardProgramId: PublicKey;
    try {
      guardProgramId = resolveHokusMintGuardConfig().programId;
    } catch {
      return [];
    }

    const owner = new PublicKey(ownerWallet);
    const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
      owner,
      {programId: TOKEN_PROGRAM_ID},
      'confirmed'
    );

    const mintAddresses = tokenAccounts.value
      .map(({account}) => {
        const parsed = account.data.parsed;
        const info = parsed?.info;
        const tokenAmount = info?.tokenAmount;
        if (!info?.mint || !tokenAmount) {
          return null;
        }

        if (tokenAmount.amount !== '1' || tokenAmount.decimals !== 0) {
          return null;
        }

        return info.mint as string;
      })
      .filter((mint): mint is string => mint !== null);

    if (mintAddresses.length === 0) {
      return [];
    }

    const metadataAddresses = mintAddresses.map(mintAddress =>
      findMetadataPda(new PublicKey(mintAddress))
    );
    const receiptAddresses = mintAddresses.map(mintAddress =>
      deriveHokusMintReceiptPda(guardProgramId, new PublicKey(mintAddress))
    );
    const metadataAccounts = await this.connection.getMultipleAccountsInfo(
      metadataAddresses,
      'confirmed'
    );
    const receiptAccounts = await this.connection.getMultipleAccountsInfo(receiptAddresses, 'confirmed');

    return metadataAccounts
      .map((account, index): HokusNftMetadata | null => {
        if (!account?.data) {
          return null;
        }

        try {
          const receipt = receiptAccounts[index];
          const mintPublicKey = new PublicKey(mintAddresses[index]);
          if (
            !receipt ||
            !receipt.owner.equals(guardProgramId) ||
            receipt.data.length < RECEIPT_ACCOUNT_SIZE ||
            receipt.data.readUInt8(0) !== 1 ||
            !receipt.data.subarray(1, 33).equals(mintPublicKey.toBuffer())
          ) {
            return null;
          }

          const [metadataAccount] = Metadata.deserialize(account.data);
          const name = metadataAccount.data.name.trim().replace(/\0/g, '');
          const description = `On-chain metadata (${metadataAccount.data.symbol.trim()})`;
          const uri = metadataAccount.data.uri.trim().replace(/\0/g, '');

          return {
            mintAddress: mintAddresses[index],
            name,
            description,
            attributes: {},
            audioScriptUri: uri.length > 0 ? uri : undefined
          };
        } catch {
          return null;
        }
      })
      .filter((item): item is HokusNftMetadata => item !== null)
      .filter(item => item.name.toLowerCase().includes('hokus'))
      .filter(item => item.description.includes(HOKUS_SYMBOL));
  }
}
