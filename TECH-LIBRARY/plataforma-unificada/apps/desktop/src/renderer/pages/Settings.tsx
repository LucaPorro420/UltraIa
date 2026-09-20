import React, { useState } from 'react';
import { 
  User, Bell, Shield, Palette, Globe, Database, 
  Key, Trash2, Save, Moon, Sun, Monitor, 
  ChevronRight, ToggleLeft, ToggleRight, Bell as BellIcon,
  Download, Upload, RefreshCw, Info, AlertTriangle
} from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '../hooks/useTheme';

const settingsSections = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'appearance', label: 'Apariencia', icon: Palette },
  { id: 'notifications', label: 'Notificaciones', icon: BellIcon },
  { id: 'ai', label: 'IA & Agentes', icon: Brain },
  { id: 'privacy', label: 'Privacidad', icon: Shield },
  { id: 'data', label: 'Datos', icon: Database },
  { id: 'advanced', label: 'Avanzado', icon: Settings },
];

export function Settings() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('profile');
  const [notifications, setNotifications] = useState({ email: true, push: true, quiz: true, streak: true, updates: false });
  const [aiSettings, setAiSettings] = useState({ model: 'auto', temperature: 0.7, maxTokens: 4096, autoOrchestrate: true });
  const [privacy, setPrivacy] = useState({ analytics: true, crashReports: true, telemetry: false });

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className="w-64 bg-panel border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="font-display font-bold text-lg">Configuración</h2>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {settingsSections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                activeSection === section.id
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-text-secondary hover:bg-cactus hover:text-text-primary'
              )}
            >
              <section.icon className="w-5 h-5 flex-shrink-0" />
              <span>{section.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="text-xs text-text-muted">Versión 1.0.0-beta</div>
          <div className="text-xs text-text-muted mt-1">Plataforma Total Unificada</div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-8">
          {/* Profile */}
          {activeSection === 'profile' && (
            <SettingsSection title="Perfil" description="Gestiona tu información personal y cuenta">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary font-bold text-3xl">JD</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Juan Developer</h3>
                  <p className="text-text-muted">juan@ejemplo.com</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">💎 PRO</span>
                    <span className="px-3 py-1 bg-accent-text/10 text-accent-text rounded-full text-sm font-medium">Nivel: Intermedio</span>
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <SettingInput label="Nombre" value="Juan Developer" />
                <SettingInput label="Email" value="juan@ejemplo.com" type="email" />
                <SettingInput label="Contraseña nueva" type="password" placeholder="••••••••" />
                <SettingInput label="Confirmar contraseña" type="password" placeholder="••••••••" />
              </div>
              <button className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-light flex items-center gap-2">
                <Save className="w-4 h-4" />
                Guardar cambios
              </button>
            </SettingsSection>
          )}

          {/* Appearance */}
          {activeSection === 'appearance' && (
            <SettingsSection title="Apariencia" description="Personaliza el aspecto de la plataforma">
              <SettingCard title="Tema" description="Elige el modo de color de la interfaz">
                <div className="grid grid-cols-3 gap-3">
                  {(['light', 'dark', 'system'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={clsx(
                        'p-4 rounded-xl border-2 transition-all',
                        theme === t ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className={clsx('w-12 h-12 rounded-lg mx-auto mb-2', 
                        t === 'light' ? 'bg-white border' : 
                        t === 'dark' ? 'bg-canvas border-border' : 
                        'bg-gradient-to-r from-white to-canvas border'
                      )} />
                      <p className="text-center capitalize font-medium">{t === 'system' ? 'Sistema' : t}</p>
                    </button>
                  ))}
                </div>
              </SettingCard>
              
              <SettingCard title="Densidad" description="Espaciado de la interfaz">
                <div className="flex gap-3">
                  {['compact', 'comfortable', 'spacious'].map(d => (
                    <button key={d} className="flex-1 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
                      <p className="font-medium capitalize">{d}</p>
                      <p className="text-xs text-text-muted">Espaciado {d === 'compact' ? 'reducido' : d === 'comfortable' ? 'normal' : 'amplio'}</p>
                    </button>
                  ))}
                </div>
              </SettingCard>
            </SettingsSection>
          )}

          {/* Notifications */}
          {activeSection === 'notifications' && (
            <SettingsSection title="Notificaciones" description="Configura cómo y cuándo recibes alertas">
              <SettingToggle label="Notificaciones por email" description="Recibir resúmenes semanales y alertas importantes" value={notifications.email} onChange={v => setNotifications({...notifications, email: v})} />
              <SettingToggle label="Notificaciones push" description="Alertas en tiempo real en el navegador" value={notifications.push} onChange={v => setNotifications({...notifications, push: v})} />
              <SettingToggle label="Recordatorios de quiz" description="Avisar cuando hay quizzes pendientes" value={notifications.quiz} onChange={v => setNotifications({...notifications, quiz: v})} />
              <SettingToggle label="Recordatorio de racha" description="Notificar si rompes tu racha diaria" value={notifications.streak} onChange={v => setNotifications({...notifications, streak: v})} />
              <SettingToggle label="Actualizaciones de la app" description="Avisar cuando hay nueva versión" value={notifications.updates} onChange={v => setNotifications({...notifications, updates: v})} />
            </SettingsSection>
          )}

          {/* AI Settings */}
          {activeSection === 'ai' && (
            <SettingsSection title="IA & Agentes" description="Configura el comportamiento de la inteligencia artificial">
              <SettingCard title="Modelo por defecto" description="Modelo que se usa para chat y tareas">
                <select className="w-full max-w-xs px-3 py-2 bg-canvas border border-border rounded-lg" defaultValue="auto">
                  <option value="auto">🤖 Auto (FreeLLMAPI - 34 proveedores)</option>
                  <option value="auto:coding">💻 Auto Coding</option>
                  <option value="auto:general">💬 Auto General</option>
                  <option value="fusion">🔮 Fusion Multi-Model</option>
                </select>
              </SettingCard>
              
              <SettingCard title="Temperatura" description="Creatividad de las respuestas (0 = determinista, 1 = creativo)">
                <input type="range" min="0" max="1" step="0.1" defaultValue={0.7} className="w-full max-w-xs" />
                <div className="flex justify-between text-sm text-text-muted mt-1">
                  <span>Determinista (0)</span>
                  <span>Creativo (1)</span>
                </div>
              </SettingCard>
              
              <SettingCard title="Tokens máximos" description="Longitud máxima de respuesta">
                <input type="number" min="512" max="8192" step="512" defaultValue={4096} className="w-full max-w-xs px-3 py-2 bg-canvas border border-border rounded-lg" />
              </SettingCard>
              
              <SettingToggle label="Orquestación automática" description="Permitir que los agentes inicien tareas automáticamente" value={aiSettings.autoOrchestrate} onChange={v => setAiSettings({...aiSettings, autoOrchestrate: v})} />
              <SettingToggle label="Human-in-the-loop" description="Pedir confirmación antes de acciones críticas" value={true} onChange={() => {}} />
            </SettingsSection>
          )}

          {/* Privacy */}
          {activeSection === 'privacy' && (
            <SettingsSection title="Privacidad & Seguridad" description="Controla tus datos y permisos">
              <SettingToggle label="Analytics anónimos" description="Ayuda a mejorar la plataforma" value={privacy.analytics} onChange={v => setPrivacy({...privacy, analytics: v})} />
              <SettingToggle label="Reportes de errores" description="Enviar crashes automáticamente" value={privacy.crashReports} onChange={v => setPrivacy({...privacy, crashReports: v})} />
              <SettingToggle label="Telemetría de uso" description="Datos de uso de características" value={privacy.telemetry} onChange={v => setPrivacy({...privacy, telemetry: v})} />
              
              <SettingCard title="Sesiones activas" description="Dispositivos donde has iniciado sesión">
                <div className="space-y-2">
                  <SessionRow current={true} device="Windows Desktop" location="Madrid, España" time="Actual" />
                  <SessionRow device="Chrome en Windows" location="Madrid, España" time="Hace 2 horas" />
                  <SessionRow device="Firefox en Linux" location="Barcelona, España" time="Hace 3 días" />
                </div>
              </SettingCard>
            </SettingsSection>
          )}

          {/* Data */}
          {activeSection === 'data' && (
            <SettingsSection title="Gestión de Datos" description="Exporta, importa o elimina tus datos">
              <div className="grid md:grid-cols-2 gap-4">
                <ActionCard 
                  icon={Download} 
                  title="Exportar datos" 
                  description="Descarga todo tu progreso, certificados y configuración en JSON"
                  action="Exportar"
                  variant="primary"
                />
                <ActionCard 
                  icon={Upload} 
                  title="Importar datos" 
                  description="Restaura tu progreso desde un archivo de exportación anterior"
                  action="Importar"
                  variant="secondary"
                />
                <ActionCard 
                  icon={RefreshCw} 
                  title="Sincronizar ahora" 
                  description="Fuerza sincronización con la nube (si está configurada)"
                  action="Sincronizar"
                  variant="secondary"
                />
                <ActionCard 
                  icon={Trash2} 
                  title="Eliminar cuenta" 
                  description="Borra permanentemente tu cuenta y todos los datos"
                  action="Eliminar"
                  variant="destructive"
                />
              </div>
              
              <SettingCard title="Almacenamiento local" description="Uso de espacio en disco">
                <div className="space-y-3">
                  <StorageBar label="Base de datos principal" used={45} total={100} unit="MB" />
                  <StorageBar label="Cache de IA" used={120} total={500} unit="MB" />
                  <StorageBar label="Certificados PDF" used={8} total={50} unit="MB" />
                  <StorageBar label="Logs y cache" used={25} total={100} unit="MB" />
                </div>
              </SettingCard>
            </SettingsSection>
          )}

          {/* Advanced */}
          {activeSection === 'advanced' && (
            <SettingsSection title="Avanzado" description="Configuraciones para usuarios expertos">
              <SettingCard title="Modo desarrollador" description="Activa herramientas de depuración y logging detallado">
                <SettingToggle label="Modo desarrollador" value={false} onChange={() => {}} />
                <SettingToggle label="Logs verbosos" value={false} onChange={() => {}} />
                <SettingToggle label="Panel de rendimiento" value={false} onChange={() => {}} />
              </SettingCard>
              
              <SettingCard title="FreeLLMAPI Gateway" description="Configuración del gateway de IA">
                <SettingInput label="URL del Gateway" value="http://localhost:3001" />
                <SettingInput label="API Key (opcional)" type="password" placeholder="••••••••" />
                <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light">Probar conexión</button>
              </SettingCard>
              
              <SettingCard title="Ollama (Fallback local)" description="Modelos locales para modo offline">
                <SettingInput label="URL Ollama" value="http://localhost:11434" />
                <SettingInput label="Modelo por defecto" value="llama3.1:8b" />
                <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light">Detectar modelos</button>
              </SettingCard>
              
              <div className="border-t border-border pt-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-accent-video" />
                  Zona de Peligro
                </h3>
                <ActionCard 
                  icon={Trash2} 
                  title="Restablecer configuración" 
                  description="Vuelve todos los ajustes a valores por defecto"
                  action="Restablecer"
                  variant="destructive"
                />
                <ActionCard 
                  icon={Trash2} 
                  title="Limpiar cache y datos temporales" 
                  description="Libera espacio eliminando archivos temporales"
                  action="Limpiar"
                  variant="secondary"
                />
              </div>
            </SettingsSection>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="bg-panel border border-border rounded-2xl p-6 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-display font-bold">{title}</h2>
        <p className="text-text-secondary mt-1">{description}</p>
      </div>
      {children}
    </div>
  );
}

function SettingCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="bg-cactus/50 rounded-xl p-5">
      <div className="mb-4">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-text-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}

function SettingInput({ label, value, type = 'text', placeholder, onChange }: { label: string; value?: string; type?: string; placeholder?: string; onChange?: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-text-secondary">{label}</label>
      <input type={type} defaultValue={value} placeholder={placeholder} className="w-full px-3 py-2 bg-canvas border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" onChange={e => onChange?.(e.target.value)} />
    </div>
  );
}

function SettingToggle({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-text-muted">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={clsx('relative w-11 h-6 rounded-full transition-colors', value ? 'bg-primary' : 'bg-border')}
        role="switch"
        aria-checked={value}
      >
        <span className={clsx('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', value ? 'translate-x-5' : 'translate-x-0.5')} />
      </button>
    </div>
  );
}

function SessionRow({ current, device, location, time }: { current?: boolean; device: string; location: string; time: string }) {
  return (
    <div className={clsx('flex items-center justify-between p-3 rounded-lg', current && 'bg-primary/5 border border-primary/20')}>
      <div className="flex items-center gap-3">
        <Monitor className="w-5 h-5 text-text-muted" />
        <div>
          <p className="font-medium flex items-center gap-2">{device} {current && <span className="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded">Actual</span>}</p>
          <p className="text-sm text-text-muted">{location}</p>
        </div>
      </div>
      <span className="text-xs text-text-muted">{time}</span>
    </div>
  );
}

function ActionCard({ icon: Icon, title, description, action, variant }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string; action: string; variant: 'primary' | 'secondary' | 'destructive' }) {
  const variantClasses: Record<string, string> = {
    primary: 'bg-primary text-white hover:bg-primary-light',
    secondary: 'bg-panel border border-border text-text-primary hover:bg-cactus',
    destructive: 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20',
  };

  return (
    <button className={clsx('p-5 rounded-xl text-left transition-colors', variantClasses[variant])}>
      <Icon className={clsx('w-6 h-6 mb-3', variant === 'primary' ? 'text-white' : variant === 'destructive' ? 'text-red-500' : 'text-primary')} />
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm opacity-80 mb-4">{description}</p>
      <span className="text-sm font-medium">{action} →</span>
    </button>
  );
}

function StorageBar({ label, used, total, unit }: { label: string; used: number; total: number; unit: string }) {
  const percent = Math.round((used / total) * 100);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium">{label}</span>
        <span className="text-text-muted">{used}/{total} {unit} ({percent}%)</span>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}