import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {FocusScreen} from '@/presentation/screens/focus/FocusScreen';
import {MintScreen} from '@/presentation/screens/mint/MintScreen';
import {LibraryScreen} from '@/presentation/screens/library/LibraryScreen';
import {colors} from '@/theme/colors';

export type RootTabParamList = {
  Focus: undefined;
  Mint: undefined;
  'My NFTs': undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#FFFFFF',
          tabBarInactiveTintColor: '#DCE7FF',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700'
          },
          tabBarIconStyle: {
            marginBottom: 2
          },
          tabBarStyle: {
            height: 62,
            paddingBottom: 8,
            paddingTop: 6,
            borderTopWidth: 1,
            borderTopColor: '#000000',
            backgroundColor: colors.primary,
            borderRadius: 0
          }
        }}>
        <Tab.Screen
          name="Focus"
          component={FocusScreen}
          options={{
            tabBarIcon: ({color, size}) => (
              <MaterialIcons name="graphic-eq" color={color} size={size + 2} />
            )
          }}
        />
        <Tab.Screen
          name="Mint"
          component={MintScreen}
          options={{
            tabBarIcon: ({color, size}) => (
              <MaterialIcons name="add-circle-outline" color={color} size={size + 2} />
            )
          }}
        />
        <Tab.Screen
          name="My NFTs"
          component={LibraryScreen}
          options={{
            tabBarIcon: ({color, size}) => (
              <MaterialIcons name="library-music" color={color} size={size + 2} />
            )
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
