import { Link } from 'react-router-dom';
import { Film, TrendingUp, Clock, Star, Play, Cpu, CheckCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const STATUS_CONFIG = {
    uploaded: { label: 'Yuklangan', class: 'badge-info', icon: Film },
    processing: { label: 'AI Qayta ishlash...', class: 'badge-warning', icon: Cpu },
    ready: { label: 'Tayyor', class: 'badge-success', icon: Play },
    exported: { label: 'Eksport qilindi', class: 'badge-primary', icon: CheckCircle },
    error: { label: 'Xato', class: 'badge-error', icon: Film },
};

export default function ProjectCard({ project, onRefresh }) {
    const statusInfo = STATUS_CONFIG[project.status] || { label: project.status, class: 'badge-info', icon: Film };
    const Icon = statusInfo.icon;
    const isProcessing = project.status === 'processing';

    const handleAction = async (e, endpoint) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const res = await fetch(`${API_URL}/api/projects/${project.id}/${endpoint}`, { method: 'POST' });
            if (!res.ok) throw new Error('Amal bajarilmadi');
            if (onRefresh) onRefresh();
        } catch (err) {
            alert('Xato: ' + err.message);
        }
    };

    return (
        <div className="project-card">
            <Link to={`/editor/${project.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="project-card-thumb">
                    <div
                        className="project-card-thumb-bg"
                        style={{
                            background: project.poster_url
                                ? `url(${project.poster_url}) center / cover`
                                : `linear-gradient(135deg, #1a1a3e 0%, #2d1b4e 100%)`,
                            width: '100%',
                            height: '100%',
                        }}
                    />
                    <div className="project-card-thumb-overlay">
                        <span className={`badge ${statusInfo.class}`}>{statusInfo.label}</span>
                        {project.runtime && <span className="project-card-duration">{project.runtime}</span>}
                    </div>
                </div>
            </Link>

            <div className="project-card-body">
                <div className="project-card-title">
                    <Icon style={{ width: 16, height: 16, color: 'var(--accent-primary-hover)' }} />
                    {project.title}
                </div>

                <div className="project-card-meta">
                    {project.genre && <span><Star style={{ width: 12, height: 12 }} /> {project.genre}</span>}
                    {project.condensedDuration && <span><Clock style={{ width: 12, height: 12 }} /> → {project.condensedDuration}</span>}
                </div>

                {isProcessing && (
                    <div className="confidence-bar" style={{ marginTop: '0.5rem', height: 4 }}>
                        <div
                            className="confidence-bar-fill"
                            style={{
                                width: `${project.progress || 5}%`,
                                background: 'var(--accent-primary)',
                            }}
                        />
                    </div>
                )}

                <div className="project-card-footer" style={{ marginTop: '1rem' }}>
                    <div className="project-card-actions" style={{ width: '100%', display: 'flex', gap: '0.5rem' }}>
                        {project.status === 'uploaded' && (
                            <button className="btn btn-sm btn-accent" onClick={(e) => handleAction(e, 'process')}>
                                <Cpu size={14} /> AI Qirqish
                            </button>
                        )}
                        {project.status === 'ready' && (
                            <button className="btn btn-sm btn-primary" onClick={(e) => handleAction(e, 'publish')}>
                                <CheckCircle size={14} /> Joylash
                            </button>
                        )}
                        {project.status === 'ready' && (
                            <Link to={`/film/${project.id}`} className="btn btn-sm btn-ghost">
                                <Play size={14} /> Ko'rish
                            </Link>
                        )}
                        {project.status === 'exported' && (
                            <span style={{ color: 'var(--color-success)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle size={14} /> Katalogda
                                <Link to={`/film/${project.id}`} className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }}>
                                    <Play size={14} />
                                </Link>
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
