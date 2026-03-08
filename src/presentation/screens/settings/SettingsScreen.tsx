import React, {useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useAudioControl, useWalletSession} from '@/presentation/state/HokusNftStore';
import {colors} from '@/theme/colors';

export const SettingsScreen: React.FC = () => {
  const {walletAddress, disconnectWallet} = useWalletSession();
  const {requestGlobalAudioStop} = useAudioControl();
  const [error, setError] = useState<string | null>(null);

  const handleDisconnect = async (): Promise<void> => {
    setError(null);
    try {
      requestGlobalAudioStop();
      await disconnectWallet();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Disconnect failed');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.window}>
        <View style={styles.titleBar}>
          <Text style={styles.titleBarText}>Settings</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.heading}>Settings</Text>
          <Text style={styles.subheading}>Manage app session and wallet</Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Wallet</Text>
            <Text style={styles.infoValue}>
              {walletAddress
                ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-6)}`
                : 'Not connected'}
            </Text>
          </View>

          <Pressable onPress={handleDisconnect} style={styles.disconnectButton}>
            <Text style={styles.actionText}>Disconnect Wallet</Text>
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}
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
  infoCard: {
    borderWidth: 1,
    borderColor: '#8B8B8B',
    backgroundColor: '#E9E9E9',
    padding: 10,
    gap: 4
  },
  infoLabel: {
    fontSize: 12,
    color: colors.mutedText,
    fontWeight: '700'
  },
  infoValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600'
  },
  disconnectButton: {
    backgroundColor: '#7C1A1A',
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: 'flex-start'
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
  }
});
