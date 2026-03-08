import type {HokusNft} from '@/domain/models/HokusNft';

export const resolveActiveNft = (
  nfts: HokusNft[],
  activeMintAddress: string | null
): HokusNft | null => {
  if (nfts.length === 0) {
    return null;
  }

  if (!activeMintAddress) {
    return nfts[0];
  }

  return nfts.find(nft => nft.mintAddress === activeMintAddress) ?? nfts[0];
};

export const resolveNextActiveMintAddress = (
  prevActiveMintAddress: string | null,
  nfts: HokusNft[]
): string | null => {
  if (prevActiveMintAddress && nfts.some(nft => nft.mintAddress === prevActiveMintAddress)) {
    return prevActiveMintAddress;
  }

  return nfts[0]?.mintAddress ?? null;
};
