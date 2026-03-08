import React, {useMemo} from 'react';
import {
  Animated,
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
import {useAudioControl, useNftCatalog} from '@/presentation/state/HokusNftStore';
import {useFocusPlaybackController} from '@/presentation/screens/focus/useFocusPlaybackController';
import {createWindowStack} from '@/presentation/screens/focus/backgroundWindows';
import {useWindowChaosAnimation} from '@/presentation/screens/focus/useWindowChaosAnimation';

type FocusNavigation = BottomTabNavigationProp<RootTabParamList>;

export const FocusScreen: React.FC = () => {
  const navigation = useNavigation<FocusNavigation>();
  const {activeNft, nfts, activeMintAddress, setActiveNft} = useNftCatalog();
  const {globalAudioStopSignal, requestGlobalAudioStop} = useAudioControl();
  const {height} = useWindowDimensions();

  const script = useMemo(() => {
    return activeNft ? generateSoundscapeScript(activeNft) : null;
  }, [activeNft]);

  const {
    autoPlaySignal,
    effectiveStopSignal,
    isTrackPlaying,
    isPlayerMounted,
    timelineSec,
    handlePrimaryAction,
    handleSelectNft,
    onPlaybackStateChange
  } = useFocusPlaybackController({
    activeNft,
    activeMintAddress,
    setActiveNft,
    globalAudioStopSignal,
    requestGlobalAudioStop,
    onRequestMint: () => navigation.navigate('Mint')
  });

  const layerLabel = script?.layers.map(layer => layer.type).join(' / ');
  const windowStack = useMemo(() => createWindowStack(height), [height]);
  const {driftXRefs, driftYRefs} = useWindowChaosAnimation(windowStack.length);
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

  return (
    <View style={styles.screen}>
      <View style={styles.wallpaper}>
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
      </View>

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

            {activeNft && script && isPlayerMounted ? (
              <SoundscapePlayer
                script={script}
                title={`${activeNft.name} soundtrack`}
                autoPlaySignal={autoPlaySignal}
                stopSignal={effectiveStopSignal}
                onPlaybackStateChange={onPlaybackStateChange}
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#6EA5D5'
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
