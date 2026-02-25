import type {WalletSession} from '@/solana/wallet/WalletSession';

export interface WalletProvider {
  connect(): Promise<WalletSession>;
  disconnect(): Promise<void>;
  currentSessionOrNull(): WalletSession | null;
}
