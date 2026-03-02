import React, {useMemo, useState} from 'react';
import {Pressable, RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';
import {generateSoundscapeScript} from '@/domain/usecases/generateSoundscapeScript';
import {SoundscapePlayer} from '@/presentation/components/SoundscapePlayer';
import {useHokusNftStore} from '@/presentation/state/HokusNftStore';
import {colors} from '@/theme/colors';

export const LibraryScreen: React.FC = () => {
  const {nfts, walletAddress, isSyncingNfts, disconnectWallet, syncOwnedNfts} =
    useHokusNftStore();
  const [activeMint, setActiveMint] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const entries = useMemo(
    () =>
      nfts.map(nft => ({
        nft,
        script: generateSoundscapeScript(nft)
      })),
    [nfts]
  );

  const handleRefresh = async (): Promise<void> => {
    setSyncError(null);
    try {
      await syncOwnedNfts();
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
    }
  };

  const handleDisconnect = async (): Promise<void> => {
    setSyncError(null);
    try {
      await disconnectWallet();
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Disconnect failed');
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isSyncingNfts}
          onRefresh={handleRefresh}
          tintColor="#0A246A"
        />
      }>
      <View style={styles.window}>
        <View style={styles.titleBar}>
          <Text style={styles.titleBarText}>NFT Explorer</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.heading}>My Hokus NFTs</Text>
          <Text style={styles.subheading}>{`${entries.length} minted profiles`}</Text>
          <Text style={styles.walletText}>
            {walletAddress ? `Wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-6)}` : 'Wallet not connected'}
          </Text>

          <View style={styles.actionsRow}>
            <Pressable onPress={handleDisconnect} style={styles.disconnectButton}>
              <Text style={styles.actionText}>Disconnect</Text>
            </Pressable>
          </View>

          {syncError ? <Text style={styles.error}>{syncError}</Text> : null}

          {entries.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No NFTs loaded yet. Connect wallet and tap Sync from Devnet.</Text>
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
  walletText: {
    fontSize: 12,
    color: '#303030',
    fontWeight: '600'
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8
  },
  actionButton: {
    backgroundColor: '#0A246A',
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  disconnectButton: {
    backgroundColor: '#7C1A1A',
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  actionDisabled: {
    opacity: 0.6
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  error: {
    color: '#8A1414',
    fontSize: 12,
    fontWeight: '700'
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
