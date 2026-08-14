'use client';

import type { ReactNode } from 'react';
import { Copy, MousePointer2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BLOCK_DEFS } from './blocks';
import type { BuilderElement } from './blocks';

/* ============================================================
   Panel de propiedades del bloque seleccionado
   ============================================================ */

const inputCls =
  'h-8 w-full rounded-md border border-border-muted bg-input-active px-2.5 font-mono text-[12px] text-neutral-200 outline-none transition-colors duration-150 placeholder:text-neutral-600 hover:border-border-active focus:border-primary';

const selectCls =
  'h-8 w-full cursor-pointer rounded-md border border-border-muted bg-input-active px-2 font-mono text-[12px] text-neutral-200 outline-none transition-colors duration-150 hover:border-border-active focus:border-primary';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function TextControl({
  value,
  onChange,
  placeholder,
  textarea = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  if (textarea) {
    return (
      <textarea
        rows={3}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputCls, 'h-auto resize-y py-2 leading-relaxed')}
      />
    );
  }
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    />
  );
}

function SelectControl({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ColorControl({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#e5e5e5'}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-12 shrink-0 cursor-pointer rounded-md border border-border-muted bg-input-active p-0.5"
      />
      <div className="flex h-8 flex-1 items-center rounded-md border border-border-muted bg-input-active px-2.5 font-mono text-[12px] text-neutral-400">
        {value}
      </div>
    </div>
  );
}

function SliderControl({
  value,
  min,
  max,
  step = 1,
  suffix = 'px',
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  const num = Number.isFinite(value) ? value : min;
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, num))}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer accent-[#8b5cf6]"
      />
      <span className="w-14 shrink-0 text-right font-mono text-[11px] text-neutral-500">
        {num}
        {suffix}
      </span>
    </div>
  );
}

const ALIGN_OPTIONS = [
  { value: 'left', label: 'Izquierda' },
  { value: 'center', label: 'Centrado' },
  { value: 'right', label: 'Derecha' },
];

