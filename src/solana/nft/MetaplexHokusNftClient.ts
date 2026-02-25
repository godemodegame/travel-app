import type {HokusNftClient, MintedHokusNft} from '@/solana/nft/HokusNftClient';
import type {HokusNftMetadata} from '@/solana/nft/HokusNftMetadata';
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint
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
  createCreateMetadataAccountV3Instruction,
  createCreateMasterEditionV3Instruction
} from '@metaplex-foundation/mpl-token-metadata';
import {transact} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import {Buffer} from 'buffer';

const SOLANA_TESTNET_CHAIN = 'solana:testnet';
const APP_IDENTITY = {
  name: 'Hokus',
  uri: 'https://hokus.app',
  icon: 'favicon.ico'
} as const;

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
  return 'HOKUS';
};

export class MetaplexHokusNftClient implements HokusNftClient {
  constructor(
    private readonly connection: Connection = new Connection(clusterApiUrl('testnet'), 'confirmed')
  ) {}

  async mintSoundNft(metadata: HokusNftMetadata): Promise<MintedHokusNft> {
    return transact(async wallet => {
      const authorization = await wallet.authorize({
        identity: APP_IDENTITY,
        chain: SOLANA_TESTNET_CHAIN
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
      const mintRent = await getMinimumBalanceForRentExemptMint(this.connection);
      const latestBlockhash = await this.connection.getLatestBlockhash('finalized');

      const metadataUri = toMetadataUri(metadata);
      const attributes = Object.entries(metadata.attributes).map(([trait_type, value]) => ({
        trait_type,
        value
      }));

      const tx = new Transaction({
        feePayer: ownerPublicKey,
        recentBlockhash: latestBlockhash.blockhash
      }).add(
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

      tx.partialSign(mintKeypair);

      const signatures = await wallet.signAndSendTransactions({
        transactions: [tx],
        commitment: 'confirmed'
      });

      const [signature] = signatures;
      if (!signature) {
        throw new Error('Mint transaction returned no signature');
      }

      await this.connection.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
        },
        'confirmed'
      );

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
    void ownerWallet;
    // TODO: Fetch owned NFT metadata from chain/indexer.
    return [];
  }
}
