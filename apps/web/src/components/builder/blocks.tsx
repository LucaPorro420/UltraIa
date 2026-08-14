'use client';

import type { ComponentType, ReactNode } from 'react';
import Image from 'next/image';
import {
  AlignLeft,
  Image as ImageIcon,
  LayoutTemplate,
  Link2,
  MousePointer2,
  Move,
  Square,
  Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ============================================================
   Tipos y definiciones de bloques del UltraIa Builder
   ============================================================ */

export type BlockType =
  | 'heading'
  | 'paragraph'
  | 'button'
  | 'image'
  | 'link'
  | 'spacer'
  | 'columns'
  | 'container';

export interface BuilderElement {
  id: string;
  type: BlockType;
  props: Record<string, any>;
}

export interface BlockDef {
  type: BlockType;
  label: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
}

export const BLOCK_DEFS: BlockDef[] = [
  { type: 'heading', label: 'Título', hint: 'Encabezado de sección', icon: Type },
  { type: 'paragraph', label: 'Párrafo', hint: 'Texto descriptivo', icon: AlignLeft },
  { type: 'button', label: 'Botón', hint: 'Llamada a la acción', icon: MousePointer2 },
  { type: 'image', label: 'Imagen', hint: 'Imagen con radio y ancho', icon: ImageIcon },
  { type: 'link', label: 'Enlace', hint: 'Enlace de texto', icon: Link2 },
  { type: 'spacer', label: 'Separador', hint: 'Espacio vertical', icon: Move },
  { type: 'columns', label: 'Columnas', hint: 'Rejilla de 2 o 3 columnas', icon: LayoutTemplate },
  { type: 'container', label: 'Contenedor', hint: 'Caja con padding y ancho', icon: Square },
];

const PLACEHOLDER_IMG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600"><rect width="1200" height="600" fill="#18181f"/><rect x="0" y="0" width="1200" height="2" fill="#2e2e3d"/><text x="50%" y="50%" font-family="monospace" font-size="44" fill="#8b5cf6" text-anchor="middle" dominant-baseline="middle">Imagen</text></svg>`
)}`;

export const BLOCK_DEFAULTS: Record<BlockType, Record<string, any>> = {
  heading: { text: 'Título de la sección', size: 'h2', align: 'left', color: '#f5f5f5' },
  paragraph: { text: 'Escribe aquí una descripción de tu producto o servicio…', align: 'left', color: '#a3a3a3' },
  button: { text: 'Comenzar', href: '#', variant: 'primary', radius: 'md' },
  image: { src: PLACEHOLDER_IMG, alt: 'Imagen de ejemplo', radius: 'md', width: 100 },
  link: { text: 'Saber más', href: '#', size: 'md' },
  spacer: { height: 48 },
  columns: { cols: 2, gap: 24, children: [] as BuilderElement[] },
  container: { width: 'boxed', padding: 48, children: [] as BuilderElement[] },
};

export function uid(): string {
  const c = crypto as Crypto & { randomUUID?: () => string };
  if (typeof c.randomUUID === 'function') return c.randomUUID();
  return `el_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createBlock(type: BlockType): BuilderElement {
  return { id: uid(), type, props: JSON.parse(JSON.stringify(BLOCK_DEFAULTS[type])) };
}

export function isContainerType(type: BlockType): boolean {
  return type === 'columns' || type === 'container';
}

export function blockChildren(el: BuilderElement): BuilderElement[] {
  return Array.isArray(el.props.children) ? (el.props.children as BuilderElement[]) : [];
}

/* ============================================================
   Renderizado en vivo de cada bloque (preview del lienzo)
   ============================================================ */

function radiusClass(radius: string, kind: 'button' | 'image'): string {
  if (kind === 'button') {
    if (radius === 'sm') return 'rounded-md';
    if (radius === 'full') return 'rounded-full';
    return 'rounded-[10px]';
  }
  if (radius === 'sm') return 'rounded-md';
  if (radius === 'lg') return 'rounded-xl';
  if (radius === 'full') return 'rounded-full';
  return 'rounded-lg';
}

function alignClass(align: string): string {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
}

export function BlockBody({ element, children }: { element: BuilderElement; children?: ReactNode }) {
  const p = element.props;

  switch (element.type) {
    case 'heading': {
      const Tag = p.size === 'h1' ? 'h1' : p.size === 'h3' ? 'h3' : 'h2';
      const size = p.size === 'h1' ? 'text-4xl' : p.size === 'h3' ? 'text-2xl' : 'text-3xl';
      return (
        <Tag
          className={cn('font-display font-bold tracking-tight', size)}
          style={{ textAlign: p.align, color: p.color }}
        >
          {p.text}
        </Tag>
      );
    }
    case 'paragraph':
      return (
        <p className="text-[14px] leading-relaxed" style={{ textAlign: p.align, color: p.color }}>
          {p.text}
        </p>
      );
    case 'button': {
      const variant =
        p.variant === 'outline'
          ? 'border border-border-muted text-neutral-100 hover:border-primary hover:text-primary'
          : 'bg-primary text-white hover:bg-[#7c3aed]';
      return (
        <a
          href={p.href}
          className={cn(
            'inline-flex items-center justify-center px-5 py-2.5 text-[13px] font-semibold transition-colors duration-150',
            variant,
            radiusClass(p.radius, 'button')
          )}
        >
          {p.text}
        </a>
      );
    }
    case 'image':
      return (
        <Image
          src={p.src}
          alt={p.alt}
          unoptimized
          className={cn('block max-w-full', radiusClass(p.radius, 'image'))}
          style={{ width: `${p.width}%` }}
        />
      );
    case 'link': {
      const size = p.size === 'sm' ? 'text-[12px]' : p.size === 'lg' ? 'text-[16px]' : 'text-[14px]';
      return (
        <a href={p.href} className={cn('font-medium text-primary hover:underline', size)}>
          {p.text}
        </a>
      );
    }
    case 'spacer':
      return <div aria-hidden className="w-full" style={{ height: p.height }} />;
    case 'columns':
      return (
        <div
          className="grid w-full"
          style={{ gridTemplateColumns: `repeat(${p.cols}, minmax(0, 1fr))`, gap: p.gap }}
        >
          {children}
        </div>
      );
    case 'container':
      return (
        <div
          className={p.width === 'boxed' ? 'mx-auto w-full max-w-5xl' : 'w-full'}
          style={{ padding: p.padding }}
        >
          {children}
        </div>
      );
  }
}
