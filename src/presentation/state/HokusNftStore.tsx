import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import type {HokusNft} from '@/domain/models/HokusNft';
import {
  FREE_MINT_PRICE_SOL,
  createHokusMintCandidate
} from '@/domain/usecases/mintFreeHokusNft';
import {OWNER_WALLET} from '@/presentation/state/hokusStoreConstants';
import {useHokusStoreDependencies} from '@/presentation/state/hokusStoreDependencies';
import {toLocalNfts, toMintMetadata} from '@/presentation/state/hokusStoreMappers';
import {resolveActiveNft, resolveNextActiveMintAddress} from '@/presentation/state/hokusStoreSelectors';

type MintResult = {
  nft: HokusNft;
  signature: string;
};

type HokusNftStoreValue = {
  nfts: HokusNft[];
  activeNft: HokusNft | null;
  activeMintAddress: string | null;
  walletAddress: string | null;
  isStoreHydrated: boolean;
  mintPriceSol: number;
  globalAudioStopSignal: number;
  setActiveNft: (mintAddress: string) => void;
  requestGlobalAudioStop: () => void;
  connectWallet: () => Promise<string>;
  disconnectWallet: () => Promise<void>;
  syncOwnedNfts: (ownerOverride?: string) => Promise<number>;
  mintFreeNft: () => Promise<MintResult>;
  getMintPreview: () => HokusNft;
};

export type WalletSessionState = Pick<
  HokusNftStoreValue,
  'walletAddress' | 'isStoreHydrated' | 'connectWallet' | 'disconnectWallet'
>;

export type NftCatalogState = Pick<
  HokusNftStoreValue,
  | 'nfts'
  | 'activeNft'
  | 'activeMintAddress'
  | 'mintPriceSol'
  | 'setActiveNft'
  | 'syncOwnedNfts'
  | 'mintFreeNft'
  | 'getMintPreview'
>;

export type AudioControlState = Pick<
  HokusNftStoreValue,
  'globalAudioStopSignal' | 'requestGlobalAudioStop'
>;

const HokusNftStoreContext = createContext<HokusNftStoreValue | null>(null);

