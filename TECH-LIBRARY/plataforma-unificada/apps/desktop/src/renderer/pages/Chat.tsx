import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Send, Mic, Paperclip, Settings, ChevronDown,
  Copy, ThumbsUp, ThumbsDown, Regenerate, Code, FileText,
  Sparkles, Zap, Brain, MessageSquare
} from 'lucide-react';
import clsx from 'clsx';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    model?: string;
    tokens?: number;
    agentUsed?: string;
  };
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const mockSessions: ChatSession[] = [
  { id: '1', title: 'Explicar closures en JS', messages: [], createdAt: new Date('2024-01-15'), updatedAt: new Date('2024-01-15') },
  { id: '2', title: 'Debuggear error TypeScript', messages: [], createdAt: new Date('2024-01-14'), updatedAt: new Date('2024-01-14') },
  { id: '3', title: 'Generar quiz de React', messages: [], createdAt: new Date('2024-01-13'), updatedAt: new Date('2024-01-13') },
];

const quickPrompts = [
  { icon: Sparkles, label: 'Explicar concepto', prompt: 'Explícame el concepto de...' },
  { icon: Bug, label: 'Debuggear código', prompt: 'Ayúdame a debuggear este error: ' },
  { icon: FileText, label: 'Generar quiz', prompt: 'Crea un quiz sobre...' },
  { icon: Code, label: 'Escribir código', prompt: 'Escribe una función que...' },
  { icon: Zap, label: 'Iniciar proyecto', prompt: 'Quiero construir una app de...' },
  { icon: Brain, label: 'Recomendar ruta', prompt: '¿Qué debería aprender después de...?' },
];

