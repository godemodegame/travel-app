import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppNavigator} from '@/presentation/navigation/AppNavigator';
import {HokusNftStoreProvider} from '@/presentation/state/HokusNftStore';

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <HokusNftStoreProvider>
        <AppNavigator />
      </HokusNftStoreProvider>
    </SafeAreaProvider>
  );
};

export default App;
