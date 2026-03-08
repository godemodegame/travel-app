import type {HokusNftMetadata} from '@/solana/nft/HokusNftMetadata';

export type MintedHokusNft = {
  mintAddress: string;
  signature: string;
  ownerWallet: string;
};

export interface HokusNftClient {
  getMaxSupply(): number;
  getMintedSupply(): Promise<number>;
  mintSoundNft(metadata: HokusNftMetadata): Promise<MintedHokusNft>;
  updateSoundNft(mintAddress: string, metadata: HokusNftMetadata): Promise<void>;
  getOwnedSoundNfts(ownerWallet: string): Promise<HokusNftMetadata[]>;
}
