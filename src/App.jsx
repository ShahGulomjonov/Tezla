import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import FilmPage from './pages/FilmPage';
import AdminPage from './pages/AdminPage';
import DashboardPage from './pages/DashboardPage';
import EditorPage from './pages/EditorPage';
import StudioPage from './pages/StudioPage';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import { Menu } from 'lucide-react';

import './styles/index.css';
import './styles/layout.css';
import './styles/home.css';
import './styles/film.css';
import './styles/admin.css';
import './styles/dashboard.css';
import './styles/editor.css';
import './styles/export.css';
import './styles/studio.css';

function StudioLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile hamburger */}
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <Menu size={20} />
      </button>

      <Sidebar className={sidebarOpen ? 'open' : ''} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Header />
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Viewer pages (full-width, no sidebar) */}
        <Route path="/" element={<HomePage />} />
        <Route path="/film/:id" element={<FilmPage />} />

        {/* Studio pages (sidebar + header layout) */}
        <Route path="/dashboard" element={<StudioLayout><DashboardPage /></StudioLayout>} />
        <Route path="/studio" element={<StudioLayout><StudioPage /></StudioLayout>} />
        <Route path="/admin" element={<StudioLayout><AdminPage /></StudioLayout>} />
        <Route path="/editor/:projectId" element={<StudioLayout><EditorPage /></StudioLayout>} />

        {/* SPA fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
