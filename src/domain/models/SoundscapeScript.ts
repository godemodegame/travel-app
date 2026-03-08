import type {SoundParams} from '@/domain/models/SoundParams';

type RarityTier = 'Common' | 'Rare' | 'Epic';

export type SoundLayerType = 'rain' | 'thunder' | 'forest' | 'wind';

export type SoundEvent = {
  atSecond: number;
  durationSec: number;
  sample: string;
  gain: number;
  pan: number;
};

export type SoundLayer = {
  id: string;
  type: SoundLayerType;
  gain: number;
  events: SoundEvent[];
};

export type SoundscapeTraits = {
  rainVariant: 'drizzle' | 'steady' | 'storm';
  hasThunder: boolean;
  hasForest: boolean;
  hasWind: boolean;
  rarityTier: RarityTier;
};

export type SoundscapeScript = {
  seed: string;
  loopLengthSec: number;
  params: SoundParams;
  traits: SoundscapeTraits;
  layers: SoundLayer[];
};
