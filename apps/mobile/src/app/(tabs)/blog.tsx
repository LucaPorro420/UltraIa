import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '@/api/client';
import type { ListPublicationsResponse } from '@/api/types';
import { Card, EmptyState, ErrorBanner, Loading, Screen } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';

interface BlogPostItem {
  id: string;
  tema: string;
  caption: string;
  publishedAt: string;
}

/** Blog propio: publicaciones con canal=blog y estado PUBLISHED (misma fuente que /blog del web). */
export default function BlogScreen() {
  const [posts, setPosts] = useState<BlogPostItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ListPublicationsResponse>('/api/publications?estado=PUBLISHED&canal=blog');
      setPosts(res.items.map((p) => ({ id: p.id, tema: p.tema, caption: p.caption, publishedAt: p.publishedAt ?? p.createdAt })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando blog');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen>
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {loading && !posts ? <Loading label="Cargando blog…" /> : null}

      {!loading && posts && posts.length === 0 ? <EmptyState message="Todavía no hay posts publicados en el blog" /> : null}

      {posts?.map((p) => (
        <Card key={p.id}>
          <Text style={styles.title}>{p.tema}</Text>
          <Text style={styles.caption} numberOfLines={4}>{p.caption}</Text>
          <Text style={styles.date}>{new Date(p.publishedAt).toLocaleDateString()}</Text>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: Colors.dark.text, fontSize: 15, fontWeight: '700' },
  caption: { color: Colors.dark.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 18 },
  date: { color: Colors.dark.textSecondary, fontSize: 11, fontFamily: Fonts.mono, marginTop: 8 },
});
