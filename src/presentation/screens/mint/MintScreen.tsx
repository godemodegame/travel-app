import React, {useMemo, useState} from 'react';
import {ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {generateSoundscapeScript} from '@/domain/usecases/generateSoundscapeScript';
import {SectionCard} from '@/presentation/components/SectionCard';
import {useHokusNftStore} from '@/presentation/state/HokusNftStore';
import {colors} from '@/theme/colors';

export const MintScreen: React.FC = () => {
  const {mintPriceSol, mintFreeNft, getMintPreview} = useHokusNftStore();
  const [isMinting, setIsMinting] = useState(false);
  const [lastMinted, setLastMinted] = useState<{name: string; signature: string} | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);

  const previewNft = useMemo(() => getMintPreview(), [getMintPreview]);
  const previewScript = useMemo(() => generateSoundscapeScript(previewNft), [previewNft]);

  const handleMint = async (): Promise<void> => {
    if (isMinting) {
      return;
    }

    setIsMinting(true);
    setMintError(null);

    try {
      const result = await mintFreeNft();
      setLastMinted({name: result.nft.name, signature: result.signature});
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown mint error';
      setMintError(message);
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.window}>
        <View style={styles.titleBar}>
          <Text style={styles.titleBarText}>Mint Wizard</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.heading}>Create New Hokus NFT</Text>
          <Text style={styles.subheading}>{`Price ${mintPriceSol} SOL • testnet`}</Text>

          <SectionCard
            title="Preview DNA"
            subtitle={`Fingerprint ${previewNft.soundFingerprint} • Loop ${previewNft.loopLengthSec}s`}
          />

          <SectionCard
            title="Predicted Mix"
            subtitle={`Tier ${previewScript.traits.rarityTier} • Layers ${previewScript.layers.map(layer => layer.type).join(', ')}`}
          />

          <Pressable onPress={handleMint} style={[styles.button, isMinting ? styles.buttonDisabled : null]}>
            {isMinting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Mint On-chain (Testnet)</Text>}
          </Pressable>

          {lastMinted ? (
            <Text style={styles.success}>{`Minted ${lastMinted.name} • tx: ${lastMinted.signature.slice(0, 20)}...`}</Text>
          ) : null}

          {mintError ? <Text style={styles.error}>{`Mint failed: ${mintError}`}</Text> : null}
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
  button: {
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: '#000000',
    paddingVertical: 12,
    alignItems: 'center'
  },
  buttonDisabled: {
    opacity: 0.75
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  },
  success: {
    color: '#0D5E27',
    fontSize: 12,
    fontWeight: '700'
  },
  error: {
    color: '#8A1414',
    fontSize: 12,
    fontWeight: '700'
  }
});
