import React from 'react';
import {StatusBar, StyleSheet, View} from 'react-native';
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

  return <AppNavigator />;
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
  }
});

export default App;
