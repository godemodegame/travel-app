import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {HokusNft} from '@/domain/models/HokusNft';

type Params = {
  activeNft: HokusNft | null;
  activeMintAddress: string | null;
  setActiveNft: (mintAddress: string) => void;
  globalAudioStopSignal: number;
  requestGlobalAudioStop: () => void;
  onRequestMint: () => void;
};

type Result = {
  autoPlaySignal: number | undefined;
  effectiveStopSignal: number;
  isTrackPlaying: boolean;
  isPlayerMounted: boolean;
  timelineSec: number;
  handlePrimaryAction: () => void;
  handleSelectNft: (mintAddress: string) => void;
  onPlaybackStateChange: (isPlaying: boolean) => void;
};

export const useFocusPlaybackController = ({
  activeNft,
  activeMintAddress,
  setActiveNft,
  globalAudioStopSignal,
  requestGlobalAudioStop,
  onRequestMint
}: Params): Result => {
  const [autoPlaySignal, setAutoPlaySignal] = useState<number | undefined>(undefined);
  const [stopSignal, setStopSignal] = useState<number | undefined>(undefined);
  const [isTrackPlaying, setIsTrackPlaying] = useState(false);
  const [isPlayerMounted, setIsPlayerMounted] = useState(true);
  const [timelineSec, setTimelineSec] = useState(0);
  const playerRemountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loopLengthSec = activeNft?.loopLengthSec ?? 0;

  const remountPlayer = useCallback((): void => {
    if (playerRemountTimerRef.current) {
      clearTimeout(playerRemountTimerRef.current);
    }

    setIsPlayerMounted(false);
    playerRemountTimerRef.current = setTimeout(() => {
      setIsPlayerMounted(true);
      playerRemountTimerRef.current = null;
    }, 16);
  }, []);

  const handlePrimaryAction = useCallback((): void => {
    if (!activeNft) {
      onRequestMint();
      return;
    }

    if (isTrackPlaying) {
      setStopSignal(prev => (prev ?? 0) + 1);
      requestGlobalAudioStop();
      setIsTrackPlaying(false);
      remountPlayer();
      return;
    }

    setAutoPlaySignal(prev => (prev ?? 0) + 1);
  }, [activeNft, isTrackPlaying, onRequestMint, remountPlayer, requestGlobalAudioStop]);

  const handleSelectNft = useCallback((mintAddress: string): void => {
    if (mintAddress === activeMintAddress) {
      return;
    }

    setStopSignal(prev => (prev ?? 0) + 1);
    requestGlobalAudioStop();
    setIsTrackPlaying(false);
    setIsPlayerMounted(true);
    setActiveNft(mintAddress);
  }, [activeMintAddress, requestGlobalAudioStop, setActiveNft]);

  const effectiveStopSignal = useMemo(() => {
    return stopSignal === undefined ? globalAudioStopSignal : stopSignal + globalAudioStopSignal;
  }, [stopSignal, globalAudioStopSignal]);

  useEffect(() => {
    setTimelineSec(0);
  }, [activeNft?.mintAddress]);

  useEffect(() => {
    if (!isTrackPlaying || loopLengthSec <= 0) {
      if (!isTrackPlaying) {
        setTimelineSec(0);
      }
      return;
    }

    const interval = setInterval(() => {
      setTimelineSec(prev => {
        const next = prev + 0.2;
        return next >= loopLengthSec ? 0 : next;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isTrackPlaying, loopLengthSec]);

  useEffect(() => {
    return () => {
      if (playerRemountTimerRef.current) {
        clearTimeout(playerRemountTimerRef.current);
        playerRemountTimerRef.current = null;
      }
    };
  }, []);

  return {
    autoPlaySignal,
    effectiveStopSignal,
    isTrackPlaying,
    isPlayerMounted,
    timelineSec,
    handlePrimaryAction,
    handleSelectNft,
    onPlaybackStateChange: setIsTrackPlaying
  };
};