export function PropertyPanel({
  element,
  onPatch,
  onDuplicate,
  onDelete,
}: {
  element: BuilderElement | null;
  onPatch: (id: string, patch: Record<string, any>) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (!element) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <MousePointer2 className="h-6 w-6 text-neutral-700" />
        <p className="font-mono text-[10px] leading-relaxed text-neutral-600">
          Selecciona un bloque en el lienzo para editar sus propiedades
        </p>
      </div>
    );
  }

  const patch = (p: Record<string, any>) => onPatch(element.id, p);
  const p = element.props;
  const def = BLOCK_DEFS.find((d) => d.type === element.type);
  const Icon = def?.icon ?? MousePointer2;

  const fields: ReactNode[] = [];

  switch (element.type) {
    case 'heading':
      fields.push(
        <Field key="text" label="Contenido">
          <TextControl textarea value={p.text} onChange={(v) => patch({ text: v })} />
        </Field>,
        <Field key="size" label="Tamaño">
          <SelectControl
            value={p.size}
            options={[
              { value: 'h1', label: 'H1 · Título grande' },
              { value: 'h2', label: 'H2 · Título medio' },
              { value: 'h3', label: 'H3 · Subtítulo' },
            ]}
            onChange={(v) => patch({ size: v })}
          />
        </Field>,
        <Field key="align" label="Alineación">
          <SelectControl value={p.align} options={ALIGN_OPTIONS} onChange={(v) => patch({ align: v })} />
        </Field>,
        <Field key="color" label="Color">
          <ColorControl value={p.color} onChange={(v) => patch({ color: v })} />
        </Field>
      );
      break;
    case 'paragraph':
      fields.push(
        <Field key="text" label="Contenido">
          <TextControl textarea value={p.text} onChange={(v) => patch({ text: v })} />
        </Field>,
        <Field key="align" label="Alineación">
          <SelectControl value={p.align} options={ALIGN_OPTIONS} onChange={(v) => patch({ align: v })} />
        </Field>,
        <Field key="color" label="Color">
          <ColorControl value={p.color} onChange={(v) => patch({ color: v })} />
        </Field>
      );
      break;
    case 'button':
      fields.push(
        <Field key="text" label="Texto">
          <TextControl value={p.text} onChange={(v) => patch({ text: v })} />
        </Field>,
        <Field key="href" label="Enlace">
          <TextControl value={p.href} placeholder="https://…" onChange={(v) => patch({ href: v })} />
        </Field>,
        <Field key="variant" label="Variante">
          <SelectControl
            value={p.variant}
            options={[
              { value: 'primary', label: 'Primario · violeta' },
              { value: 'outline', label: 'Outline · borde' },
            ]}
            onChange={(v) => patch({ variant: v })}
          />
        </Field>,
        <Field key="radius" label="Radio">
          <SelectControl
            value={p.radius}
            options={[
              { value: 'sm', label: 'Pequeño' },
              { value: 'md', label: 'Medio' },
              { value: 'full', label: 'Píldora' },
            ]}
            onChange={(v) => patch({ radius: v })}
          />
        </Field>
      );
      break;
    case 'image':
      fields.push(
        <Field key="src" label="URL de la imagen">
          <TextControl value={p.src} placeholder="https://…" onChange={(v) => patch({ src: v })} />
        </Field>,
        <Field key="alt" label="Texto alternativo">
          <TextControl value={p.alt} onChange={(v) => patch({ alt: v })} />
        </Field>,
        <Field key="radius" label="Radio">
          <SelectControl
            value={p.radius}
            options={[
              { value: 'sm', label: 'Pequeño' },
              { value: 'md', label: 'Medio' },
              { value: 'lg', label: 'Grande' },
              { value: 'full', label: 'Círculo' },
            ]}
            onChange={(v) => patch({ radius: v })}
          />
        </Field>,
        <Field key="width" label="Ancho">
          <SliderControl value={p.width} min={10} max={100} suffix="%" onChange={(v) => patch({ width: v })} />
        </Field>
      );
      break;
    case 'link':
      fields.push(
        <Field key="text" label="Texto">
          <TextControl value={p.text} onChange={(v) => patch({ text: v })} />
        </Field>,
        <Field key="href" label="Enlace">
          <TextControl value={p.href} placeholder="https://…" onChange={(v) => patch({ href: v })} />
        </Field>,
        <Field key="size" label="Tamaño">
          <SelectControl
            value={p.size}
            options={[
              { value: 'sm', label: 'Pequeño' },
              { value: 'md', label: 'Medio' },
              { value: 'lg', label: 'Grande' },
            ]}
            onChange={(v) => patch({ size: v })}
          />
        </Field>
      );
      break;
    case 'spacer':
      fields.push(
        <Field key="height" label="Altura">
          <SliderControl value={p.height} min={8} max={400} suffix="px" onChange={(v) => patch({ height: v })} />
        </Field>
      );
      break;
    case 'columns':
      fields.push(
        <Field key="cols" label="Columnas">
          <SelectControl
            value={String(p.cols)}
            options={[
              { value: '2', label: '2 columnas' },
              { value: '3', label: '3 columnas' },
            ]}
            onChange={(v) => patch({ cols: Number(v) })}
          />
        </Field>,
        <Field key="gap" label="Separación">
          <SliderControl value={p.gap} min={0} max={64} suffix="px" onChange={(v) => patch({ gap: v })} />
        </Field>
      );
      break;
    case 'container':
      fields.push(
        <Field key="width" label="Ancho">
          <SelectControl
            value={p.width}
            options={[
              { value: 'boxed', label: 'Contenido · centrado' },
              { value: 'full', label: 'Ancho completo' },
            ]}
            onChange={(v) => patch({ width: v })}
          />
        </Field>,
        <Field key="padding" label="Padding">
          <SliderControl value={p.padding} min={0} max={96} suffix="px" onChange={(v) => patch({ padding: v })} />
        </Field>
      );
      break;
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-border-muted bg-panel-header/80 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="text-[12px] font-medium text-neutral-200">{def?.label}</span>
        <span className="ml-auto rounded bg-panel-hover px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-neutral-500">
          {element.type}
        </span>
      </div>

      <div className="space-y-3.5">{fields}</div>

      <div className="mt-5 flex gap-2 border-t border-border-subtle pt-3">
        <button
          type="button"
          onClick={() => onDuplicate(element.id)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border-muted py-1.5 font-mono text-[11px] text-neutral-300 transition-colors duration-150 hover:border-primary/50 hover:text-primary"
        >
          <Copy className="h-3 w-3" />
          Duplicar
        </button>
        <button
          type="button"
          onClick={() => onDelete(element.id)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border-muted py-1.5 font-mono text-[11px] text-neutral-300 transition-colors duration-150 hover:border-destructive/50 hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
          Eliminar
        </button>
      </div>
    </div>
  );
}