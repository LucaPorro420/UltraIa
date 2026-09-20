import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, BookOpen, FolderGit, Bot, Code, MessageSquare, Settings, 
  Flame, Award, Zap, GraduationCap, ChevronRight, Menu, X
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import clsx from 'clsx';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, label: 'Panel de Control' },
  { name: 'Aprender', href: '/learn', icon: BookOpen, label: 'Cursos y Rutas' },
  { name: 'Proyectos', href: '/projects', icon: FolderGit, label: 'Mis Proyectos' },
  { name: 'Agentes', href: '/agents', icon: Bot, label: 'Orquestación IA' },
  { name: 'IDE', href: '/ide', icon: Code, label: 'Editor Inteligente' },
  { name: 'Chat IA', href: '/chat', icon: MessageSquare, label: 'Asistente IA' },
  { name: 'Configuración', href: '/settings', icon: Settings, label: 'Ajustes' },
];

const stats = [
  { label: 'Racha', value: '12', icon: Flame, color: 'text-accent-video' },
  { label: 'XP', value: '2,847', icon: Award, color: 'text-accent-text' },
  { label: 'Nivel', value: 'Intermedio', icon: GraduationCap, color: 'text-primary' },
];

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={clsx(
      'fixed left-0 top-0 z-40 h-full bg-panel border-r border-border transition-all duration-300',
      collapsed ? 'w-20' : 'w-72'
    )}>
      {/* Logo */}
      <div className={clsx('flex items-center justify-between h-16 px-4 border-b border-border', collapsed && 'justify-center')}>
        {!collapsed && (
          <NavLink to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display font-bold text-xl text-primary">Plataforma Total</span>
          </NavLink>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-canvas transition-colors"
          aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Navegación principal">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                'group',
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-canvas',
                collapsed && 'justify-center'
              )}
              title={collapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              {!collapsed && <span className="font-medium">{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User Stats */}
      {!collapsed && user && (
        <div className="p-3 border-t border-border">
          <div className="grid grid-cols-3 gap-2 mb-3">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-canvas/50 rounded-xl p-3 text-center">
                <stat.icon className={clsx('w-5 h-5 mx-auto mb-1', stat.color)} />
                <div className="font-display font-bold text-sm">{stat.value}</div>
                <div className="text-xs text-text-muted">{stat.label}</div>
              </div>
            ))}
          </div>
          
          <div className="flex items-center gap-3 p-2 bg-canvas/50 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-semibold text-sm">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{user.name}</p>
              <p className="text-xs text-text-muted truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed stats */}
      {collapsed && user && (
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border bg-panel/95 backdrop-blur">
          <div className="flex justify-center gap-1">
            {stats.map((stat) => (
              <div key={stat.label} className="px-2 py-1 bg-canvas/50 rounded-lg" title={`${stat.label}: ${stat.value}`}>
                <stat.icon className={clsx('w-4 h-4 mx-auto', stat.color)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}