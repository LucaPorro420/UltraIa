import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '@/api/client';
import type { MetricsResponse } from '@/api/types';
import { useAuth } from '@/auth/auth-context';
import { Badge, Card, EmptyState, ErrorBanner, Loading, Screen, StatCard } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<MetricsResponse>('/api/publications/metrics');
      setMetrics(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando métricas');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const kpis = metrics?.porCanal ?? [];

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {user?.name ?? user?.email ?? 'usuario'}</Text>
          <Text style={styles.role}>{user?.role === 'ADMIN' ? 'Administrador' : 'Usuario'}</Text>
        </View>
        <Pressable onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Salir</Text>
        </Pressable>
      </View>

      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {loading && !metrics ? <Loading label="Cargando KPIs…" /> : null}

      {metrics?.totales ? (
        <View style={styles.statsRow}>
          <StatCard label="Publicadas" value={metrics.totales.publicadas} />
          <StatCard label="Pendientes" value={metrics.totales.pendientes} />
          <StatCard label="Fallidas" value={metrics.totales.fallidas} />
          <StatCard label="Éxito" value={`${(metrics.totales.tasaExito * 100).toFixed(0)}%`} />
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>KPIs por canal</Text>
      {!loading && kpis.length === 0 && !error ? <EmptyState message="Todavía no hay publicaciones en la cola" /> : null}

      {kpis.map((k) => (
        <Card key={k.canal} style={styles.channelRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.channelName}>{k.canal}</Text>
            <Text style={styles.channelSub}>
              {k.publicadas} publicadas · {k.pendientes} pendientes · {k.fallidas} fallidas
            </Text>
          </View>
          <Badge label={`${(k.tasaExito * 100).toFixed(0)}%`} tone={k.tasaExito >= 0.8 ? 'ok' : k.tasaExito >= 0.5 ? 'warn' : 'danger'} />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  greeting: { color: Colors.dark.text, fontSize: 18, fontWeight: '700', fontFamily: Fonts.sans },
  role: { color: Colors.dark.textSecondary, fontSize: 12, marginTop: 2 },
  logoutBtn: { borderColor: Colors.dark.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  logoutText: { color: Colors.dark.danger, fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sectionTitle: { color: Colors.dark.text, fontSize: 15, fontWeight: '700', marginTop: 8 },
  channelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  channelName: { color: Colors.dark.text, fontSize: 14, fontWeight: '600', fontFamily: Fonts.mono },
  channelSub: { color: Colors.dark.textSecondary, fontSize: 12, marginTop: 2 },
});
