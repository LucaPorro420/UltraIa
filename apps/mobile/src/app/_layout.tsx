import { DarkTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { AuthProvider } from '@/auth/auth-context';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== 'light';

  return (
    <AuthProvider>
      <ThemeProvider value={isDark ? DarkTheme : DarkTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}
