import { useCallback, useEffect, useOptimistic, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '@/api/client';
import type { ListPublicationsResponse, Publication, PublicationEstado, PublicationFiltro } from '@/api/types';
import { Badge, Card, EmptyState, ErrorBanner, Loading, Screen } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';

const ESTADOS: PublicationFiltro[] = ['ALL', 'DRAFT', 'APPROVED', 'REJECTED', 'PUBLISHED', 'FAILED'] as const;

const TONE: Record<PublicationEstado, 'neutral' | 'warn' | 'danger' | 'ok'> = {
  DRAFT: 'warn',
  APPROVED: 'neutral',
  REJECTED: 'danger',
  PUBLISHED: 'ok',
  FAILED: 'danger',
};

export default function PublicacionesScreen() {
  const [estado, setEstado] = useState<PublicationFiltro>('ALL');
  const [data, setData] = useState<ListPublicationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // React 19 useOptimistic: actualización instantánea del UI antes de la respuesta del server.
  // Cuando el usuario aprueba/rechaza, el estado cambia inmediatamente en la lista.
  const [optimisticPubs, applyOptimistic] = useOptimistic(
    data?.items ?? [],
    (current: Publication[], { id, nuevoEstado }: { id: string; nuevoEstado: PublicationEstado }) =>
      current.map((p) => (p.id === id ? { ...p, estado: nuevoEstado } : p)),
  );

  const load = useCallback(async (est: PublicationFiltro = estado) => {
    setLoading(true);
    setError(null);
    try {
      const qs = est === 'ALL' ? '' : `?estado=${est}`;
      const res = await api.get<ListPublicationsResponse>(`/api/publications${qs}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando publicaciones');
    } finally {
      setLoading(false);
    }
  }, [estado]);

  useEffect(() => {
    load();
  }, [load]);

  const transicion = async (id: string, accion: 'approve' | 'reject') => {
    // Optimistic update: cambia el estado inmediatamente en el UI
    const nuevoEstado: PublicationEstado = accion === 'approve' ? 'APPROVED' : 'REJECTED';
    applyOptimistic({ id, nuevoEstado });
    setBusyId(id);
    setError(null);
    try {
      await api.post<{ id: string; estado: PublicationEstado }>(`/api/publications/${id}/${accion}`);
      // Re-fetch para sincronizar con el server (fuente de verdad)
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en la acción');
      // Revert: el re-fetch restaura el estado real
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen>
      <View style={styles.filters}>
        {ESTADOS.map((e) => (
          <Pressable key={e} style={[styles.filterChip, estado === e && styles.filterChipActive]} onPress={() => setEstado(e)}>
            <Text style={[styles.filterText, estado === e && styles.filterTextActive]}>{e}</Text>
          </Pressable>
        ))}
      </View>

      {error ? <ErrorBanner message={error} /> : null}
      {loading && !data ? <Loading label="Cargando cola…" /> : null}

      {!loading && data && optimisticPubs.length === 0 ? <EmptyState message={`Sin publicaciones en ${estado}`} /> : null}

      {optimisticPubs.map((p) => (
        <PublicationCard key={p.id} pub={p} busy={busyId === p.id} onApprove={() => transicion(p.id, 'approve')} onReject={() => transicion(p.id, 'reject')} />
      ))}
    </Screen>
  );
}

function PublicationCard({
  pub,
  busy,
  onApprove,
  onReject,
}: {
  pub: Publication;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const acciones = pub.estado === 'DRAFT';
  return (
    <Card>
      <View style={styles.pubHeader}>
        <Badge label={pub.estado} tone={TONE[pub.estado]} />
        <Text style={styles.pubCanal}>{pub.canal}</Text>
      </View>
      <Text style={styles.pubTema}>{pub.tema}</Text>
      <Text style={styles.pubCaption} numberOfLines={3}>
        {pub.caption}
      </Text>
      {pub.error ? <Text style={styles.pubError}>{pub.error}</Text> : null}
      <Text style={styles.pubDate}>
        {pub.scheduledAt ? `Programada: ${new Date(pub.scheduledAt).toLocaleString()}` : `Creada: ${new Date(pub.createdAt).toLocaleString()}`}
      </Text>

      {acciones ? (
        <View style={styles.actions}>
          <Pressable style={[styles.actionBtn, styles.approveBtn]} onPress={onApprove} disabled={busy}>
            {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.actionText}>Aprobar</Text>}
          </Pressable>
          <Pressable style={[styles.actionBtn, styles.rejectBtn]} onPress={onReject} disabled={busy}>
            {busy ? <ActivityIndicator size="small" color={Colors.dark.danger} /> : <Text style={[styles.actionText, { color: Colors.dark.danger }]}>Rechazar</Text>}
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChip: { borderColor: Colors.dark.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  filterChipActive: { backgroundColor: Colors.dark.primary, borderColor: Colors.dark.primary },
  filterText: { color: Colors.dark.textSecondary, fontSize: 11, fontFamily: Fonts.mono },
  filterTextActive: { color: '#fff', fontWeight: '700' },
  pubHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pubCanal: { color: Colors.dark.textSecondary, fontSize: 11, fontFamily: Fonts.mono, textTransform: 'uppercase' },
  pubTema: { color: Colors.dark.text, fontSize: 15, fontWeight: '700', marginTop: 8 },
  pubCaption: { color: Colors.dark.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 18 },
  pubError: { color: Colors.dark.danger, fontSize: 12, marginTop: 4, fontFamily: Fonts.mono },
  pubDate: { color: Colors.dark.textSecondary, fontSize: 11, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center', borderWidth: 1 },
  approveBtn: { backgroundColor: Colors.dark.primary, borderColor: Colors.dark.primary },
  rejectBtn: { borderColor: Colors.dark.danger },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
