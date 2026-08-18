import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '@/api/client';
import type { CloudFilesResponse } from '@/api/types';
import { Card, EmptyState, ErrorBanner, Loading, Screen } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KiB', 'MiB', 'GiB'];
  let v = bytes;
  let u = -1;
  do {
    v /= 1024;
    u++;
  } while (v >= 1024 && u < units.length - 1);
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[u]}`;
}

export default function CloudScreen() {
  const [files, setFiles] = useState<CloudFilesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<CloudFilesResponse>('/api/cloud/files');
      setFiles(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando cloud');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const remove = async (path: string) => {
    Alert.alert('Borrar archivo', `¿Eliminar ${path}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.del<{ removed: boolean }>('/api/cloud/files', { path });
            await load();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Error borrando');
          }
        },
      },
    ]);
  };

  const totalBytes = files?.files.reduce((acc, f) => acc + f.size, 0) ?? 0;

  return (
    <Screen>
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {loading && !files ? <Loading label="Cargando cloud…" /> : null}

      {files ? (
        <Card style={styles.summary}>
          <Text style={styles.summaryValue}>{files.files.length}</Text>
          <Text style={styles.summaryLabel}>archivos · {humanSize(totalBytes)}</Text>
          <Text style={styles.summaryBase}>base: {files.base}</Text>
        </Card>
      ) : null}

      {!loading && files && files.files.length === 0 ? <EmptyState message="La nube está vacía" /> : null}

      {files?.files.map((f) => (
        <Card key={f.path} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{f.name}</Text>
            <Text style={styles.meta} numberOfLines={1}>{f.path}</Text>
            <Text style={styles.meta}>{f.type} · {humanSize(f.size)}</Text>
          </View>
          <Pressable onPress={() => remove(f.path)} style={styles.delBtn}>
            <Text style={styles.delText}>Borrar</Text>
          </Pressable>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { alignItems: 'center' },
  summaryValue: { color: Colors.dark.primary, fontSize: 28, fontWeight: '800' },
  summaryLabel: { color: Colors.dark.textSecondary, fontSize: 13, marginTop: 2 },
  summaryBase: { color: Colors.dark.textSecondary, fontSize: 11, fontFamily: Fonts.mono, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { color: Colors.dark.text, fontSize: 14, fontWeight: '600' },
  meta: { color: Colors.dark.textSecondary, fontSize: 11, fontFamily: Fonts.mono, marginTop: 2 },
  delBtn: { borderColor: Colors.dark.danger, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  delText: { color: Colors.dark.danger, fontSize: 12, fontWeight: '600' },
});
