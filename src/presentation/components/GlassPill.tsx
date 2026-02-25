import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '@/theme/colors';

type Props = {
  text: string;
};

export const GlassPill: React.FC<Props> = ({text}) => {
  return (
    <View style={styles.pill}>
      <Text style={styles.label}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#E6E6E6',
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase'
  }
});
