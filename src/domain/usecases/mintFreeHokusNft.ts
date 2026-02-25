import type {HokusNft} from '@/domain/models/HokusNft';
import type {SoundParams} from '@/domain/models/SoundParams';

export const FREE_MINT_PRICE_SOL = 0;

const createSeededRandom = (seed: string): (() => number) => {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }

  return () => {
    hash += 0x6d2b79f5;
    let t = Math.imul(hash ^ (hash >>> 15), 1 | hash);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const hashToHex = (input: string): string => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const nextInt = (random: () => number, min: number, max: number): number => {
  return min + Math.floor(random() * (max - min + 1));
};

export const buildSoundFingerprint = (params: SoundParams): string => {
  return [
    params.rainIntensity,
    params.rainTexture,
    params.thunderChance,
    params.thunderPower,
    params.forestDensity,
    params.windDepth,
    params.rhythmComplexity,
    params.stereoWidth,
    params.reverbAmount,
    params.lowNoise
  ].join('-');
};

export const buildSoundParams = (seed: string): SoundParams => {
  const random = createSeededRandom(seed);

  return {
    rainIntensity: nextInt(random, 25, 100),
    rainTexture: nextInt(random, 0, 100),
    thunderChance: nextInt(random, 0, 100),
    thunderPower: nextInt(random, 10, 100),
    forestDensity: nextInt(random, 0, 100),
    windDepth: nextInt(random, 0, 100),
    rhythmComplexity: nextInt(random, 10, 100),
    stereoWidth: nextInt(random, 20, 100),
    reverbAmount: nextInt(random, 0, 100),
    lowNoise: nextInt(random, 0, 100)
  };
};

const buildLoopLengthSec = (seed: string): number => {
  const random = createSeededRandom(`loop:${seed}`);
  // Each NFT has its own loop length in range 48..180 sec.
  return nextInt(random, 48, 180);
};

const createCandidateSeed = (ownerWallet: string, serial: number, entropy: string): string => {
  return `${ownerWallet}:${serial}:${entropy}`;
};

export const createHokusMintCandidate = (
  ownerWallet: string,
  serial: number,
  usedFingerprints: Set<string>,
  now: Date = new Date()
): HokusNft => {
  let salt = 0;

  while (true) {
    const entropy = `${now.getTime()}:${Math.random().toString(36).slice(2)}:${salt}`;
    const traitSeed = createCandidateSeed(ownerWallet, serial, entropy);
    const soundParams = buildSoundParams(traitSeed);
    const soundFingerprint = buildSoundFingerprint(soundParams);

    if (!usedFingerprints.has(soundFingerprint)) {
      const mintAddress = `HK${hashToHex(`${traitSeed}:${soundFingerprint}`)}${serial.toString(36)}`;
      return {
        mintAddress,
        serial,
        name: `Hokus Sound #${String(serial).padStart(4, '0')}`,
        ownerWallet,
        traitSeed,
        soundFingerprint,
        soundParams,
        loopLengthSec: buildLoopLengthSec(traitSeed),
        mintedAtIso: now.toISOString(),
        mintPriceSol: FREE_MINT_PRICE_SOL
      };
    }

    salt += 1;
  }
};
