import {useCallback, useMemo} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {STORAGE_WALLET_ADDRESS_KEY} from '@/presentation/state/hokusStoreConstants';
import {MetaplexHokusNftClient} from '@/solana/nft/MetaplexHokusNftClient';
import {createSolanaConnection} from '@/solana/rpc/createSolanaConnection';
import {SeekerWalletAdapter} from '@/solana/wallet/SeekerWalletAdapter';

export type HokusStoreDependencies = {
  nftClient: MetaplexHokusNftClient;
  walletProvider: SeekerWalletAdapter;
  loadStoredWalletAddress: () => Promise<string | null>;
  persistWalletAddress: (walletAddress: string) => Promise<void>;
  clearStoredWalletAddress: () => Promise<void>;
};

export const useHokusStoreDependencies = (): HokusStoreDependencies => {
  const nftClient = useMemo(() => {
    return new MetaplexHokusNftClient(createSolanaConnection('devnet'));
  }, []);

  const walletProvider = useMemo(() => {
    return new SeekerWalletAdapter();
  }, []);

  const loadStoredWalletAddress = useCallback(async (): Promise<string | null> => {
    return AsyncStorage.getItem(STORAGE_WALLET_ADDRESS_KEY);
  }, []);

  const persistWalletAddress = useCallback(async (walletAddress: string): Promise<void> => {
    await AsyncStorage.setItem(STORAGE_WALLET_ADDRESS_KEY, walletAddress);
  }, []);

  const clearStoredWalletAddress = useCallback(async (): Promise<void> => {
    await AsyncStorage.removeItem(STORAGE_WALLET_ADDRESS_KEY);
  }, []);

  return {
    nftClient,
    walletProvider,
    loadStoredWalletAddress,
    persistWalletAddress,
    clearStoredWalletAddress
  };
};
