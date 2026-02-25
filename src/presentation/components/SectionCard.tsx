import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '@/theme/colors';

type Props = {
  title: string;
  subtitle: string;
};

export const SectionCard: React.FC<Props> = ({title, subtitle}) => {
  return (
    <View style={styles.frame}>
      <View style={styles.header}>
        <Text style={styles.headerText}>{title}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: colors.surface
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#000000'
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  },
  body: {
    paddingHorizontal: 10,
    paddingVertical: 10
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text
  }
});
