import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import {useNftCatalog, useWalletSession} from '@/presentation/state/HokusNftStore';

type Props = {
  onFinish: () => void;
};

const ONBOARDING_STEPS = [
  {
    title: 'Welcome to Hokus',
    body: 'Focus app with NFT-generated ambient loops. Each NFT creates a unique rain profile.'
  },
  {
    title: 'How It Works',
    body: 'Mint or import your NFT, then press PLAY on the main screen to start your personal soundscape.'
  },
  {
    title: 'Connect Wallet',
    body: 'Connect Solana wallet on Devnet to sync existing NFTs and mint new ones on-chain.'
  }
] as const;

export const OnboardingScreen: React.FC<Props> = ({onFinish}) => {
  const {walletAddress, connectWallet} = useWalletSession();
  const {syncOwnedNfts} = useNftCatalog();
  const [stepIndex, setStepIndex] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = ONBOARDING_STEPS[stepIndex];
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1;

  const progressLabel = useMemo(() => {
    return `${stepIndex + 1}/${ONBOARDING_STEPS.length}`;
  }, [stepIndex]);

  const nextStep = (): void => {
    if (isLastStep) {
      return;
    }
    setStepIndex(prev => prev + 1);
  };

  const skipToConnectStep = (): void => {
    setStepIndex(ONBOARDING_STEPS.length - 1);
  };

  const connectAndContinue = async (): Promise<void> => {
    if (isConnecting) {
      return;
    }

    setIsConnecting(true);
    setError(null);
    try {
      const owner = await connectWallet();
      await syncOwnedNfts(owner);
      onFinish();
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : 'Wallet connection failed'
      );
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.window}>
        <View style={styles.titleBar}>
          <Text style={styles.titleBarText}>Hokus Setup Wizard</Text>
          <Text style={styles.stepText}>{progressLabel}</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.body}>{step.body}</Text>

          {walletAddress ? (
            <Text style={styles.walletConnected}>
              {`Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-6)}`}
            </Text>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {!isLastStep ? (
            <View style={styles.row}>
              <Pressable style={styles.secondaryButton} onPress={skipToConnectStep}>
                <Text style={styles.secondaryButtonText}>Skip Intro</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={nextStep}>
                <Text style={styles.primaryButtonText}>Next</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.column}>
              <Pressable
                style={[styles.primaryButton, isConnecting ? styles.buttonDisabled : null]}
                onPress={connectAndContinue}>
                {isConnecting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Connect Wallet</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#1E4E8A'
  },
  window: {
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#C0C0C0'
  },
  titleBar: {
    backgroundColor: '#0A246A',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  titleBarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  stepText: {
    color: '#DCE8FF',
    fontSize: 11,
    fontWeight: '700'
  },
  content: {
    padding: 12,
    gap: 10
  },
  title: {
    fontSize: 22,
    color: '#111111',
    fontWeight: '700'
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: '#202020'
  },
  walletConnected: {
    fontSize: 12,
    color: '#0D5E27',
    fontWeight: '700'
  },
  error: {
    fontSize: 12,
    color: '#8A1414',
    fontWeight: '700'
  },
  row: {
    flexDirection: 'row',
    gap: 8
  },
  column: {
    gap: 8
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#168A38',
    borderWidth: 1,
    borderColor: '#000000',
    paddingVertical: 11,
    alignItems: 'center'
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#E5E5E5',
    borderWidth: 1,
    borderColor: '#000000',
    paddingVertical: 11,
    alignItems: 'center'
  },
  secondaryWideButton: {
    backgroundColor: '#E5E5E5',
    borderWidth: 1,
    borderColor: '#000000',
    paddingVertical: 11,
    alignItems: 'center'
  },
  secondaryButtonText: {
    color: '#1A1A1A',
    fontSize: 13,
    fontWeight: '700'
  },
  buttonDisabled: {
    opacity: 0.6
  }
});