export const HokusNftStoreProvider: React.FC<React.PropsWithChildren> = ({children}) => {
  const [nfts, setNfts] = useState<HokusNft[]>([]);
  const [activeMintAddress, setActiveMintAddress] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isStoreHydrated, setIsStoreHydrated] = useState(false);
  const [globalAudioStopSignal, setGlobalAudioStopSignal] = useState(0);
  const {
    nftClient,
    walletProvider,
    loadStoredWalletAddress,
    persistWalletAddress,
    clearStoredWalletAddress
  } = useHokusStoreDependencies();

  const usedFingerprints = useMemo(() => {
    return new Set(nfts.map(nft => nft.soundFingerprint));
  }, [nfts]);

  useEffect(() => {
    const hydrate = async (): Promise<void> => {
      try {
        const walletFromStorage = await loadStoredWalletAddress();

        if (walletFromStorage) {
          setWalletAddress(walletFromStorage);
          const owned = await nftClient.getOwnedSoundNfts(walletFromStorage);
          const imported = toLocalNfts(walletFromStorage, owned);
          setNfts(imported);
          setActiveMintAddress(imported[0]?.mintAddress ?? null);
        }
      } finally {
        setIsStoreHydrated(true);
      }
    };

    void hydrate();
  }, [loadStoredWalletAddress, nftClient]);

  const connectWallet = useCallback(async (): Promise<string> => {
    const session = await walletProvider.connect();
    setWalletAddress(session.walletAddress);
    await persistWalletAddress(session.walletAddress);
    return session.walletAddress;
  }, [persistWalletAddress, walletProvider]);

  const disconnectWallet = useCallback(async (): Promise<void> => {
    setGlobalAudioStopSignal(prev => prev + 1);
    await walletProvider.disconnect();
    setWalletAddress(null);
    setNfts([]);
    setActiveMintAddress(null);
    await clearStoredWalletAddress();
  }, [clearStoredWalletAddress, walletProvider]);

  const setActiveNft = useCallback((mintAddress: string): void => {
    setActiveMintAddress(mintAddress);
  }, []);

  const requestGlobalAudioStop = useCallback((): void => {
    setGlobalAudioStopSignal(prev => prev + 1);
  }, []);

  const syncOwnedNfts = useCallback(async (ownerOverride?: string): Promise<number> => {
    const owner = ownerOverride ?? walletAddress ?? (await connectWallet());
    const owned = await nftClient.getOwnedSoundNfts(owner);
    const imported = toLocalNfts(owner, owned);

    setNfts(imported);
    setActiveMintAddress(prev => resolveNextActiveMintAddress(prev, imported));
    return imported.length;
  }, [walletAddress, connectWallet, nftClient]);

  const getMintPreview = useCallback((): HokusNft => {
    const serial = nfts.length + 1;
    return createHokusMintCandidate(walletAddress ?? OWNER_WALLET, serial, usedFingerprints);
  }, [walletAddress, nfts.length, usedFingerprints]);

  const mintFreeNft = useCallback(async (): Promise<MintResult> => {
    const mintedSupply = await nftClient.getMintedSupply();
    const maxSupply = nftClient.getMaxSupply();
    if (mintedSupply >= maxSupply) {
      throw new Error(`Max supply reached (${maxSupply}). New mints are disabled.`);
    }

    const serial = nfts.length + 1;
    const localCandidate = createHokusMintCandidate(
      walletAddress ?? OWNER_WALLET,
      serial,
      usedFingerprints
    );

    const minted = await nftClient.mintSoundNft(toMintMetadata(localCandidate));

    const nft: HokusNft = {
      ...localCandidate,
      mintAddress: minted.mintAddress,
      ownerWallet: minted.ownerWallet,
      mintedAtIso: new Date().toISOString()
    };

    setNfts(prev => [nft, ...prev]);
    setActiveMintAddress(nft.mintAddress);
    return {nft, signature: minted.signature};
  }, [walletAddress, nftClient, nfts.length, usedFingerprints]);

  const activeNft = useMemo(() => {
    return resolveActiveNft(nfts, activeMintAddress);
  }, [nfts, activeMintAddress]);

  const value: HokusNftStoreValue = {
    nfts,
    activeNft,
    activeMintAddress,
    walletAddress,
    isStoreHydrated,
    mintPriceSol: FREE_MINT_PRICE_SOL,
    globalAudioStopSignal,
    setActiveNft,
    requestGlobalAudioStop,
    connectWallet,
    disconnectWallet,
    syncOwnedNfts,
    mintFreeNft,
    getMintPreview
  };

  return <HokusNftStoreContext.Provider value={value}>{children}</HokusNftStoreContext.Provider>;
};

export const useHokusNftStore = (): HokusNftStoreValue => {
  const context = useContext(HokusNftStoreContext);
  if (!context) {
    throw new Error('useHokusNftStore must be used inside HokusNftStoreProvider');
  }

  return context;
};

export const useWalletSession = (): WalletSessionState => {
  const store = useHokusNftStore();
  return {
    walletAddress: store.walletAddress,
    isStoreHydrated: store.isStoreHydrated,
    connectWallet: store.connectWallet,
    disconnectWallet: store.disconnectWallet
  };
};

export const useNftCatalog = (): NftCatalogState => {
  const store = useHokusNftStore();
  return {
    nfts: store.nfts,
    activeNft: store.activeNft,
    activeMintAddress: store.activeMintAddress,
    mintPriceSol: store.mintPriceSol,
    setActiveNft: store.setActiveNft,
    syncOwnedNfts: store.syncOwnedNfts,
    mintFreeNft: store.mintFreeNft,
    getMintPreview: store.getMintPreview
  };
};

export const useAudioControl = (): AudioControlState => {
  const store = useHokusNftStore();
  return {
    globalAudioStopSignal: store.globalAudioStopSignal,
    requestGlobalAudioStop: store.requestGlobalAudioStop
  };
};
