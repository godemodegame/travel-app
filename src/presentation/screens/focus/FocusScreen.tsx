import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {generateSoundscapeScript} from '@/domain/usecases/generateSoundscapeScript';
import {SoundscapePlayer} from '@/presentation/components/SoundscapePlayer';
import type {RootTabParamList} from '@/presentation/navigation/AppNavigator';
import {useHokusNftStore} from '@/presentation/state/HokusNftStore';

type FocusNavigation = BottomTabNavigationProp<RootTabParamList>;

type BgWindow = {
  top: number;
  left: `${number}%`;
  width: `${number}%`;
  height: number;
  rotate: string;
  opacity: number;
  zIndex: number;
  barColor: string;
  appName: string;
  status: string;
  lines: [`${number}%`, `${number}%`, `${number}%`];
};

const createWindowStack = (screenHeight: number): BgWindow[] => {
  const appNames = [
    'Rain Logs', 'Mint Queue', 'Forest FX', 'Storm Lab', 'Wave Cache', 'Loop Tool', 'Audio Bus',
    'NFT Traits', 'Session', 'Thunder RNG', 'Wind Mod', 'Memory', 'Bird Layer', 'Patch Notes',
    'Tones', 'Profile', 'Mint Gas', 'Explorer', 'Deck', 'Cache', 'Ambient', 'Mixer'
  ] as const;
  const statuses = [
    'Syncing...', 'Waiting', 'Idle', 'Analyzing', 'Indexed', 'Ready', '0 drops',
    'Loaded', 'Focus mode', 'Seeded', 'Calm', '66% free', 'Muted', 'v0.1',
    'Queued', 'Connected', '0.00', 'Pinned', 'Warm', 'Preview', 'Armed'
  ] as const;
  const barColors = [
    '#214C9A', '#7A1442', '#2F6D40', '#2D3A9E', '#7B5C0F', '#4A4A4A', '#0F4E79',
    '#6B2B88', '#166446', '#6B1C1C', '#2D2D2D', '#1C5A72', '#734A11', '#273A87',
    '#3F1D78', '#0E5D4C', '#86550F', '#6A2340'
  ] as const;

  let seed = 872341;
  const rand = (): number => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const verticalMax = Math.max(520, Math.floor(screenHeight + 180));

  return Array.from({length: 120}).map((_, index) => {
    const width = `${34 + Math.floor(rand() * 18)}%` as const;
    const height = 70 + Math.floor(rand() * 34);
    const top = -40 + Math.floor(rand() * verticalMax);
    const left = `${-18 + Math.floor(rand() * 98)}%` as const;
    const rotate = `${-4 + rand() * 8}deg`;
    const opacity = 0.44 + rand() * 0.22;
    const zIndex = Math.floor(rand() * 10) + 1;
    const line1 = `${48 + Math.floor(rand() * 45)}%` as const;
    const line2 = `${40 + Math.floor(rand() * 42)}%` as const;
    const line3 = `${44 + Math.floor(rand() * 40)}%` as const;

    return {
      top,
      left,
      width,
      height,
      rotate,
      opacity,
      zIndex,
      barColor: barColors[index % barColors.length],
      appName: appNames[index % appNames.length],
      status: statuses[(index * 3) % statuses.length],
      lines: [line1, line2, line3]
    };
  });
};

