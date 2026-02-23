import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../components/ThemeContext';

export default function LocationAlerts() {
  const { theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme === 'dark' ? '#111' : '#fff' }]}>
      <Text style={{ color: theme === 'dark' ? '#fff' : '#000' }}>Location Alerts Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
