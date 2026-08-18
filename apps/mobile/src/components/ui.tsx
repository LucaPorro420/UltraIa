/**
 * UI kit Dark Obsidian mínimo para la app móvil.
 */
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ label, tone }: { label: string; tone: 'ok' | 'warn' | 'danger' | 'neutral' }) {
  const color = tone === 'ok' ? Colors.dark.success : tone === 'warn' ? Colors.dark.warning : tone === 'danger' ? Colors.dark.danger : Colors.dark.textSecondary;
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </Card>
  );
}

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={Colors.dark.primary} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry}>
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.background },
  screenContent: { padding: 16, gap: 12, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.dark.backgroundElement,
    borderColor: Colors.dark.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontFamily: Fonts.mono, fontWeight: '600' },
  statCard: { flex: 1, minWidth: '45%' },
  statValue: { color: Colors.dark.primary, fontSize: 22, fontWeight: '800', fontFamily: Fonts.sans },
  statLabel: { color: Colors.dark.textSecondary, fontSize: 12, marginTop: 2 },
  statSub: { color: Colors.dark.textSecondary, fontSize: 11, marginTop: 2 },
  center: { paddingVertical: 48, alignItems: 'center', gap: 8 },
  loadingText: { color: Colors.dark.textSecondary, fontSize: 13 },
  emptyText: { color: Colors.dark.textSecondary, fontSize: 13, textAlign: 'center' },
  errorBanner: {
    backgroundColor: '#3b1216',
    borderColor: Colors.dark.danger,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  errorText: { color: Colors.dark.danger, fontSize: 13, flex: 1 },
  retryText: { color: Colors.dark.primary, fontSize: 13, fontWeight: '700' },
});
