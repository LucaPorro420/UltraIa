import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/auth/auth-context';
import { Colors } from '@/constants/theme';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'stats-chart',
  publicaciones: 'paper-plane',
  cloud: 'cloud',
  blog: 'newspaper',
};

/** Grupo (tabs): sin sesión → login. Con sesión → navegación por tabs (Dark Obsidian). */
export default function TabsLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.dark.background }}>
        <ActivityIndicator color={Colors.dark.primary} />
      </View>
    );
  }
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: Colors.dark.background },
        headerTitleStyle: { color: Colors.dark.text, fontWeight: '600' },
        headerTintColor: Colors.dark.primary,
        tabBarStyle: { backgroundColor: Colors.dark.backgroundElement, borderTopColor: Colors.dark.border },
        tabBarActiveTintColor: Colors.dark.primary,
        tabBarInactiveTintColor: Colors.dark.textSecondary,
        sceneStyle: { backgroundColor: Colors.dark.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <Ionicons name={ICONS.index} size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="publicaciones"
        options={{ title: 'Publicaciones', tabBarIcon: ({ color, size }) => <Ionicons name={ICONS.publicaciones} size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="cloud"
        options={{ title: 'Cloud', tabBarIcon: ({ color, size }) => <Ionicons name={ICONS.cloud} size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="blog"
        options={{ title: 'Blog', tabBarIcon: ({ color, size }) => <Ionicons name={ICONS.blog} size={size} color={color} /> }}
      />
    </Tabs>
  );
}
