import type {HokusNft} from '@/domain/models/HokusNft';
import type {SoundEvent, SoundLayer, SoundLayerType, SoundscapeScript, SoundscapeTraits} from '@/domain/models/SoundscapeScript';

type SampleCatalogItem = {
  id: string;
  group: 'rain' | 'thunder' | 'forest' | 'wind';
  variants: number;
};

const SAMPLE_CATALOG: ReadonlyArray<SampleCatalogItem> = [
  {id: 'rain_drizzle_soft_loop', group: 'rain', variants: 16},
  {id: 'rain_drizzle_dense_loop', group: 'rain', variants: 12},
  {id: 'rain_steady_soft_loop', group: 'rain', variants: 16},
  {id: 'rain_steady_dense_loop', group: 'rain', variants: 13},
  {id: 'rain_storm_soft_loop', group: 'rain', variants: 16},
  {id: 'rain_storm_dense_loop', group: 'rain', variants: 12},
  {id: 'thunder_crack_close', group: 'thunder', variants: 15},
  {id: 'thunder_roll_far', group: 'thunder', variants: 11},
  {id: 'forest_bird_soft', group: 'forest', variants: 10},
  {id: 'forest_leaves_brush', group: 'forest', variants: 12},
  {id: 'wind_soft_gust', group: 'wind', variants: 13},
  {id: 'wind_dark_gust', group: 'wind', variants: 16}
];

const catalogById = new Map<string, SampleCatalogItem>(SAMPLE_CATALOG.map(item => [item.id, item]));