export const FocusScreen: React.FC = () => {
  const navigation = useNavigation<FocusNavigation>();
  const {activeNft, nfts, activeMintAddress, setActiveNft} = useHokusNftStore();
  const [autoPlaySignal, setAutoPlaySignal] = useState<number | undefined>(undefined);
  const [stopSignal, setStopSignal] = useState<number | undefined>(undefined);
  const [isTrackPlaying, setIsTrackPlaying] = useState(false);
  const [timelineSec, setTimelineSec] = useState(0);
  const {height} = useWindowDimensions();
  const driftXRefs = useRef<Animated.Value[]>([]);
  const driftYRefs = useRef<Animated.Value[]>([]);
  const activeAnimationsRef = useRef<Array<Animated.CompositeAnimation | null>>([]);

  const script = useMemo(() => {
    return activeNft ? generateSoundscapeScript(activeNft) : null;
  }, [activeNft]);

  const handlePrimaryAction = (): void => {
    if (!activeNft) {
      navigation.navigate('Mint');
      return;
    }
    if (isTrackPlaying) {
      setStopSignal(prev => (prev ?? 0) + 1);
    } else {
      setAutoPlaySignal(prev => (prev ?? 0) + 1);
    }
  };

  const handleSelectNft = (mintAddress: string): void => {
    if (mintAddress === activeMintAddress) {
      return;
    }
    setStopSignal(prev => (prev ?? 0) + 1);
    setIsTrackPlaying(false);
    setActiveNft(mintAddress);
  };

  const layerLabel = script?.layers.map(layer => layer.type).join(' / ');
  const windowStack = useMemo(() => createWindowStack(height), [height]);
  const loopLengthSec = activeNft?.loopLengthSec ?? 0;
  const progressPercent: `${number}%` =
    loopLengthSec > 0
      ? `${Math.min(100, (timelineSec / loopLengthSec) * 100)}%`
      : '0%';

  const formatTime = (seconds: number): string => {
    const safe = Math.max(0, Math.floor(seconds));
    const mm = Math.floor(safe / 60)
      .toString()
      .padStart(2, '0');
    const ss = (safe % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

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

  if (driftXRefs.current.length !== windowStack.length) {
    driftXRefs.current = windowStack.map((_, index) => driftXRefs.current[index] ?? new Animated.Value(0));
    driftYRefs.current = windowStack.map((_, index) => driftYRefs.current[index] ?? new Animated.Value(0));
    activeAnimationsRef.current = windowStack.map((_, index) => activeAnimationsRef.current[index] ?? null);
  }

  useEffect(() => {
    let isCancelled = false;

    const runChaos = (index: number): void => {
      if (isCancelled) {
        return;
      }

      const x = driftXRefs.current[index];
      const y = driftYRefs.current[index];
      const maxX = 5 + (index % 8);
      const maxY = 4 + (index % 6);
      const toX = (Math.random() * 2 - 1) * maxX;
      const toY = (Math.random() * 2 - 1) * maxY;
      const duration = 1600 + Math.floor(Math.random() * 3800);

      const animation = Animated.parallel([
        Animated.timing(x, {toValue: toX, duration, useNativeDriver: true}),
        Animated.timing(y, {toValue: toY, duration, useNativeDriver: true})
      ]);

      activeAnimationsRef.current[index] = animation;
      animation.start(({finished}) => {
        if (finished && !isCancelled) {
          runChaos(index);
        }
      });
    };

    windowStack.forEach((_, index) => runChaos(index));

    return () => {
      isCancelled = true;
      activeAnimationsRef.current.forEach(animation => animation?.stop());
      driftXRefs.current.forEach(value => value.stopAnimation());
      driftYRefs.current.forEach(value => value.stopAnimation());
    };
  }, [windowStack]);

  return (
    <View style={styles.screen}>
      <ImageBackground
        source={{uri: 'https://upload.wikimedia.org/wikipedia/en/7/78/Bliss_%28Windows_XP%29.png'}}
        resizeMode="cover"
        style={styles.wallpaper}>
        <View pointerEvents="none" style={styles.pixelOverlay}>
          {Array.from({length: 180}).map((_, index) => (
            <View
              key={`pixel-${index}`}
              style={[
                styles.pixelBlock,
                {
                  left: `${(index * 11) % 100}%`,
                  top: `${(index * 17) % 100}%`,
                  opacity: 0.05 + ((index % 6) * 0.018)
                }
              ]}
            />
          ))}
        </View>
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.container}>
        <View pointerEvents="none" style={styles.backgroundLayer}>
          {windowStack.map((windowStyle, index) => (
            <Animated.View
              key={`bg-window-${index}`}
              style={[
                styles.bgWindow,
                {
                  top: windowStyle.top,
                  left: windowStyle.left,
                  width: windowStyle.width,
                  height: windowStyle.height,
                  zIndex: windowStyle.zIndex,
                  transform: [
                    {rotate: windowStyle.rotate},
                    {translateX: driftXRefs.current[index]},
                    {translateY: driftYRefs.current[index]}
                  ],
                  opacity: windowStyle.opacity
                }
              ]}>
              <View style={[styles.bgTitleBar, {backgroundColor: windowStyle.barColor}]} />
              <View style={styles.bgWindowBody}>
                <Text numberOfLines={1} style={styles.bgWindowLabel}>
                  {windowStyle.appName}
                </Text>
                <View style={[styles.bgWindowLine, {width: windowStyle.lines[0]}]} />
                <View style={[styles.bgWindowLine, {width: windowStyle.lines[1]}]} />
                <View style={[styles.bgWindowLine, {width: windowStyle.lines[2]}]} />
                <Text numberOfLines={1} style={styles.bgWindowStatus}>
                  {windowStyle.status}
                </Text>
              </View>
            </Animated.View>
          ))}
          <View style={styles.backgroundShade} />
        </View>

        <View style={styles.playerWindow}>
          <View style={styles.titleBar}>
            <Text style={styles.titleText}>Hokus Player</Text>
            <Text style={styles.titleRight}>v1.0</Text>
          </View>

          <View style={styles.playerBody}>
            <View style={styles.trackDisplay}>
              <Text style={styles.displayLabel}>Now Loaded</Text>
              <Text numberOfLines={1} style={styles.displayTitle}>
                {activeNft ? activeNft.name : 'No NFT Loaded'}
              </Text>
              <Text numberOfLines={1} style={styles.displayMeta}>
                {activeNft
                  ? `Loop ${activeNft.loopLengthSec}s • ${script?.traits.rarityTier ?? 'Common'}`
                  : 'Mint NFT to generate your unique rain engine'}
              </Text>
            </View>

            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Timeline</Text>
                <Text style={styles.progressTime}>
                  {activeNft
                    ? `${formatTime(timelineSec)} / ${formatTime(loopLengthSec)}`
                    : '--:-- / --:--'}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, {width: activeNft ? progressPercent : '0%'}]} />
              </View>
            </View>

            <View style={styles.transportRow}>
              <Pressable style={styles.transportButton} onPress={handlePrimaryAction}>
                <Text style={styles.transportButtonText}>
                  {activeNft ? (isTrackPlaying ? 'STOP' : 'PLAY') : 'MINT'}
                </Text>
              </Pressable>
              <View style={styles.infoPanel}>
                <Text numberOfLines={1} style={styles.infoLine}>
                  {activeNft ? `Sound ID: ${activeNft.soundFingerprint}` : 'Sound ID: not minted'}
                </Text>
                <Text numberOfLines={1} style={styles.infoLine}>
                  {activeNft
                    ? `Layers: ${layerLabel ?? 'rain'}`
                    : 'Layers: locked (mint required)'}
                </Text>
              </View>
            </View>

            {nfts.length > 1 ? (
              <View style={styles.nftSwitcher}>
                <Text style={styles.nftSwitcherTitle}>Select NFT</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nftSwitcherRow}>
                  {nfts.map(nft => {
                    const isActive = nft.mintAddress === (activeMintAddress ?? activeNft?.mintAddress);
                    return (
                      <Pressable
                        key={nft.mintAddress}
                        onPress={() => handleSelectNft(nft.mintAddress)}
                        style={[styles.nftChip, isActive ? styles.nftChipActive : null]}>
                        <Text numberOfLines={1} style={styles.nftChipTitle}>{nft.name}</Text>
                        <Text style={styles.nftChipMeta}>{`Loop ${nft.loopLengthSec}s`}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {!activeNft ? (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>
                  No NFT profile detected. Press MINT to create your onchain soundtrack profile.
                </Text>
              </View>
            ) : null}

            {activeNft && script ? (
              <SoundscapePlayer
                script={script}
                title={`${activeNft.name} soundtrack`}
                autoPlaySignal={autoPlaySignal}
                stopSignal={stopSignal}
                onPlaybackStateChange={setIsTrackPlaying}
                hideControls
              />
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  wallpaper: {
    ...StyleSheet.absoluteFillObject
  },
  pixelOverlay: {
    ...StyleSheet.absoluteFillObject
  },
  pixelBlock: {
    position: 'absolute',
    width: 12,
    height: 12,
    backgroundColor: '#FFFFFF'
  },
  container: {
    padding: 10,
    paddingBottom: 80,
    backgroundColor: 'transparent',
    flexGrow: 1,
    justifyContent: 'center',
    position: 'relative'
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject
  },
  bgWindow: {
    position: 'absolute',
    borderWidth: 1.2,
    borderColor: '#111111',
    backgroundColor: '#CECECE'
  },
  bgTitleBar: {
    height: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    backgroundColor: '#214C9A',
    opacity: 0.7
  },
  bgWindowBody: {
    paddingHorizontal: 6,
    paddingVertical: 5,
    gap: 4
  },
  bgWindowLabel: {
    fontSize: 8,
    color: '#0F0F0F',
    fontWeight: '700'
  },
  bgWindowLine: {
    height: 4,
    backgroundColor: '#7A7A7A'
  },
  bgWindowStatus: {
    fontSize: 7,
    color: '#171717'
  },
  backgroundShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111111',
    opacity: 0.14
  },
  playerWindow: {
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#C0C0C0',
    zIndex: 2
  },
  titleBar: {
    backgroundColor: '#0A246A',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  titleRight: {
    color: '#DCE8FF',
    fontSize: 11,
    fontWeight: '700'
  },
  playerBody: {
    padding: 10,
    gap: 10
  },
  trackDisplay: {
    backgroundColor: '#101010',
    borderWidth: 2,
    borderColor: '#5A5A5A',
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 4
  },
  displayLabel: {
    color: '#8AC3FF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4
  },
  displayTitle: {
    color: '#80F48C',
    fontSize: 14,
    fontWeight: '700'
  },
  displayMeta: {
    color: '#D2D2D2',
    fontSize: 11
  },
  progressSection: {
    gap: 6
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  progressLabel: {
    fontSize: 11,
    color: '#111111',
    fontWeight: '700'
  },
  progressTime: {
    fontSize: 11,
    color: '#303030'
  },
  progressTrack: {
    height: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0A246A'
  },
  transportRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch'
  },
  transportButton: {
    minWidth: 96,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#168A38',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14
  },
  transportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.6
  },
  infoPanel: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#7A7A7A',
    backgroundColor: '#E6E6E6',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 2
  },
  infoLine: {
    fontSize: 11,
    color: '#1A1A1A'
  },
  nftSwitcher: {
    borderWidth: 1,
    borderColor: '#7A7A7A',
    backgroundColor: '#E0E0E0',
    padding: 8,
    gap: 6
  },
  nftSwitcherTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#101010'
  },
  nftSwitcherRow: {
    gap: 6
  },
  nftChip: {
    minWidth: 136,
    maxWidth: 180,
    borderWidth: 1,
    borderColor: '#5C5C5C',
    backgroundColor: '#F4F4F4',
    paddingHorizontal: 8,
    paddingVertical: 7
  },
  nftChipActive: {
    backgroundColor: '#CFE2FF',
    borderColor: '#0A246A'
  },
  nftChipTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#101010'
  },
  nftChipMeta: {
    marginTop: 2,
    fontSize: 10,
    color: '#363636'
  },
  noticeBox: {
    borderWidth: 1,
    borderColor: '#8C6A00',
    backgroundColor: '#FFF7CE',
    padding: 8
  },
  noticeText: {
    color: '#5C4800',
    fontSize: 11,
    fontWeight: '600'
  }
});
