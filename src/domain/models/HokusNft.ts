import type {SoundParams} from '@/domain/models/SoundParams';

export type HokusNft = {
  mintAddress: string;
  serial: number;
  name: string;
  ownerWallet: string;
  traitSeed: string;
  soundFingerprint: string;
  soundParams: SoundParams;
  loopLengthSec: number;
  mintedAtIso: string;
  mintPriceSol: number;
};
