import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';
import type {HokusNft} from '@/domain/models/HokusNft';
import {FREE_MINT_PRICE_SOL, createHokusMintCandidate} from '@/domain/usecases/mintFreeHokusNft';
import {MetaplexHokusNftClient} from '@/solana/nft/MetaplexHokusNftClient';
import {createSolanaConnection} from '@/solana/rpc/createSolanaConnection';

export type MintResult = {
  nft: HokusNft;
  signature: string;
};

type HokusNftStoreValue = {
  nfts: HokusNft[];
  activeNft: HokusNft | null;
  mintPriceSol: number;
  mintFreeNft: () => Promise<MintResult>;
  getMintPreview: () => HokusNft;
};

const OWNER_WALLET = 'SEEKER_WALLET_ADDRESS';

const HokusNftStoreContext = createContext<HokusNftStoreValue | null>(null);

export const HokusNftStoreProvider: React.FC<React.PropsWithChildren> = ({children}) => {
  const [nfts, setNfts] = useState<HokusNft[]>([]);

  const nftClient = useMemo(() => {
    return new MetaplexHokusNftClient(createSolanaConnection('testnet'));
  }, []);

  const usedFingerprints = useMemo(() => {
    return new Set(nfts.map(nft => nft.soundFingerprint));
  }, [nfts]);

  const getMintPreview = useCallback((): HokusNft => {
    const serial = nfts.length + 1;
    return createHokusMintCandidate(OWNER_WALLET, serial, usedFingerprints);
  }, [nfts.length, usedFingerprints]);

  const mintFreeNft = useCallback(async (): Promise<MintResult> => {
    const serial = nfts.length + 1;
    const localCandidate = createHokusMintCandidate(OWNER_WALLET, serial, usedFingerprints);

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
    return {nft, signature: minted.signature};
  }, [nftClient, nfts.length, usedFingerprints]);

  const value: HokusNftStoreValue = {
    nfts,
    activeNft: nfts[0] ?? null,
    mintPriceSol: FREE_MINT_PRICE_SOL,
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
