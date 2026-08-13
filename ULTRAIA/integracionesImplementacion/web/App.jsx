import React, { useState } from 'react';
import config from './ai_platform_config.json'; // Importamos el archivo JSON

export default function SynapseFlowApp() {
  const [activeTab, setActiveTab] = useState(config.zipStructure[0].id);

  return (
    <div className="min-h-screen text-white font-sans bg-[#0B0F19]">
      
      {/* 1. HERO SECTION DINÁMICA */}
      <header className="relative flex flex-col items-center justify-center px-6 py-32 overflow-hidden text-center">
        {/* Elemento decorativo de fondo (Simulación de red neuronal) */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#3B82F6] via-[#0B0F19] to-transparent"></div>
        
        <h1 className="relative z-10 text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          {config.platformName}
        </h1>
        <p className="relative z-10 mt-6 text-xl text-gray-300 max-w-2xl">
          {config.meta.description}
        </p>
        <div className="relative z-10 mt-10 flex gap-4">
          <button className="px-8 py-3 text-lg font-semibold bg-blue-600 rounded-full hover:bg-blue-500 transition-all shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            Descargar ZIP de Recursos
          </button>
          <button className="px-8 py-3 text-lg font-semibold text-blue-400 border border-blue-600 rounded-full hover:bg-blue-900/30 transition-all">
            Inicializar Demo
          </button>
        </div>
      </header>

      {/* 2. SECCIÓN MODULAR DE RECURSOS (Consumiendo el JSON) */}
      <main className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold mb-8 text-center border-b border-gray-800 pb-4">
          Explorador de Arquitectura (ZIP)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {config.zipStructure.map((folder) => (
            <div 
              key={folder.id} 
              className="p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-blue-500 transition-colors cursor-pointer group"
            >
              <h3 className="text-xl font-bold text-emerald-400 mb-4 group-hover:text-blue-400">
                {folder.title}
              </h3>
              
              <div className="mb-4">
                <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">Subcarpetas:</span>
                <ul className="mt-2 space-y-1">
                  {folder.subfolders.map((sub, idx) => (
                    <li key={idx} className="text-sm text-gray-300 flex items-center">
                      <span className="mr-2 text-blue-500">📁</span> {sub}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">Recursos Clave:</span>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  {folder.resources.map((res, idx) => (
                    <li key={idx} className="text-sm text-gray-400">{res}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* 3. FOOTER TÉCNICO */}
      <footer className="text-center py-8 text-gray-500 text-sm border-t border-gray-900 mt-12">
        <p>Stack tecnológico sugerido: {config.webDesignConcepts[0].stack.join(' + ')}</p>
      </footer>

    </div>
  );
}