export function Chat() {
  const [sessions, setSessions] = useState<ChatSession[]>(mockSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>('1');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'assistant', content: '🤖 Hola, soy tu IA Total Local. Con FreeLLMAPI te respondo con 34 proveedores gratuitos; sin él, con cerebro offline. Pídeme errores, código, qué estudiar hoy, quizzes, proyectos...', timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [model, setModel] = useState('auto');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateAIResponse(userInput),
        timestamp: new Date(),
        metadata: { model: 'free-llmapi/auto', tokens: 150 },
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const generateAIResponse = (userInput: string): string => {
    const lower = userInput.toLowerCase();
    if (lower.includes('error') || lower.includes('bug') || lower.includes('falla')) {
      return `🛠 **Depuración express:**\n1) Lee el ÚLTIMO mensaje de error completo.\n2) Imprime/pinta variables justo antes del fallo.\n3) Reproduce el error en un ejemplo mínimo.\n4) Pégalo aquí: te explico causa y fix.\n\n¿Qué error tienes?`;
    }
    if (lower.includes('qué hago') || lower.includes('estudio') || lower.includes('aprender')) {
      return `🧭 **¿QUÉ ESTUDIAR HOY?** (recomendador IA)\n\n🏵 Prioridad 1: Tienes 3 quizzes a menos del 100%. Reintentarlos vale más que lecciones nuevas.\n📚 Prioridad 2: Continúa "JavaScript Moderno" con "Async/Await y Promesas".\n🍅 Prioridad 3: Mínimo 2 pomodoros hoy. Racha actual: 🔥 12 día(s).`;
    }
    if (lower.includes('quiz')) {
      return `📝 Genera quizzes automáticos en 📚 Aprender → botón 📝 Quiz (cada lección incluye el suyo).\nCon FreeLLMAPI activo, 🤖 Quiz con IA crea preguntas extra de la lección abierta.`;
    }
    return `🤖 Entendido: "${userInput}". Como tu asistente IA con FreeLLMAPI (34 proveedores, 7.4B tokens/mes), puedo ayudarte a:\n\n• **Explicar** cualquier concepto adaptado a tu nivel\n• **Debuggear** errores pegando el traceback\n• **Generar** quizzes, tests, ejercicios\n• **Escribir** código, tests, docs\n• **Orquestar** agentes para proyectos completos\n• **Recomendar** qué estudiar hoy\n\n¿En qué te ayudo?`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const newChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'Nuevo chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setMessages([]);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-cactus transition-colors lg:hidden">
            <MessageSquare className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-xl">Chat IA</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={model} onChange={(e) => setModel(e.target.value)} className="px-3 py-1.5 bg-panel border border-border rounded-lg text-sm">
            <option value="auto">🤖 Auto (FreeLLMAPI)</option>
            <option value="auto:coding">💻 Coding</option>
            <option value="auto:general">💬 General</option>
            <option value="fusion">🔮 Fusion Multi-Model</option>
          </select>
          <button className="p-2 rounded-lg hover:bg-cactus transition-colors" title="Configuración"><Settings className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Sessions */}
        {sidebarOpen && (
          <div className="w-72 lg:block hidden border-r border-border flex flex-col">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">Conversaciones</h3>
              <button onClick={newChat} className="p-1.5 rounded-lg hover:bg-cactus transition-colors" title="Nuevo chat">
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  className={clsx(
                    'w-full text-left p-3 rounded-xl transition-colors',
                    activeSessionId === session.id
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'hover:bg-cactus text-text-secondary'
                  )}
                >
                  <p className="font-medium text-sm truncate">{session.title}</p>
                  <p className="text-xs text-text-muted mt-1">{session.updatedAt.toLocaleDateString()}</p>
                </button>
              ))}
              <button onClick={newChat} className="mx-2 mb-4 px-3 py-2 border border-dashed border-border rounded-xl text-text-muted hover:border-primary hover:text-primary transition-colors w-full">
                + Nueva conversación
              </button>
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg, i) => (
              <ChatMessage key={msg.id} message={msg} index={i} />
            ))}
            {isLoading && (
              <div className="flex gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-panel border border-border rounded-2xl p-4 max-w-2xl">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 1 && (
            <div className="p-6 border-t border-border">
              <h3 className="font-semibold mb-4">Acciones rápidas</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {quickPrompts.map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(qp.prompt); textareaRef.current?.focus(); }}
                    className="flex items-center gap-2 p-3 bg-panel border border-border rounded-xl hover:border-primary/50 hover:bg-cactus transition-colors text-left"
                  >
                    <qp.icon className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">{qp.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe tu mensaje... (Enter para enviar, Shift+Enter para nueva línea)"
                  className="w-full px-4 py-3 bg-panel border border-border rounded-2xl text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary focus:border-transparent resize-none min-h-[50px] max-h-[200px]"
                  rows={1}
                />
                <div className="absolute bottom-2 right-2 flex items-center gap-1">
                  <button className="p-2 rounded-lg hover:bg-cactus transition-colors" title="Adjuntar archivo"><Paperclip className="w-4 h-4" /></button>
                  <button className="p-2 rounded-lg hover:bg-cactus transition-colors" title="Voz"><Mic className="w-4 h-4" /></button>
                </div>
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-3 bg-primary text-white rounded-xl hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({ message, index }: { message: ChatMessage; index: number }) {
  return (
    <div className={clsx('flex gap-3 animate-fade-in', message.role === 'user' && 'flex-row-reverse')}>
      <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', message.role === 'user' ? 'bg-primary/10' : 'bg-primary/10')}>
        {message.role === 'user' ? (
          <span className="text-primary font-semibold text-sm">U</span>
        ) : (
          <Bot className="w-4 h-4 text-primary" />
        )}
      </div>
      <div className={clsx('max-w-[70%]', message.role === 'user' ? 'text-right' : '')}>
        <div className={clsx(
          'rounded-2xl p-4',
          message.role === 'user' 
            ? 'bg-primary text-white rounded-br-md' 
            : 'bg-panel border border-border rounded-bl-md'
        )}>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap {message.role === 'user' ? 'prose-invert' : ''}">
            {message.content}
          </div>
          {message.metadata && (
            <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
              <span>Modelo: {message.metadata.model}</span>
              <span>Tokens: ~{message.metadata.tokens}</span>
              {message.metadata.agentUsed && <span>Agente: {message.metadata.agentUsed}</span>}
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <button className="p-1.5 rounded hover:bg-cactus transition-colors" title="Copiar"><Copy className="w-4 h-4" /></button>
            <button className="p-1.5 rounded hover:bg-cactus transition-colors" title="Regenerar"><Regenerate className="w-4 h-4" /></button>
            <button className="p-1.5 rounded hover:bg-cactus transition-colors" title="Útil"><ThumbsUp className="w-4 h-4" /></button>
            <button className="p-1.5 rounded hover:bg-cactus transition-colors" title="No útil"><ThumbsDown className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}