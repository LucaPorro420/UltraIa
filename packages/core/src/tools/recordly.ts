//! Capability `recordly` — ScreenFlow Studio planner (UltraIa port of PRINCIPLES).
// ORIGINAL deterministic reimplementation of the editing principles from Recordly
// (github.com/webadderallorg/Recordly, AGPL-3.0). No AGPL source is copied; the
// algorithms (auto-zoom from cursor telemetry, cursor-motion presets, webcam-bubble
// layout, export dimension math, region-based timeline model, .recordly-style
// manifest) are reimplemented from the published design. Complements `screenflow`
// + `video_edit` + `vfx`. Pure, keyless, offline, fail-soft. Never throws.

// ---------------------------------------------------------------------------
// Cursor telemetry + auto-zoom (port of zoomSuggestionUtils)
// ---------------------------------------------------------------------------

export interface CursorSample {
  timeMs: number;
  cx: number;
  cy: number;
  interactionType?:
    | 'click'
    | 'double-click'
    | 'right-click'
    | 'middle-click'
    | 'mouseup'
    | 'move'
    | string;
  cursorType?: string;
}

export interface ZoomFocus {
  cx: number;
  cy: number;
}

export interface SuggestedZoomRegion {
  start: number;
  end: number;
  focus: ZoomFocus;
}

export const MIN_DWELL_DURATION_MS = 450;
export const MAX_DWELL_DURATION_MS = 2600;
export const DWELL_MOVE_THRESHOLD = 0.02;
export const CLICK_CLUSTER_MERGE_GAP_MS = 2500;
export const CLICK_CLUSTER_PAD_MS = 500;

export function normalizeCursorTelemetry(
  telemetry: CursorSample[],
  totalMs: number,
): CursorSample[] {
  const safeTotal = Number.isFinite(totalMs) && totalMs > 0 ? totalMs : 0;
  return [...telemetry]
    .filter(
      (s) =>
        Number.isFinite(s.timeMs) && Number.isFinite(s.cx) && Number.isFinite(s.cy),
    )
    .map((s) => ({
      timeMs: Math.max(0, Math.min(s.timeMs, safeTotal)),
      cx: Math.max(0, Math.min(s.cx, 1)),
      cy: Math.max(0, Math.min(s.cy, 1)),
      interactionType: s.interactionType,
      cursorType: s.cursorType,
    }))
    .sort((a, b) => a.timeMs - b.timeMs);
}

function isExplicitClick(type: CursorSample['interactionType']): boolean {
  return (
    type === 'click' ||
    type === 'double-click' ||
    type === 'right-click' ||
    type === 'middle-click'
  );
}

/** Detect runs where the cursor stays roughly still (a "dwell") -> zoom focus. */
export function detectZoomDwellCandidates(samples: CursorSample[]): Array<{
  centerTimeMs: number;
  focus: ZoomFocus;
  strength: number;
}> {
  if (samples.length < 2) return [];
  const candidates: Array<{ centerTimeMs: number; focus: ZoomFocus; strength: number }> = [];
  let runStart = 0;
  const pushRunIfDwell = (startIndex: number, endIndexExclusive: number) => {
    if (endIndexExclusive - startIndex < 2) return;
    const start = samples[startIndex];
    const end = samples[endIndexExclusive - 1];
    const runDuration = end.timeMs - start.timeMs;
    if (runDuration < MIN_DWELL_DURATION_MS || runDuration > MAX_DWELL_DURATION_MS) return;
    const run = samples.slice(startIndex, endIndexExclusive);
    const avgCx = run.reduce((s, x) => s + x.cx, 0) / run.length;
    const avgCy = run.reduce((s, x) => s + x.cy, 0) / run.length;
    candidates.push({
      centerTimeMs: Math.round((start.timeMs + end.timeMs) / 2),
      focus: { cx: avgCx, cy: avgCy },
      strength: runDuration,
    });
  };
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const curr = samples[i];
    const distance = Math.hypot(curr.cx - prev.cx, curr.cy - prev.cy);
    if (distance > DWELL_MOVE_THRESHOLD) {
      pushRunIfDwell(runStart, i);
      runStart = i;
    }
  }
  pushRunIfDwell(runStart, samples.length);
  return candidates;
}

