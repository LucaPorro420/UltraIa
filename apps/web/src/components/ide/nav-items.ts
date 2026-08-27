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
  Boxes,
} from 'lucide-react';

/** Icono canonico de navegacion (referencia tipada para no acoplar a LucideIcon). */
export type NavIcon = typeof LayoutDashboard;

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
}

/** Seccion Workspace del shell IDE (orden estable del sidebar historico). */
export const WORKSPACE_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/workspace', label: 'Workspace', icon: PanelsTopLeft },
  { href: '/studio', label: 'Studio', icon: Sparkles },
  { href: '/agents/new', label: 'New agent', icon: Bot },
  { href: '/gallery', label: 'Gallery', icon: Images },
  { href: '/builder', label: 'Builder', icon: SquareDashedMousePointer },
  { href: '/herramientas', label: 'Herramientas', icon: Boxes },
  { href: '/cloud', label: 'Cloud', icon: Cloud },
  { href: '/connections', label: 'Conexiones', icon: PlugZap },
  { href: '/metrics', label: 'Metricas', icon: BarChart3 },
  { href: '/lab', label: 'Lab', icon: FlaskConical },
  { href: '/roadmap', label: 'Roadmap', icon: Map },
];

/** Seccion publica del shell IDE. */
export const PUBLIC_NAV_ITEMS: NavItem[] = [
  { href: '/explore', label: 'Explore', icon: Compass },
  { href: '/recursos', label: 'Recursos', icon: BookOpen },
];

/** Todas las entradas de navegacion (rail + explorador + movil). */
export const ALL_NAV_ITEMS: NavItem[] = [...WORKSPACE_ITEMS, ...PUBLIC_NAV_ITEMS];
