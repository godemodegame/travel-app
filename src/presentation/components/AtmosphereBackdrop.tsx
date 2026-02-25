import React from 'react';
import {StyleSheet, View} from 'react-native';

export const AtmosphereBackdrop: React.FC = () => {
  return <View pointerEvents="none" style={styles.root} />;
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject
  }
});