function buildClickClusters(
  clicks: Array<{ centerTimeMs: number; focus: ZoomFocus; strength: number }>,
  mergeGapMs: number,
): Array<{ firstMs: number; lastMs: number; focus: ZoomFocus }> {
  if (clicks.length === 0) return [];
  const sorted = [...clicks].sort((a, b) => a.centerTimeMs - b.centerTimeMs);
  const clusters: Array<{ firstMs: number; lastMs: number; focus: ZoomFocus }> = [];
  let clusterStart = sorted[0].centerTimeMs;
  let clusterEnd = sorted[0].centerTimeMs;
  let bestStrength = sorted[0].strength;
  let bestFocus = sorted[0].focus;
  let sumCx = sorted[0].focus.cx;
  let sumCy = sorted[0].focus.cy;
  let count = 1;
  for (let i = 1; i < sorted.length; i++) {
    const click = sorted[i];
    const gap = click.centerTimeMs - clusterEnd;
    if (gap <= mergeGapMs) {
      clusterEnd = Math.max(clusterEnd, click.centerTimeMs);
      if (click.strength > bestStrength) {
        bestStrength = click.strength;
        bestFocus = click.focus;
      }
      sumCx += click.focus.cx;
      sumCy += click.focus.cy;
      count += 1;
    } else {
      clusters.push({
        firstMs: clusterStart,
        lastMs: clusterEnd,
        focus: bestFocus ?? { cx: sumCx / count, cy: sumCy / count },
      });
      clusterStart = click.centerTimeMs;
      clusterEnd = click.centerTimeMs;
      bestStrength = click.strength;
      bestFocus = click.focus;
      sumCx = click.focus.cx;
      sumCy = click.focus.cy;
      count = 1;
    }
  }
  clusters.push({
    firstMs: clusterStart,
    lastMs: clusterEnd,
    focus: bestFocus ?? { cx: sumCx / count, cy: sumCy / count },
  });
  return clusters;
}

export interface InteractionZoomSuggestionResult {
  status: 'ok' | 'no-slots' | 'no-telemetry' | 'no-interactions';
  suggestions: SuggestedZoomRegion[];
}

export function buildInteractionZoomSuggestions(params: {
  cursorTelemetry: CursorSample[];
  totalMs: number;
  reservedSpans?: Array<{ start: number; end: number }>;
  mergeGapMs?: number;
  padMs?: number;
}): InteractionZoomSuggestionResult {
  const {
    cursorTelemetry,
    totalMs,
    reservedSpans = [],
    mergeGapMs = CLICK_CLUSTER_MERGE_GAP_MS,
    padMs = CLICK_CLUSTER_PAD_MS,
  } = params;
  if (!(Number.isFinite(totalMs) && totalMs > 0)) return { status: 'no-slots', suggestions: [] };
  const normalized = normalizeCursorTelemetry(cursorTelemetry, totalMs);
  if (normalized.length === 0) return { status: 'no-telemetry', suggestions: [] };

  const explicitClicks = normalized
    .filter((s) => isExplicitClick(s.interactionType))
    .map((s) => ({ centerTimeMs: s.timeMs, focus: { cx: s.cx, cy: s.cy }, strength: 900 }));
  if (explicitClicks.length === 0) return { status: 'no-interactions', suggestions: [] };

  const clusters = buildClickClusters(explicitClicks, mergeGapMs);
  const reserved = [...reservedSpans].sort((a, b) => a.start - b.start);
  const suggestions: SuggestedZoomRegion[] = [];
  for (const cluster of clusters) {
    const regionStart = Math.max(0, cluster.firstMs - padMs);
    const regionEnd = Math.min(totalMs, cluster.lastMs + padMs);
    if (regionEnd <= regionStart) continue;
    const hasOverlap = reserved.some((span) => regionEnd > span.start && regionStart < span.end);
    if (hasOverlap) continue;
    reserved.push({ start: regionStart, end: regionEnd });
    suggestions.push({ start: regionStart, end: regionEnd, focus: cluster.focus });
  }
  if (suggestions.length === 0) return { status: 'no-slots', suggestions: [] };
  suggestions.sort((a, b) => a.start - b.start);
  return { status: 'ok', suggestions };
}

