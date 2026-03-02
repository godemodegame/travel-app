import {Connection, clusterApiUrl} from '@solana/web3.js';

export const DEFAULT_SOLANA_CLUSTER = 'devnet';

export const createSolanaConnection = (
  cluster: 'devnet' | 'testnet' | 'mainnet-beta' = DEFAULT_SOLANA_CLUSTER
): Connection => {
  return new Connection(clusterApiUrl(cluster), 'confirmed');
};
