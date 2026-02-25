import React, {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {generateSoundscapeScript} from '@/domain/usecases/generateSoundscapeScript';
import {SoundscapePlayer} from '@/presentation/components/SoundscapePlayer';
import type {RootTabParamList} from '@/presentation/navigation/AppNavigator';
import {useHokusNftStore} from '@/presentation/state/HokusNftStore';
import {colors} from '@/theme/colors';

type FocusNavigation = BottomTabNavigationProp<RootTabParamList>;

export const FocusScreen: React.FC = () => {
  const navigation = useNavigation<FocusNavigation>();
  const {activeNft} = useHokusNftStore();
  const [autoPlaySignal, setAutoPlaySignal] = useState(0);

  const script = useMemo(() => {
    return activeNft ? generateSoundscapeScript(activeNft) : null;
  }, [activeNft]);

  const handlePrimaryAction = (): void => {
    if (!activeNft) {
      navigation.navigate('Mint');
      return;
    }
    setAutoPlaySignal(prev => prev + 1);
  };

  const layerLabel = script?.layers.map(layer => layer.type).join(' / ');

  return (
    <ScrollView contentContainerStyle={styles.container}>
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
              <Text style={styles.progressTime}>{activeNft ? `00:00 / ${activeNft.loopLengthSec}s` : '--:-- / --:--'}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, {width: activeNft ? '28%' : '0%'}]} />
            </View>
          </View>

          <View style={styles.transportRow}>
            <Pressable style={styles.transportButton} onPress={handlePrimaryAction}>
              <Text style={styles.transportButtonText}>{activeNft ? 'PLAY' : 'MINT'}</Text>
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
              hideControls
            />
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    paddingBottom: 80,
    backgroundColor: colors.background,
    flexGrow: 1
  },
  playerWindow: {
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#C0C0C0'
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
