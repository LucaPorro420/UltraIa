import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Sun, Moon, Monitor, Search, Bell, ChevronDown, 
  Loader2, Bot, Zap, Plus, Menu, X
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import clsx from 'clsx';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Panel de Control',
  '/learn': 'Aprender',
  '/projects': 'Proyectos',
  '/agents': 'Agentes IA',
  '/ide': 'IDE Inteligente',
  '/chat': 'Chat IA',
  '/settings': 'Configuración',
};

export function TopBar() {
  const location = useLocation();
  const { user } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = false;
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const pageTitle = Object.entries(pageTitles).find(([path]) => 
    location.pathname === path || location.pathname.startsWith(path + '/')
  )?.[1] || 'Plataforma Total';

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  const toggleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    setTheme(themes[(currentIndex + 1) % themes.length]);
  };

  const handleGlobalSearch = async (query: string) => {
    if (!query.trim()) return;
    // In production, call search API
    console.log('Global search:', query);
    setSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <header className="fixed top-0 right-0 left-0 z-30 h-16 bg-canvas/95 backdrop-blur-sm border-b border-border flex items-center">
      {/* Left - Page Title */}
      <div className="flex-1 px-6">
        <h1 className="text-lg font-display font-semibold text-text-primary truncate">
          {pageTitle}
        </h1>
      </div>

      {/* Center - Global Search */}
      <div className="flex-1 max-w-xl mx-8">
        <div className="relative">
          <button
            onClick={() => setSearchOpen(true)}
            className={clsx(
              'w-full px-4 py-2 bg-canvas border border-border rounded-xl',
              'flex items-center gap-3 text-text-secondary placeholder:text-text-muted',
              'hover:border-primary/50 transition-colors',
              searchOpen && 'border-primary shadow-lg shadow-primary/10'
            )}
            aria-label="Buscar globalmente"
          >
            <Search className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{searchOpen ? 'Escribe para buscar...' : 'Buscar cursos, proyectos, agentes... (⌘K)'}</span>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-canvas border border-border rounded text-xs text-text-muted">
              <span className="text-primary">⌘</span>K
            </kbd>
          </button>

          {searchOpen && (
            <>
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGlobalSearch(searchQuery)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 100)}
                className="absolute inset-0 px-4 py-2 bg-transparent text-text-primary placeholder:text-text-muted focus:outline-none"
                placeholder="Buscar en toda la plataforma..."
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-2 px-6">
        {/* AI Quick Actions */}
        <div className="hidden sm:flex items-center gap-1 bg-canvas border border-border rounded-xl p-1">
          <button className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-border transition-colors" title="Nuevo agente">
            <Plus className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-border transition-colors" title="Orquestar tarea">
            <Zap className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-border transition-colors" title="Chat IA rápido">
            <Bot className="w-5 h-5" />
          </button>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-canvas border border-border text-text-secondary hover:text-text-primary hover:bg-border transition-colors"
          aria-label={`Tema actual: ${theme}. Click para cambiar.`}
        >
          {resolvedTheme === 'dark' ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-lg bg-canvas border border-border text-text-secondary hover:text-text-primary hover:bg-border transition-colors relative"
            aria-label="Notificaciones"
            aria-expanded={notificationsOpen}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-video text-white text-xs font-bold rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-panel border border-border rounded-xl shadow-lg overflow-hidden animate-slide-down">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold">Notificaciones</h3>
                <button className="text-sm text-primary hover:underline">Marcar todas como leídas</button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <NotificationItem 
                  title="Nuevo curso disponible" 
                  message="TypeScript Avanzado ya está disponible"
                  time="hace 2h"
                  unread
                />
                <NotificationItem 
                  title="Proyecto completado" 
                  message="Tu API REST con FastAPI está lista para revisar"
                  time="hace 5h"
                  unread
                />
                <NotificationItem 
                  title="Certificado emitido" 
                  message="Certificado de JavaScript Moderno generado"
                  time="hace 1d"
                />
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-canvas border border-border hover:bg-border transition-colors"
            aria-label="Menú de usuario"
            aria-expanded={userMenuOpen}
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-semibold text-sm">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-text-primary truncate max-w-[140px]">{user?.name}</p>
              <p className="text-xs text-text-muted truncate max-w-[140px]">{user?.email}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-text-muted" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-panel border border-border rounded-xl shadow-lg overflow-hidden animate-slide-down">
              <div className="p-3 border-b border-border">
                <p className="font-semibold text-sm">{user?.name}</p>
                <p className="text-xs text-text-muted truncate">{user?.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">{user?.level}</span>
                  <span className="px-2 py-0.5 text-xs bg-accent-text/10 text-accent-text rounded">{user?.xp} XP</span>
                </div>
              </div>
              <nav className="py-1">
                <UserMenuItem icon={GraduationCap} label="Mi Perfil" href="/settings/profile" />
                <UserMenuItem icon={Award} label="Logros" href="/settings/achievements" />
                <UserMenuItem icon={Flame} label="Racha: 12 días" disabled />
                <hr className="my-1 border-border" />
                <UserMenuItem icon={Settings} label="Configuración" href="/settings" />
                <hr className="my-1 border-border" />
                <UserMenuItem icon={LogOut} label="Cerrar sesión" onClick={() => {}} variant="destructive" />
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function NotificationItem({ title, message, time, unread }: { title: string; message: string; time: string; unread?: boolean }) {
  return (
    <div className={clsx('p-3 hover:bg-canvas/50 border-b border-border/50', unread && 'bg-primary/5')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={clsx('font-medium text-sm', unread && 'text-primary')}>{title}</p>
          <p className="text-xs text-text-muted mt-0.5 truncate">{message}</p>
        </div>
        <span className="text-xs text-text-muted whitespace-nowrap">{time}</span>
      </div>
    </div>
  );
}

function UserMenuItem({ icon: Icon, label, href, onClick, disabled, variant }: { 
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'destructive';
}) {
  const handleClick = () => {
    if (onClick) onClick();
    if (href) window.location.href = href;
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={clsx(
        'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors',
        'rounded-none hover:bg-canvas/50',
        variant === 'destructive' ? 'text-accent-video hover:bg-red-500/10' : 'text-text-secondary hover:text-text-primary',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </button>
  );
}

// Need to import these icons
import { GraduationCap, Flame, Award, Settings, LogOut } from 'lucide-react';