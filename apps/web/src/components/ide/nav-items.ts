import {
  LayoutDashboard,
  Sparkles,
  Bot,
  Images,
  SquareDashedMousePointer,
  Cloud,
  BarChart3,
  FlaskConical,
  Map,
  Compass,
  BookOpen,
  PanelsTopLeft,
  PlugZap,
} from 'lucide-react';

/** Icono canónico de navegación (referencia tipada para no acoplar a LucideIcon). */
export type NavIcon = typeof LayoutDashboard;

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
}

/** Sección Workspace del shell IDE (orden estable del sidebar histórico). */
export const WORKSPACE_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/workspace', label: 'Workspace', icon: PanelsTopLeft },
  { href: '/studio', label: 'Studio', icon: Sparkles },
  { href: '/agents/new', label: 'New agent', icon: Bot },
  { href: '/gallery', label: 'Gallery', icon: Images },
  { href: '/builder', label: 'Builder', icon: SquareDashedMousePointer },
  { href: '/cloud', label: 'Cloud', icon: Cloud },
  { href: '/connections', label: 'Conexiones', icon: PlugZap },
  { href: '/metrics', label: 'Métricas', icon: BarChart3 },
  { href: '/lab', label: 'Lab', icon: FlaskConical },
  { href: '/roadmap', label: 'Roadmap', icon: Map },
];

/** Sección pública del shell IDE. */
export const PUBLIC_NAV_ITEMS: NavItem[] = [
  { href: '/explore', label: 'Explore', icon: Compass },
  { href: '/recursos', label: 'Recursos', icon: BookOpen },
];

/** Todas las entradas de navegación (rail + explorador + móvil). */
export const ALL_NAV_ITEMS: NavItem[] = [...WORKSPACE_ITEMS, ...PUBLIC_NAV_ITEMS];
