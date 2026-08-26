/**
 * Tab "Creaciones" (loop-108/111): el media hub del Studio en el bolsillo.
 * Lista multi-media con filtro por tipo; imágenes inline; audio (expo-audio) y
 * vídeo (expo-video) con reproducción NATIVA in-app; notas/diseño abren en el
 * navegador del sistema vía `?session=` (sin headers posible ahí).
 */
import { useCallback, useState } from 'react';
import { Alert, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import { api, assetDownloadUrl, assetOpenUrl } from '@/api/client';
import { assetTypeLabel, parseAssetMeta, type AssetRecord } from '@/api/types';
import { Card, EmptyState, ErrorBanner, Loading, Screen } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';

const FILTERS = ['todos', 'image', 'music', 'video', 'design', 'text'] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABEL: Record<Filter, string> = {
  todos: 'Todos',
  image: 'Imagen',
  music: 'Música',
  video: 'Vídeo',
  design: 'Diseño',
  text: 'Nota',
};

function mmss(sec: number): string {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Player de audio nativo in-app (expo-audio, loop-111). */
function InlineAudio({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  return (
    <View style={styles.playerBox}>
      <Pressable
        style={styles.playBtn}
        onPress={() => (status.playing ? player.pause() : player.play())}>
        <Text style={styles.playBtnText}>{status.playing ? '❚❚' : '▶'}</Text>
      </Pressable>
      <Text style={styles.playerTime}>
        {mmss(status.currentTime)} / {mmss(status.duration)}
      </Text>
      <Pressable style={styles.replayBtn} onPress={() => player.seekTo(0)}>
        <Text style={styles.replayBtnText}>↺</Text>
      </Pressable>
    </View>
  );
}

/** Player de vídeo nativo in-app (expo-video, loop-111). */
function InlineVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return <VideoView player={player} style={styles.video} contentFit="contain" nativeControls />;
}

export default function CreacionesScreen() {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [filter, setFilter] = useState<Filter>('todos');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Reproductor nativo expandido (uno a la vez; null = ninguno).
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<{ items: AssetRecord[] }>('/api/library/assets?take=100');
      // URLs relativas (/api/assets/<id> de assets durables) → absolutas con sesión.
      const items = await Promise.all(
        res.items.map(async (a) => (a.url.startsWith('/') ? { ...a, url: await assetOpenUrl(a.id) } : a)),
      );
      setAssets(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando creaciones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const remove = (a: AssetRecord) => {
    Alert.alert('Eliminar', `¿Borrar "${a.prompt.slice(0, 60)}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.del(`/api/assets/${a.id}`);
            setAssets((prev) => prev.filter((x) => x.id !== a.id));
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Error borrando');
          }
        },
      },
    ]);
  };

  const open = async (a: AssetRecord) => Linking.openURL(await assetOpenUrl(a.id));
  const download = async (a: AssetRecord) => Linking.openURL(await assetDownloadUrl(a.id));

  const filtered = filter === 'todos' ? assets : assets.filter((a) => a.mediaType === filter);

  return (
    <Screen>
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {loading && assets.length === 0 ? <Loading label="Cargando creaciones…" /> : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsRow}
        contentContainerStyle={styles.chipsContent}>
        {FILTERS.map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipOn]}>
            <Text style={[styles.chipText, filter === f && styles.chipTextOn]}>{FILTER_LABEL[f]}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {!loading && filtered.length === 0 ? (
        <EmptyState message="Sin creaciones aún. Genera desde el Studio web y pulsa Guardar." />
      ) : null}

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={Colors.dark.primary}
          />
        }>
        {filtered.map((a) => (
          <AssetCard
            key={a.id}
            asset={a}
            expanded={expandedId === a.id}
            onTogglePlay={() => setExpandedId((cur) => (cur === a.id ? null : a.id))}
            onOpen={() => void open(a)}
            onDownload={() => void download(a)}
            onRemove={() => remove(a)}
          />
        ))}
        {filtered.length > 0 ? <View style={{ height: 24 }} /> : null}
      </ScrollView>
    </Screen>
  );
}

function AssetCard({
  asset,
  expanded,
  onTogglePlay,
  onOpen,
  onDownload,
  onRemove,
}: {
  asset: AssetRecord;
  expanded: boolean;
  onTogglePlay: () => void;
  onOpen: () => void;
  onDownload: () => void;
  onRemove: () => void;
}) {
  const meta = parseAssetMeta(asset);
  const isImage = asset.mediaType === 'image' || asset.mediaType === 'design';
  const isAudio = asset.mediaType === 'music' || asset.mediaType === 'audio' || asset.mediaType === 'tts';
  const isVideo = asset.mediaType === 'video';

  return (
    <Card style={styles.card}>
      {isImage ? (
        <Image source={{ uri: asset.url }} style={styles.thumb} resizeMode="cover" />
      ) : isVideo && expanded ? (
        <InlineVideo uri={asset.url} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Text style={styles.placeholderGlyph}>{isAudio ? '♪' : isVideo ? '▶' : '≡'}</Text>
        </View>
      )}

      {isAudio && expanded ? <InlineAudio uri={asset.url} /> : null}

      <Text style={styles.prompt} numberOfLines={2}>
        {asset.prompt}
      </Text>
      <Text style={styles.meta}>
        {assetTypeLabel(asset.mediaType)} · {asset.provider}
        {asset.storage === 'cloud' ? ' · durable' : ''}
        {typeof meta.bpm === 'number' ? ` · ${String(meta.bpm)} bpm` : ''}
      </Text>

      <View style={styles.actions}>
        {(isAudio || isVideo) && (
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onTogglePlay}>
            <Text style={[styles.btnText, styles.btnPrimaryText]}>{expanded ? 'Cerrar player' : 'Reproducir'}</Text>
          </Pressable>
        )}
        {isImage ? (
          <Pressable style={styles.btn} onPress={onOpen}>
            <Text style={styles.btnText}>Ampliar</Text>
          </Pressable>
        ) : null}
        {!isImage && !isAudio && !isVideo ? (
          <Pressable style={styles.btn} onPress={onOpen}>
            <Text style={styles.btnText}>Abrir</Text>
          </Pressable>
        ) : null}
        {asset.storage === 'cloud' ? (
          <Pressable style={styles.btn} onPress={onDownload}>
            <Text style={styles.btnText}>Descargar</Text>
          </Pressable>
        ) : null}
        <Pressable style={[styles.btn, styles.btnDanger]} onPress={onRemove}>
          <Text style={[styles.btnText, styles.btnDangerText]}>Borrar</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  chipsRow: { maxHeight: 44, marginBottom: 8 },
  chipsContent: { gap: 8, paddingRight: 16 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.backgroundElement,
  },
  chipOn: { borderColor: Colors.dark.primary, backgroundColor: `${Colors.dark.primary}22` },
  chipText: { color: Colors.dark.textSecondary, fontSize: 12, fontFamily: Fonts.mono },
  chipTextOn: { color: Colors.dark.text },
  card: { marginBottom: 12 },
  thumb: {
    width: '100%',
    aspectRatio: 1.6,
    borderRadius: 10,
    backgroundColor: '#00000055',
    marginBottom: 8,
  },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderGlyph: { color: Colors.dark.textSecondary, fontSize: 28 },
  prompt: { color: Colors.dark.text, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  meta: { color: Colors.dark.textSecondary, fontSize: 11, fontFamily: Fonts.mono, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 8 },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
  },
  btnPrimary: { borderColor: Colors.dark.primary, backgroundColor: `${Colors.dark.primary}22` },
  btnPrimaryText: { color: Colors.dark.text },
  btnDanger: { borderColor: '#b91c1c66' },
  btnText: { color: Colors.dark.text, fontSize: 12 },
  btnDangerText: { color: '#fca5a5' },
  playerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    marginBottom: 4,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.primary,
  },
  playBtnText: { color: '#fff', fontSize: 14 },
  playerTime: { color: Colors.dark.textSecondary, fontSize: 12, fontFamily: Fonts.mono },
  replayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    marginLeft: 'auto',
  },
  replayBtnText: { color: Colors.dark.textSecondary, fontSize: 14 },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#00000088',
  },
});
