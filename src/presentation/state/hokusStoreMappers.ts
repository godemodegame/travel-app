import type {HokusNft} from '@/domain/models/HokusNft';
import {
  FREE_MINT_PRICE_SOL,
  buildSoundFingerprint,
  buildSoundParams
} from '@/domain/usecases/mintFreeHokusNft';
import type {HokusNftMetadata} from '@/solana/nft/HokusNftMetadata';

export const deriveLoopLengthSecFromSeed = (seed: string): number => {
  const params = buildSoundParams(seed);
  const score =
    params.rainIntensity +
    params.thunderChance +
    params.forestDensity +
    params.windDepth +
    params.rhythmComplexity;
  return 48 + (score % 133);
};

export const toLocalNfts = (
  owner: string,
  owned: Array<{mintAddress?: string; name: string}>
): HokusNft[] => {
  return owned.map((item, index): HokusNft => {
    const mintAddress = item.mintAddress ?? `imported-${index}`;
    const traitSeed = `onchain:${owner}:${mintAddress}`;
    const soundParams = buildSoundParams(traitSeed);
    const name = item.name || `Hokus Sound #${String(index + 1).padStart(4, '0')}`;

    return {
      mintAddress,
      serial: index + 1,
      name,
      ownerWallet: owner,
      traitSeed,
      soundFingerprint: buildSoundFingerprint(soundParams),
      soundParams,
      loopLengthSec: deriveLoopLengthSecFromSeed(traitSeed),
      mintedAtIso: new Date().toISOString(),
      mintPriceSol: FREE_MINT_PRICE_SOL
    };
  });
};

export const toMintMetadata = (candidate: HokusNft): HokusNftMetadata => {
  return {
    name: candidate.name,
    description: 'Hokus focus NFT: unique script-based rain sound profile',
    attributes: Object.fromEntries(
      [
        ...Object.entries(candidate.soundParams).map(([key, value]) => [key, String(value)]),
        ['loopLengthSec', String(candidate.loopLengthSec)]
      ]
    ),
    audioScriptUri: `https://example.com/hokus/script/${candidate.soundFingerprint}.json`
  };
};
