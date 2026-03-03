import React from 'react';
import {StatusBar, StyleSheet, Text, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppNavigator} from '@/presentation/navigation/AppNavigator';
import {HokusNftStoreProvider, useHokusNftStore} from '@/presentation/state/HokusNftStore';
import {OnboardingScreen} from '@/presentation/screens/onboarding/OnboardingScreen';

const RootContent: React.FC = () => {
  const {walletAddress, isStoreHydrated} = useHokusNftStore();

  if (!isStoreHydrated) {
    return <View style={styles.bootScreen} />;
  }

  const shouldShowOnboarding = !walletAddress;

  if (shouldShowOnboarding) {
    return <OnboardingScreen onFinish={() => {}} />;
  }

  return (
    <View style={styles.content}>
      <View style={styles.devnetBanner}>
        <Text style={styles.devnetBannerText}>
          DEVNET ONLY: mainnet wallets will not work.{'\n'}
          Switch wallet network to Devnet (not Testnet).
        </Text>
      </View>
      <View style={styles.navigatorWrap}>
        <AppNavigator />
      </View>
    </View>
  );
};

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <HokusNftStoreProvider>
        <RootContent />
      </HokusNftStoreProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  bootScreen: {
    flex: 1,
    backgroundColor: '#1E4E8A'
  },
  content: {
    flex: 1,
    backgroundColor: '#1E4E8A'
  },
  devnetBanner: {
    backgroundColor: '#F4D03F',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingVertical: 6,
    paddingHorizontal: 10
  },
  devnetBannerText: {
    color: '#1A1A1A',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2
  },
  navigatorWrap: {
    flex: 1
  }
});

export default App;
