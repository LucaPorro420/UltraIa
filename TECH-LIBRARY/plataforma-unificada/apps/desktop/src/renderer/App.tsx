import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Learn } from './pages/Learn';
import { Projects } from './pages/Projects';
import { Agents } from './pages/Agents';
import { IDE } from './pages/IDE';
import { Chat } from './pages/Chat';
import { Settings } from './pages/Settings';
import { CourseDetail } from './pages/CourseDetail';
import { ProjectDetail } from './pages/ProjectDetail';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';

function Layout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary">Cargando Plataforma Total...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas flex">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  const { theme } = useTheme();
  
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="learn" element={<Learn />} />
          <Route path="learn/:courseId" element={<CourseDetail />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:projectId" element={<ProjectDetail />} />
          <Route path="agents" element={<Agents />} />
          <Route path="ide" element={<IDE />} />
          <Route path="chat" element={<Chat />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;