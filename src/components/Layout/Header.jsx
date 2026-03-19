import { useLocation } from 'react-router-dom';
import { Search, Bell, ChevronRight } from 'lucide-react';
import { projects } from '../../data/mockData';

export default function Header() {
    const location = useLocation();

    const getBreadcrumb = () => {
        if (location.pathname === '/') {
            return <span>Dashboard</span>;
        }
        if (location.pathname.startsWith('/editor/')) {
            const projectId = location.pathname.split('/editor/')[1];
            const project = projects.find(p => p.id === projectId);
            return (
                <>
                    <span style={{ color: 'var(--text-tertiary)' }}>Projects</span>
                    <ChevronRight />
                    <span>{project?.title || 'Editor'}</span>
                </>
            );
        }
        return <span>Tezla</span>;
    };

    return (
        <header className="header">
            <div className="header-left">
                <div className="header-breadcrumb">
                    {getBreadcrumb()}
                </div>
            </div>
            <div className="header-right">
                <div className="header-search">
                    <Search />
                    <span>Search projects...</span>
                    <kbd>⌘K</kbd>
                </div>
                <button className="header-icon-btn">
                    <Bell />
                    <span className="notification-dot"></span>
                </button>
            </div>
        </header>
    );
}
