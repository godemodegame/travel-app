import React, {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {generateSoundscapeScript} from '@/domain/usecases/generateSoundscapeScript';
import {SoundscapePlayer} from '@/presentation/components/SoundscapePlayer';
import {useHokusNftStore} from '@/presentation/state/HokusNftStore';
import {colors} from '@/theme/colors';

export const LibraryScreen: React.FC = () => {
  const {nfts} = useHokusNftStore();
  const [activeMint, setActiveMint] = useState<string | null>(null);

  const entries = useMemo(
    () =>
      nfts.map(nft => ({
        nft,
        script: generateSoundscapeScript(nft)
      })),
    [nfts]
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.window}>
        <View style={styles.titleBar}>
          <Text style={styles.titleBarText}>NFT Explorer</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.heading}>My Hokus NFTs</Text>
          <Text style={styles.subheading}>{`${entries.length} minted profiles`}</Text>

          {entries.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No NFTs minted yet. Go to Mint tab and create your first sound profile.</Text>
            </View>
          ) : null}

          {entries.map(({nft, script}) => (
            <View key={nft.mintAddress} style={styles.card}>
              <Text style={styles.cardTitle}>{nft.name}</Text>
              <Text style={styles.meta}>{`Tier ${script.traits.rarityTier} • Loop ${nft.loopLengthSec}s`}</Text>
              <Text style={styles.meta}>{`Fingerprint ${nft.soundFingerprint}`}</Text>

              <Pressable
                onPress={() => setActiveMint(prev => (prev === nft.mintAddress ? null : nft.mintAddress))}
                style={styles.playToggle}>
                <Text style={styles.playToggleText}>{activeMint === nft.mintAddress ? 'Hide Player' : 'Open Player'}</Text>
              </Pressable>

              {activeMint === nft.mintAddress ? <SoundscapePlayer script={script} title={`${nft.name} soundtrack`} /> : null}
            </View>
          ))}
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
  window: {
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: colors.surface
  },
  titleBar: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#000000'
  },
  titleBarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  content: {
    padding: 10,
    gap: 10
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text
  },
  subheading: {
    fontSize: 13,
    color: colors.mutedText
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: '#8B8B8B',
    backgroundColor: '#E2E2E2',
    padding: 10
  },
  emptyText: {
    fontSize: 13,
    color: colors.mutedText
  },
  card: {
    borderWidth: 1,
    borderColor: '#8B8B8B',
    backgroundColor: '#E9E9E9',
    padding: 10,
    gap: 5
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  meta: {
    fontSize: 12,
    color: colors.mutedText
  },
  playToggle: {
    marginTop: 6,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: 'flex-start'
  },
  playToggleText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12
  }
});