// ---------------------------------------------------------------------------
// Cursor motion presets (port of cursorMotionPresets)
// ---------------------------------------------------------------------------

export interface CursorMotionPreset {
  id: 'focused' | 'smooth';
  label: string;
  zoomSmoothness: number;
  zoomInDurationMs: number;
  zoomOutDurationMs: number;
  cursorSize: number;
  cursorSmoothing: number;
  cursorSpringStiffnessMultiplier: number;
  cursorSpringDampingMultiplier: number;
  cursorSpringMassMultiplier: number;
  cursorMotionBlur: number;
  cursorClickBounce: number;
  cursorClickBounceDuration: number;
}

const SHARED_CURSOR_PRESET_VALUES = {
  cursorSize: 2.5,
  cursorSmoothing: 0.67,
  cursorSpringMassMultiplier: 1.29,
  cursorMotionBlur: 0.4,
  cursorClickBounce: 3.5,
  cursorClickBounceDuration: 350,
} as const;

export const CURSOR_MOTION_PRESETS: Record<'focused' | 'smooth', CursorMotionPreset> = {
  focused: {
    id: 'focused',
    label: 'Focused',
    zoomSmoothness: 0.5,
    zoomInDurationMs: 200,
    zoomOutDurationMs: 200,
    ...SHARED_CURSOR_PRESET_VALUES,
    cursorSpringStiffnessMultiplier: 1.35,
    cursorSpringDampingMultiplier: 0.79,
  },
  smooth: {
    id: 'smooth',
    label: 'Smooth',
    zoomSmoothness: 0.5,
    zoomInDurationMs: 250,
    zoomOutDurationMs: 250,
    ...SHARED_CURSOR_PRESET_VALUES,
    cursorSpringStiffnessMultiplier: 0.92,
    cursorSpringDampingMultiplier: 1.36,
  },
};