const SAMPLE_DURATION_RANGE_SEC: Record<string, {min: number; max: number}> = {
  rain_drizzle_soft_loop: {min: 0.08, max: 0.22},
  rain_drizzle_dense_loop: {min: 0.12, max: 0.3},
  rain_steady_soft_loop: {min: 0.16, max: 0.32},
  rain_steady_dense_loop: {min: 0.18, max: 0.38},
  rain_storm_soft_loop: {min: 0.22, max: 0.4},
  rain_storm_dense_loop: {min: 0.25, max: 0.4},
  thunder_crack_close: {min: 0.05, max: 0.25},
  thunder_roll_far: {min: 0.3, max: 1.2},
  forest_bird_soft: {min: 0.12, max: 0.5},
  forest_leaves_brush: {min: 0.18, max: 0.7},
  wind_soft_gust: {min: 0.2, max: 0.7},
  wind_dark_gust: {min: 0.3, max: 0.9}
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const createSeededRandom = (seed: string): (() => number) => {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
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

const randomBetween = (random: () => number, min: number, max: number): number => {
  return min + (max - min) * random();
};

const randomDurationForSample = (sampleId: string, random: () => number): number => {
  const range = SAMPLE_DURATION_RANGE_SEC[sampleId];
  return Number(randomBetween(random, range.min, range.max).toFixed(3));
};

const samplePath = (sampleId: string, variantIndex: number): string => {
  const item = catalogById.get(sampleId);
  if (!item) {
    return sampleId;
  }
  const suffix = variantIndex.toString().padStart(2, '0');
  return `${item.group}/${sampleId}_${suffix}.wav`;
};

const chooseSamplePath = (
  sampleId: string,
  random: () => number,
  localRecentMap: Map<string, number>
): string => {
  const item = catalogById.get(sampleId);
  if (!item) {
    return sampleId;
  }

  const lastVariant = localRecentMap.get(sampleId);
  let variant = 1 + Math.floor(random() * item.variants);
  if (item.variants > 1 && variant === lastVariant) {
    variant = 1 + (variant % item.variants);
  }

  localRecentMap.set(sampleId, variant);
  return samplePath(sampleId, variant);
};

const createEvent = (
  atSecond: number,
  sampleId: string,
  baseGain: number,
  random: () => number,
  localRecentMap: Map<string, number>,
  panWidth = 1
): SoundEvent => {
  const jitteredGain = clamp(baseGain * randomBetween(random, 0.84, 1.16), 0.05, 1);
  return {
    atSecond: Number(atSecond.toFixed(3)),
    durationSec: randomDurationForSample(sampleId, random),
    sample: chooseSamplePath(sampleId, random, localRecentMap),
    gain: Number(jitteredGain.toFixed(3)),
    pan: Number(randomBetween(random, -1, 1).toFixed(3)) * panWidth
  };
};

const pushLayerIfNotEmpty = (layers: SoundLayer[], layer: SoundLayer): void => {
  if (layer.events.length > 0) {
    layers.push(layer);
  }
};

const buildRainLayer = (nft: HokusNft, traits: SoundscapeTraits, random: () => number): SoundLayer => {
  const isDense = nft.soundParams.rainTexture > 55;
  const sampleId = `rain_${traits.rainVariant}_${isDense ? 'dense' : 'soft'}_loop`;
  const layerGain = clamp(0.34 + nft.soundParams.rainIntensity / 115, 0.32, 0.98);

  const minStep = clamp(0.16 - nft.soundParams.rhythmComplexity / 1400, 0.08, 0.18);
  const maxStep = clamp(0.38 - nft.soundParams.rainTexture / 900, 0.14, 0.42);

  const events: SoundEvent[] = [];
  const recentMap = new Map<string, number>();
  let cursor = 0;

  while (cursor < nft.loopLengthSec) {
    events.push(createEvent(cursor, sampleId, layerGain, random, recentMap, 0.9));
    cursor += randomBetween(random, minStep, maxStep);
  }

  return {
    id: 'rain-bed',
    type: 'rain',
    gain: Number(layerGain.toFixed(3)),
    events
  };
};

const buildThunderLayer = (nft: HokusNft, random: () => number): SoundLayer => {
  const thunderGain = clamp(0.46 + nft.soundParams.thunderPower / 125, 0.5, 1);
  const spacingBase = clamp(20 - Math.floor(nft.soundParams.thunderChance / 8), 6, 16);
  const events: SoundEvent[] = [];
  const recentMap = new Map<string, number>();

  let cursor = randomBetween(random, 2.5, 7.5);
  while (cursor < nft.loopLengthSec - 1.5) {
    const attackAt = cursor;
    const rollAt = cursor + randomBetween(random, 0.05, 0.24);

    events.push(createEvent(attackAt, 'thunder_crack_close', thunderGain, random, recentMap));
    events.push(
      createEvent(
        rollAt,
        'thunder_roll_far',
        clamp(thunderGain * randomBetween(random, 0.68, 0.9), 0.08, 1),
        random,
        recentMap,
        0.85
      )
    );

    cursor += spacingBase + randomBetween(random, 2, 9);
  }

  return {
    id: 'thunder',
    type: 'thunder',
    gain: Number(thunderGain.toFixed(3)),
    events
  };
};

const buildForestLayer = (nft: HokusNft, random: () => number): SoundLayer => {
  const cadence = clamp(12 - Math.floor(nft.soundParams.forestDensity / 10), 3.8, 10.5);
  const densityGain = clamp(0.2 + nft.soundParams.forestDensity / 220, 0.22, 0.72);

  const events: SoundEvent[] = [];
  const recentMap = new Map<string, number>();
  let cursor = randomBetween(random, 1.1, 3.6);

  while (cursor < nft.loopLengthSec) {
    const sampleId = random() > 0.48 ? 'forest_bird_soft' : 'forest_leaves_brush';
    events.push(createEvent(cursor, sampleId, densityGain, random, recentMap));
    cursor += cadence + randomBetween(random, -1.2, 1.8);
  }

  return {
    id: 'forest',
    type: 'forest',
    gain: Number(densityGain.toFixed(3)),
    events
  };
};

const buildWindLayer = (nft: HokusNft, random: () => number): SoundLayer => {
  const cadence = clamp(16 - Math.floor(nft.soundParams.rhythmComplexity / 8), 4.8, 15);
  const windGain = clamp(0.18 + nft.soundParams.windDepth / 180, 0.2, 0.82);

  const events: SoundEvent[] = [];
  const recentMap = new Map<string, number>();
  let cursor = randomBetween(random, 0.2, 2.2);

  while (cursor < nft.loopLengthSec) {
    const sampleId = nft.soundParams.lowNoise > 60 ? 'wind_dark_gust' : 'wind_soft_gust';
    events.push(createEvent(cursor, sampleId, windGain, random, recentMap, 0.75));
    cursor += cadence + randomBetween(random, -1.5, 2.3);
  }

  return {
    id: 'wind',
    type: 'wind',
    gain: Number(windGain.toFixed(3)),
    events
  };
};

const sortLayerEvents = (layer: SoundLayer): SoundLayer => {
  return {
    ...layer,
    events: [...layer.events].sort((a, b) => a.atSecond - b.atSecond)
  };
};

const sortLayers = (layers: SoundLayer[]): SoundLayer[] => {
  const order: SoundLayerType[] = ['rain', 'thunder', 'forest', 'wind'];
  return [...layers].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
};

export const generateProceduralSoundscapeScript = (nft: HokusNft): SoundscapeScript => {
  const random = createSeededRandom(`${nft.mintAddress}:${nft.soundFingerprint}:${nft.traitSeed}`);
  const traits = chooseTraits(nft);

  const layers: SoundLayer[] = [];
  pushLayerIfNotEmpty(layers, buildRainLayer(nft, traits, random));
  if (traits.hasThunder) {
    pushLayerIfNotEmpty(layers, buildThunderLayer(nft, random));
  }
  if (traits.hasForest) {
    pushLayerIfNotEmpty(layers, buildForestLayer(nft, random));
  }
  if (traits.hasWind) {
    pushLayerIfNotEmpty(layers, buildWindLayer(nft, random));
  }

  return {
    seed: nft.traitSeed,
    loopLengthSec: nft.loopLengthSec,
    params: nft.soundParams,
    traits,
    layers: sortLayers(layers).map(sortLayerEvents)
  };
};
