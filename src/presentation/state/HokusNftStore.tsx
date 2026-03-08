import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {HokusNft} from '@/domain/models/HokusNft';
import {
  FREE_MINT_PRICE_SOL,
  buildSoundFingerprint,
  buildSoundParams,
  createHokusMintCandidate
} from '@/domain/usecases/mintFreeHokusNft';
import {MetaplexHokusNftClient} from '@/solana/nft/MetaplexHokusNftClient';
import {createSolanaConnection} from '@/solana/rpc/createSolanaConnection';
import {SeekerWalletAdapter} from '@/solana/wallet/SeekerWalletAdapter';

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

const OWNER_WALLET = 'SEEKER_WALLET_ADDRESS';
const STORAGE_WALLET_ADDRESS_KEY = 'hokus.walletAddress';

const HokusNftStoreContext = createContext<HokusNftStoreValue | null>(null);

export const HokusNftStoreProvider: React.FC<React.PropsWithChildren> = ({children}) => {
  const [nfts, setNfts] = useState<HokusNft[]>([]);
  const [activeMintAddress, setActiveMintAddress] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isStoreHydrated, setIsStoreHydrated] = useState(false);
  const [globalAudioStopSignal, setGlobalAudioStopSignal] = useState(0);

  const nftClient = useMemo(() => {
    return new MetaplexHokusNftClient(createSolanaConnection('devnet'));
  }, []);
  const walletProvider = useMemo(() => {
    return new SeekerWalletAdapter();
  }, []);

  const usedFingerprints = useMemo(() => {
    return new Set(nfts.map(nft => nft.soundFingerprint));
  }, [nfts]);

  const deriveLoopLengthSec = useCallback((seed: string): number => {
    const params = buildSoundParams(seed);
    const score =
      params.rainIntensity +
      params.thunderChance +
      params.forestDensity +
      params.windDepth +
      params.rhythmComplexity;
    return 48 + (score % 133);
  }, []);

  const toLocalNfts = useCallback(
    (owner: string, owned: Array<{mintAddress?: string; name: string}>): HokusNft[] => {
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
          loopLengthSec: deriveLoopLengthSec(traitSeed),
          mintedAtIso: new Date().toISOString(),
          mintPriceSol: FREE_MINT_PRICE_SOL
        };
      });
    },
    [deriveLoopLengthSec]
  );

  useEffect(() => {
    const hydrate = async (): Promise<void> => {
      try {
        const walletFromStorage = await AsyncStorage.getItem(STORAGE_WALLET_ADDRESS_KEY);

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
  }, [nftClient, toLocalNfts]);

  const connectWallet = useCallback(async (): Promise<string> => {
    const session = await walletProvider.connect();
    setWalletAddress(session.walletAddress);
    await AsyncStorage.setItem(STORAGE_WALLET_ADDRESS_KEY, session.walletAddress);
    return session.walletAddress;
  }, [walletProvider]);

  const disconnectWallet = useCallback(async (): Promise<void> => {
    setGlobalAudioStopSignal(prev => prev + 1);
    await walletProvider.disconnect();
    setWalletAddress(null);
    setNfts([]);
    setActiveMintAddress(null);
    await AsyncStorage.removeItem(STORAGE_WALLET_ADDRESS_KEY);
  }, [walletProvider]);

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
    setActiveMintAddress(prev =>
      prev && imported.some(nft => nft.mintAddress === prev)
        ? prev
        : imported[0]?.mintAddress ?? null
    );
    return imported.length;
  }, [walletAddress, connectWallet, nftClient, toLocalNfts]);

  const getMintPreview = useCallback((): HokusNft => {
    const serial = nfts.length + 1;
    return createHokusMintCandidate(walletAddress ?? OWNER_WALLET, serial, usedFingerprints);
  }, [walletAddress, nfts.length, usedFingerprints]);

  const mintFreeNft = useCallback(async (): Promise<MintResult> => {
    const serial = nfts.length + 1;
    const localCandidate = createHokusMintCandidate(
      walletAddress ?? OWNER_WALLET,
      serial,
      usedFingerprints
    );

    const metadata = {
      name: localCandidate.name,
      description: 'Hokus focus NFT: unique script-based rain sound profile',
      attributes: Object.fromEntries(
        [
          ...Object.entries(localCandidate.soundParams).map(([key, value]) => [key, String(value)]),
          ['loopLengthSec', String(localCandidate.loopLengthSec)]
        ]
      ),
      audioScriptUri: `https://example.com/hokus/script/${localCandidate.soundFingerprint}.json`
    };

    const minted = await nftClient.mintSoundNft(metadata);

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
    if (nfts.length === 0) {
      return null;
    }
    if (!activeMintAddress) {
      return nfts[0];
    }
    return nfts.find(nft => nft.mintAddress === activeMintAddress) ?? nfts[0];
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