export function resolveCursorMotionPresetId(
  values: Omit<CursorMotionPreset, 'id' | 'label'>,
  fallback: 'focused' | 'smooth' = 'focused',
): 'focused' | 'smooth' {
  for (const id of Object.keys(CURSOR_MOTION_PRESETS) as Array<'focused' | 'smooth'>) {
    const p = CURSOR_MOTION_PRESETS[id];
    if (
      p.zoomInDurationMs === values.zoomInDurationMs &&
      p.zoomOutDurationMs === values.zoomOutDurationMs &&
      p.cursorSize === values.cursorSize &&
      p.cursorSmoothing === values.cursorSmoothing &&
      p.cursorSpringStiffnessMultiplier === values.cursorSpringStiffnessMultiplier &&
      p.cursorSpringDampingMultiplier === values.cursorSpringDampingMultiplier &&
      p.cursorSpringMassMultiplier === values.cursorSpringMassMultiplier &&
      p.cursorMotionBlur === values.cursorMotionBlur &&
      p.cursorClickBounce === values.cursorClickBounce &&
      p.cursorClickBounceDuration === values.cursorClickBounceDuration
    ) {
      return id;
    }
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Webcam bubble overlay layout (port of webcamOverlay)
// ---------------------------------------------------------------------------

export type WebcamPositionPreset =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'custom';

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MIN_WEBCAM_OVERLAY_SIZE_PX = 56;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getWebcamPositionForPreset(preset: WebcamPositionPreset): { x: number; y: number } {
  switch (preset) {
    case 'top-left':
      return { x: 0, y: 0 };
    case 'top-center':
      return { x: 0.5, y: 0 };
    case 'top-right':
      return { x: 1, y: 0 };
    case 'center-left':
      return { x: 0, y: 0.5 };
    case 'center':
      return { x: 0.5, y: 0.5 };
    case 'center-right':
      return { x: 1, y: 0.5 };
    case 'bottom-left':
      return { x: 0, y: 1 };
    case 'bottom-center':
      return { x: 0.5, y: 1 };
    case 'custom':
      return { x: 1, y: 1 };
    case 'bottom-right':
    default:
      return { x: 1, y: 1 };
  }
}

export function getWebcamOverlayScale(zoomScale: number, reactToZoom: boolean): number {
  const safeZoomScale = Number.isFinite(zoomScale) && zoomScale > 0 ? zoomScale : 1;
  return reactToZoom ? 1 / safeZoomScale : 1;
}

export function getWebcamOverlaySizePx(params: {
  containerWidth: number;
  containerHeight: number;
  sizePercent: number;
  margin: number;
  zoomScale: number;
  reactToZoom: boolean;
}): number {
  const { containerWidth, containerHeight, sizePercent, margin, zoomScale, reactToZoom } = params;
  const minDimension = Math.min(containerWidth, containerHeight);
  const clampedSizePercent = clamp(sizePercent, 10, 100);
  const safeMargin = Math.max(0, margin);
  const maxSize = Math.max(MIN_WEBCAM_OVERLAY_SIZE_PX, minDimension - safeMargin * 2);
  const scaledSize =
    minDimension * (clampedSizePercent / 100) * getWebcamOverlayScale(zoomScale, reactToZoom);
  return Math.min(maxSize, Math.max(MIN_WEBCAM_OVERLAY_SIZE_PX, scaledSize));
}

export function getWebcamOverlayPosition(params: {
  containerWidth: number;
  containerHeight: number;
  width: number;
  height: number;
  margin: number;
  positionPreset: WebcamPositionPreset;
  positionX: number;
  positionY: number;
}): { x: number; y: number } {
  const { containerWidth, containerHeight, width, height, margin, positionPreset, positionX, positionY } =
    params;
  const safeMargin = Math.max(0, margin);
  const overlayWidth = Math.max(0, width);
  const overlayHeight = Math.max(0, height);
  const availableWidth = Math.max(0, containerWidth - overlayWidth - safeMargin * 2);
  const availableHeight = Math.max(0, containerHeight - overlayHeight - safeMargin * 2);
  const preset =
    positionPreset === 'custom'
      ? { x: clamp(positionX, 0, 1), y: clamp(positionY, 0, 1) }
      : getWebcamPositionForPreset(positionPreset);
  return {
    x: safeMargin + availableWidth * preset.x,
    y: safeMargin + availableHeight * preset.y,
  };
}

export function normalizeWebcamCropRegion(cropRegion?: Partial<CropRegion> | null): CropRegion {
  const c = cropRegion ?? {};
  const x = clamp(Number.isFinite(c.x) ? (c.x as number) : 0, 0, 0.99);
  const y = clamp(Number.isFinite(c.y) ? (c.y as number) : 0, 0, 0.99);
  const width = clamp(Number.isFinite(c.width) ? (c.width as number) : 1, 0.01, 1 - x);
  const height = clamp(Number.isFinite(c.height) ? (c.height as number) : 1, 0.01, 1 - y);
  return { x, y, width, height };
}

export function getWebcamCropSourceRect(
  cropRegion: Partial<CropRegion> | null | undefined,
  sourceWidth: number,
  sourceHeight: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const crop = normalizeWebcamCropRegion(cropRegion);
  const safeWidth = Math.max(1, sourceWidth);
  const safeHeight = Math.max(1, sourceHeight);
  const sx = clamp(crop.x * safeWidth, 0, safeWidth - 1);
  const sy = clamp(crop.y * safeHeight, 0, safeHeight - 1);
  const sw = clamp(crop.width * safeWidth, 1, safeWidth - sx);
  const sh = clamp(crop.height * safeHeight, 1, safeHeight - sy);
  return { sx, sy, sw, sh };
}

// ---------------------------------------------------------------------------
// Export dimensions (port of exportDimensions)
// ---------------------------------------------------------------------------

export type ExportQuality = 'source' | 'low' | 'medium' | 'good' | 'high';
export type AspectRatio = 'native' | '16:9' | '4:3' | '1:1' | '9:16';

function normalizeEvenDimension(value: number): number {
  return Math.max(2, Math.floor(value / 2) * 2);
}

function getAspectRatioValue(aspect: AspectRatio, sourceAspect: number): number {
  switch (aspect) {
    case '16:9':
      return 16 / 9;
    case '4:3':
      return 4 / 3;
    case '1:1':
      return 1;
    case '9:16':
      return 9 / 16;
    case 'native':
    default:
      return Number.isFinite(sourceAspect) && sourceAspect > 0 ? sourceAspect : 16 / 9;
  }
}

function fitAspectRatioWithinBounds(
  maxWidth: number,
  maxHeight: number,
  aspectRatioValue: number,
): { width: number; height: number } {
  const safeMaxWidth = normalizeEvenDimension(maxWidth);
  const safeMaxHeight = normalizeEvenDimension(maxHeight);
  const safeAspect =
    Number.isFinite(aspectRatioValue) && aspectRatioValue > 0 ? aspectRatioValue : 16 / 9;
  if (safeMaxWidth / safeMaxHeight > safeAspect) {
    const height = safeMaxHeight;
    const width = normalizeEvenDimension(height * safeAspect);
    return { width: Math.min(width, safeMaxWidth), height };
  }
  const width = safeMaxWidth;
  const height = normalizeEvenDimension(width / safeAspect);
  return { width, height: Math.min(height, safeMaxHeight) };
}

export interface ExportDimensionsInput {
  sourceWidth: number;
  sourceHeight: number;
  quality?: ExportQuality;
  aspectRatio?: AspectRatio;
}

export function calculateMp4ExportDimensions(input: ExportDimensionsInput): {
  width: number;
  height: number;
} {
  const { sourceWidth, sourceHeight } = input;
  const quality: ExportQuality = input.quality ?? 'source';
  const aspect: AspectRatio = input.aspectRatio ?? 'native';
  const safeSourceWidth = Math.max(2, sourceWidth);
  const safeSourceHeight = Math.max(2, sourceHeight);
  const sourceAspect = safeSourceWidth / safeSourceHeight;

  if (quality === 'source') {
    return fitAspectRatioWithinBounds(safeSourceWidth, safeSourceHeight, getAspectRatioValue(aspect, sourceAspect));
  }

  const qualityScale: Record<Exclude<ExportQuality, 'source'>, number> = {
    low: 0.5,
    medium: 0.6,
    good: 0.75,
    high: 0.9,
  };
  const scale = qualityScale[quality];
  const targetWidth = safeSourceWidth * scale;
  const targetHeight = safeSourceHeight * scale;
  return fitAspectRatioWithinBounds(targetWidth, targetHeight, getAspectRatioValue(aspect, sourceAspect));
}

// ---------------------------------------------------------------------------
// Timeline region model (port of timelineModel)
// ---------------------------------------------------------------------------

export interface TrackRegion {
  id: string;
  startMs: number;
  endMs: number;
}

export interface ZoomRegion extends TrackRegion {
  depth: number;
  mode?: 'smooth' | 'instant';
}

export interface ClipRegion extends TrackRegion {
  speed?: number;
  muted?: boolean;
  showSourceAudio?: boolean;
}

export interface AnnotationRegion extends TrackRegion {
  trackIndex?: number;
  type: 'text' | 'arrow' | 'highlight' | 'shape';
  content?: string;
}

export interface AudioRegion extends TrackRegion {
  audioPath: string;
  volume?: number;
  normalize?: boolean;
  trackIndex?: number;
}

export type TimelineRenderItem = {
  id: string;
  startMs: number;
  endMs: number;
  rowId: string;
  variant: 'zoom' | 'clip' | 'annotation' | 'audio';
};

export function buildRegionTimeline(params: {
  zoomRegions?: ZoomRegion[];
  clipRegions?: ClipRegion[];
  annotationRegions?: AnnotationRegion[];
  audioRegions?: AudioRegion[];
}): TimelineRenderItem[] {
  const items: TimelineRenderItem[] = [];
  for (const r of params.zoomRegions ?? []) {
    items.push({ id: r.id, startMs: r.startMs, endMs: r.endMs, rowId: 'zoom', variant: 'zoom' });
  }
  for (const r of params.clipRegions ?? []) {
    items.push({ id: r.id, startMs: r.startMs, endMs: r.endMs, rowId: 'clips', variant: 'clip' });
  }
  for (const r of params.annotationRegions ?? []) {
    const trackIndex = Number.isFinite(r.trackIndex) ? (r.trackIndex as number) : 0;
    items.push({
      id: r.id,
      startMs: r.startMs,
      endMs: r.endMs,
      rowId: `annotations-${trackIndex}`,
      variant: 'annotation',
    });
  }
  for (const r of params.audioRegions ?? []) {
    const trackIndex = Number.isFinite(r.trackIndex) ? (r.trackIndex as number) : 0;
    items.push({
      id: r.id,
      startMs: r.startMs,
      endMs: r.endMs,
      rowId: `audio-${trackIndex}`,
      variant: 'audio',
    });
  }
  items.sort((a, b) => a.startMs - b.startMs || a.rowId.localeCompare(b.rowId));
  return items;
}

// ---------------------------------------------------------------------------
// Deterministic .recordly-style manifest (port of manifest serializer)
// ---------------------------------------------------------------------------

export interface RecordlyEditorState {
  cursorMotionPresetId?: 'focused' | 'smooth';
  webcam?: {
    enabled?: boolean;
    positionPreset?: WebcamPositionPreset;
    sizePercent?: number;
    cropRegion?: Partial<CropRegion>;
    reactToZoom?: boolean;
  };
  export?: {
    quality?: ExportQuality;
    aspectRatio?: AspectRatio;
  };
  zoomRegions?: ZoomRegion[];
  audioRegions?: AudioRegion[];
}

export interface RecordlyManifestInput {
  sourcePath: string;
  editorState: RecordlyEditorState;
  durationMs?: number;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(',')}}`;
}

export function buildRecordlyManifest(input: RecordlyManifestInput): string {
  const manifest = {
    version: 1,
    kind: 'recordly-screenflow-studio',
    sourcePath: String(input.sourcePath ?? ''),
    durationMs: Number.isFinite(input.durationMs) ? Math.round(input.durationMs as number) : null,
    editorState: input.editorState ?? {},
  };
  return stableStringify(manifest);
}

// ---------------------------------------------------------------------------
// Aggregate planner (tool entry point helper)
// ---------------------------------------------------------------------------

export interface RecordlyPlanInput {
  sourcePath: string;
  durationMs?: number;
  cursorTelemetry?: CursorSample[];
  editorState?: RecordlyEditorState;
}

export function recordlyPlan(input: RecordlyPlanInput): {
  zoom: InteractionZoomSuggestionResult;
  manifest: string;
} {
  const zoom = buildInteractionZoomSuggestions({
    cursorTelemetry: input.cursorTelemetry ?? [],
    totalMs: input.durationMs ?? 0,
  });
  const manifest = buildRecordlyManifest({
    sourcePath: input.sourcePath,
    editorState: input.editorState ?? {},
    durationMs: input.durationMs,
  });
  return { zoom, manifest };
}
