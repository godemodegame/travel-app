import type {HokusNft} from '@/domain/models/HokusNft';
import type {SoundEvent, SoundLayer, SoundscapeScript, SoundscapeTraits} from '@/domain/models/SoundscapeScript';

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

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

const chooseTraits = (nft: HokusNft): SoundscapeTraits => {
  const p = nft.soundParams;
  const rainVariant = p.rainIntensity >= 75 ? 'storm' : p.rainIntensity >= 45 ? 'steady' : 'drizzle';
  const hasThunder = p.thunderChance >= 70;
  const hasForest = p.forestDensity >= 78;
  const hasWind = p.windDepth >= 45;

  let rarityTier: SoundscapeTraits['rarityTier'] = 'Common';
  if (hasThunder || hasForest) {
    rarityTier = hasThunder && hasForest ? 'Epic' : 'Rare';
  }

  return {rainVariant, hasThunder, hasForest, hasWind, rarityTier};
};

const buildRainLayer = (nft: HokusNft, traits: SoundscapeTraits): SoundLayer => {
  const rainGain = clamp(0.28 + nft.soundParams.rainIntensity / 120, 0.35, 0.95);

  return {
    id: 'rain-bed',
    type: 'rain',
    gain: rainGain,
    events: [
      {
        atSecond: 0,
        durationSec: nft.loopLengthSec,
        sample: `rain_${traits.rainVariant}_${nft.soundParams.rainTexture > 55 ? 'dense' : 'soft'}_loop`,
        gain: rainGain,
        pan: 0
      }
    ]
  };
};

const buildThunderLayer = (nft: HokusNft, random: () => number): SoundLayer => {
  const events: SoundEvent[] = [];
  const spacingBase = clamp(18 - Math.floor(nft.soundParams.thunderChance / 12), 7, 16);
  const thunderGain = clamp(0.45 + nft.soundParams.thunderPower / 130, 0.5, 1);

  let cursor = 5 + Math.floor(random() * 6);
  while (cursor < nft.loopLengthSec - 4) {
    events.push({
      atSecond: cursor,
      durationSec: 3,
      sample: nft.soundParams.thunderPower > 72 ? 'thunder_crack_close' : 'thunder_roll_far',
      gain: thunderGain,
      pan: -0.9 + random() * 1.8
    });
    cursor += spacingBase + Math.floor(random() * 9);
  }

  return {id: 'thunder', type: 'thunder', gain: thunderGain, events};
};

const buildForestLayer = (nft: HokusNft, random: () => number): SoundLayer => {
  const events: SoundEvent[] = [];
  const cadence = clamp(14 - Math.floor(nft.soundParams.forestDensity / 9), 5, 12);
  const densityGain = clamp(0.2 + nft.soundParams.forestDensity / 220, 0.25, 0.72);

  for (let t = 2; t < nft.loopLengthSec; t += cadence) {
    events.push({
      atSecond: t,
      durationSec: 2,
      sample: random() > 0.45 ? 'forest_bird_soft' : 'forest_leaves_brush',
      gain: densityGain,
      pan: -1 + random() * 2
    });
  }

  return {id: 'forest', type: 'forest', gain: densityGain, events};
};

const buildWindLayer = (nft: HokusNft, random: () => number): SoundLayer => {
  const events: SoundEvent[] = [];
  const cadence = clamp(20 - Math.floor(nft.soundParams.rhythmComplexity / 8), 7, 18);
  const windGain = clamp(0.18 + nft.soundParams.windDepth / 180, 0.22, 0.8);

  for (let t = 0; t < nft.loopLengthSec; t += cadence) {
    events.push({
      atSecond: t,
      durationSec: 5,
      sample: nft.soundParams.lowNoise > 60 ? 'wind_dark_gust' : 'wind_soft_gust',
      gain: windGain,
      pan: -0.6 + random() * 1.2
    });
  }

  return {id: 'wind', type: 'wind', gain: windGain, events};
};

export const generateSoundscapeScript = (nft: HokusNft): SoundscapeScript => {
  const random = createSeededRandom(`${nft.mintAddress}:${nft.soundFingerprint}`);
  const traits = chooseTraits(nft);

  const layers: SoundLayer[] = [buildRainLayer(nft, traits)];
  if (traits.hasThunder) {
    layers.push(buildThunderLayer(nft, random));
  }
  if (traits.hasForest) {
    layers.push(buildForestLayer(nft, random));
  }
  if (traits.hasWind) {
    layers.push(buildWindLayer(nft, random));
  }

  return {
    seed: nft.traitSeed,
    loopLengthSec: nft.loopLengthSec,
    params: nft.soundParams,
    traits,
    layers
  };
};
