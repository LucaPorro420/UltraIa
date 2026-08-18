import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/auth/auth-context';
import { Colors } from '@/constants/theme';

/** Grupo (auth): si ya hay sesión, redirige a los tabs. */
export default function AuthLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.dark.background }}>
        <ActivityIndicator color={Colors.dark.primary} />
      </View>
    );
  }
  if (user) return <Redirect href="/(tabs)" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
