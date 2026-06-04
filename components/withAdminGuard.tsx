import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../src/Contexts/AuthContexts';

export function withAdminGuard<P extends object>(WrappedComponent: React.ComponentType<P>) {
  return function AdminGuardedComponent(props: P) {
    const { user, isAdmin, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading) {
        if (!user) {
          // Not logged in, redirect to login
          router.replace('/Login');
        } else if (!isAdmin) {
          // Logged in but not admin, redirect to home
          router.replace('/Homepage');
        }
      }
    }, [user, isAdmin, loading]);

    if (loading || !user || !isAdmin) {
      return (
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#FF5757" />
          <Text style={styles.text}>Verifying admin access...</Text>
        </View>
      );
    }

    return <WrappedComponent {...props} />;
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});