import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Film, Settings, HelpCircle, Zap, Upload, Clapperboard, Shield, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Sidebar({ className = '', onClose }) {
    const location = useLocation();
    const [projects, setProjects] = useState([]);
    const isEditor = location.pathname.startsWith('/editor');

    useEffect(() => {
        fetch(`${API_URL}/api/projects`)
            .then(res => res.json())
            .then(data => setProjects(data))
            .catch(() => { });
    }, []);

    // Close sidebar on navigation (mobile)
    const handleNav = () => { if (onClose) onClose(); };

    return (
        <aside className={`sidebar ${className}`}>
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <Zap />
                </div>
                <div className="sidebar-brand">
                    <h1>Tezla</h1>
                    <span>AI Condensation</span>
                </div>
                {onClose && (
                    <button className="sidebar-close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                )}
            </div>

            <nav className="sidebar-nav">
                <span className="sidebar-section-label">Main</span>
                <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive && !isEditor ? 'active' : ''}`} onClick={handleNav}>
                    <LayoutDashboard />
                    Dashboard
                    {projects.length > 0 && <span className="nav-badge">{projects.length}</span>}
                </NavLink>
                <NavLink to="/studio" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={handleNav}>
                    <Clapperboard />
                    Studio
                </NavLink>
                <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={handleNav}>
                    <Shield />
                    Admin
                </NavLink>

                {projects.length > 0 && (
                    <>
                        <span className="sidebar-section-label">Projects</span>
                        {projects.slice(0, 5).map(project => (
                            <NavLink
                                key={project.id}
                                to={`/editor/${project.id}`}
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                onClick={handleNav}
                            >
                                <Film />
                                {project.title}
                            </NavLink>
                        ))}
                    </>
                )}

                <span className="sidebar-section-label">System</span>
                <NavLink to="/" className="nav-link" onClick={handleNav}>
                    <Film />
                    Kinoteatr
                </NavLink>
                <NavLink to="/" className="nav-link" onClick={(e) => e.preventDefault()}>
                    <Settings />
                    Settings
                </NavLink>
                <NavLink to="/" className="nav-link" onClick={(e) => e.preventDefault()}>
                    <HelpCircle />
                    Help & Docs
                </NavLink>
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="sidebar-avatar">SG</div>
                    <div className="sidebar-user-info">
                        <span className="sidebar-user-name">Studio User</span>
                        <span className="sidebar-user-role">Admin</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
