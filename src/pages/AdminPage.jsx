import { useState, useEffect, useRef } from 'react';
import { Upload, Film, Cpu, AlertTriangle, CheckCircle, Clock, Play, Users, Shield, Trash2, Plus, X, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../styles/admin.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const STATUS_CONFIG = {
    uploaded:   { label: 'Yuklangan',         color: '#888',    icon: Clock },
    processing: { label: 'AI Qayta ishlash...', color: '#f59e0b', icon: Cpu, pulse: true },
    ready:      { label: 'Tayyor',            color: '#22c55e', icon: CheckCircle },
    exported:   { label: 'Nashr qilingan',    color: '#6366f1', icon: CheckCircle },
    error:      { label: 'Xato',              color: '#ef4444', icon: AlertTriangle },
};

const DEFAULT_MODS = [
    { id: 1, name: 'Admin', email: 'admin@tezla.uz', role: 'admin', active: true },
];

export default function AdminPage() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragOver, setDragOver] = useState(false);
    const [activeTab, setActiveTab] = useState('projects'); // 'projects' | 'moderators' | 'stats'
    const [moderators, setModerators] = useState(() => {
        const saved = localStorage.getItem('tezla_moderators');
        return saved ? JSON.parse(saved) : DEFAULT_MODS;
    });
    const [showAddMod, setShowAddMod] = useState(false);
    const [newMod, setNewMod] = useState({ name: '', email: '', role: 'moderator' });
    const fileInputRef = useRef(null);

    const fetchProjects = () => {
        fetch(`${API_URL}/api/projects`)
            .then(res => res.json())
            .then(data => { setProjects(data); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchProjects();
        const interval = setInterval(fetchProjects, 4000);
        return () => clearInterval(interval);
    }, []);

    const handleFileDrop = async (file) => {
        if (!file || !file.type.startsWith('video/')) {
            alert('Faqat video fayllar qabul qilinadi');
            return;
        }
        setUploading(true);
        setUploadProgress(0);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: fd });
            if (!res.ok) throw new Error('Yuklash xatosi');
            const data = await res.json();
            setUploadProgress(50);
            fetchProjects();
            await fetch(`${API_URL}/api/projects/${data.project.id}/process`, { method: 'POST' });
            setUploadProgress(100);
            fetchProjects();
        } catch (err) { alert('Xato: ' + err.message); }
        setUploading(false);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleProcess = async (projectId) => {
        try {
            await fetch(`${API_URL}/api/projects/${projectId}/process`, { method: 'POST' });
            fetchProjects();
        } catch (err) { alert('Xato: ' + err.message); }
    };

    const handlePublish = async (projectId) => {
        try {
            await fetch(`${API_URL}/api/projects/${projectId}/publish`, { method: 'POST' });
            fetchProjects();
        } catch (err) { alert('Xato: ' + err.message); }
    };

    const addModerator = () => {
        if (!newMod.name || !newMod.email) return;
        const updated = [...moderators, { ...newMod, id: Date.now(), active: true }];
        setModerators(updated);
        localStorage.setItem('tezla_moderators', JSON.stringify(updated));
        setNewMod({ name: '', email: '', role: 'moderator' });
        setShowAddMod(false);
    };

    const removeModerator = (id) => {
        if (id === 1) return; // Can't remove primary admin
        const updated = moderators.filter(m => m.id !== id);
        setModerators(updated);
        localStorage.setItem('tezla_moderators', JSON.stringify(updated));
    };

    const toggleModStatus = (id) => {
        if (id === 1) return;
        const updated = moderators.map(m => m.id === id ? { ...m, active: !m.active } : m);
        setModerators(updated);
        localStorage.setItem('tezla_moderators', JSON.stringify(updated));
    };

    // Stats
    const totalFilms = projects.length;
    const readyFilms = projects.filter(p => p.status === 'ready' || p.status === 'exported').length;
    const processingFilms = projects.filter(p => p.status === 'processing').length;
    const errorFilms = projects.filter(p => p.status === 'error').length;

    return (
        <div className="admin-page">
            {/* Admin Header */}
            <div className="admin-header">
                <div>
                    <h1>⚙️ Admin Panel</h1>
                    <p>Tezla platformasi boshqaruvi</p>
                </div>
                <div className="admin-header-actions">
                    <Link to="/studio" className="btn btn-ghost">Studio</Link>
                    <Link to="/" className="btn btn-ghost">← Kinoteatr</Link>
                </div>
            </div>

            {/* Tabs */}
            <div className="admin-tabs">
                <button className={`admin-tab ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>
                    <Film size={16} /> Filmlar ({totalFilms})
                </button>
                <button className={`admin-tab ${activeTab === 'moderators' ? 'active' : ''}`} onClick={() => setActiveTab('moderators')}>
                    <Users size={16} /> Moderatorlar ({moderators.length})
                </button>
                <button className={`admin-tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
                    <BarChart3 size={16} /> Statistika
                </button>
            </div>

            {/* === PROJECTS TAB === */}
            {activeTab === 'projects' && (
                <>
                    {/* Upload Zone */}
                    <div
                        className={`upload-card ${dragOver ? 'drag-active' : ''}`}
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={e => { e.preventDefault(); setDragOver(false); handleFileDrop(e.dataTransfer.files[0]); }}
                        onClick={() => !uploading && fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef} type="file" accept="video/*"
                            style={{ display: 'none' }}
                            onChange={e => e.target.files[0] && handleFileDrop(e.target.files[0])}
                        />
                        {uploading ? (
                            <div className="upload-progress-state">
                                <div className="upload-spinner" />
                                <p>{uploadProgress < 60 ? 'Yuklanmoqda...' : 'AI boshlanmoqda...'}</p>
                                <div className="progress-bar-track" style={{ maxWidth: 300 }}>
                                    <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="upload-icon"><Upload size={40} /></div>
                                <h2>Video faylni yuklang</h2>
                                <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.3rem' }}>MP4, MKV, AVI, MOV</p>
                            </>
                        )}
                    </div>

                    {/* Project List */}
                    {!loading && projects.length > 0 && (
                        <div className="admin-list">
                            {projects.map(project => {
                                const cfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.uploaded;
                                const Icon = cfg.icon;
                                const isProcessing = project.status === 'processing';
                                return (
                                    <div key={project.id} className="admin-list-item">
                                        <div className="item-thumb">
                                            {project.poster_url
                                                ? <img src={project.poster_url} alt="" className="admin-list-poster" />
                                                : <Film size={24} color="#444" />
                                            }
                                        </div>
                                        <div className="item-main">
                                            <h3>{project.title}</h3>
                                            <div className="item-meta">
                                                {project.runtime && <span><Clock size={12} /> {project.runtime}</span>}
                                                {project.condensedDuration && (project.status === 'ready' || project.status === 'exported') && (
                                                    <span style={{ color: '#22c55e' }}>→ {project.condensedDuration}</span>
                                                )}
                                                <span style={{ color: cfg.color, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    <Icon size={12} className={cfg.pulse ? 'pulse' : ''} />
                                                    {cfg.label}
                                                </span>
                                            </div>
                                            {isProcessing && (
                                                <div className="progress-bar-track" style={{ marginTop: '0.4rem', maxWidth: 250 }}>
                                                    <div className="progress-bar-fill processing" style={{ width: `${project.progress || 5}%` }} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="item-actions">
                                            {(project.status === 'ready' || project.status === 'exported') && (
                                                <Link to={`/film/${project.id}`} className="btn btn-sm btn-primary"><Play size={13} fill="white" /> Ko'rish</Link>
                                            )}
                                            {project.status === 'ready' && (
                                                <button className="btn btn-sm btn-success" onClick={() => handlePublish(project.id)}>Nashr</button>
                                            )}
                                            {project.status === 'uploaded' && (
                                                <button className="btn btn-sm btn-accent" onClick={() => handleProcess(project.id)}>
                                                    <Cpu size={13} /> Opus AI
                                                </button>
                                            )}
                                            {project.status === 'error' && (
                                                <button className="btn btn-sm btn-ghost" onClick={() => handleProcess(project.id)}>Qayta</button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* === MODERATORS TAB === */}
            {activeTab === 'moderators' && (
                <div className="mod-section">
                    <div className="mod-header">
                        <h2><Shield size={20} /> Moderatorlar</h2>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowAddMod(true)}>
                            <Plus size={14} /> Qo'shish
                        </button>
                    </div>

                    {/* Add moderator form */}
                    {showAddMod && (
                        <div className="mod-add-form">
                            <input
                                placeholder="Ism" value={newMod.name}
                                onChange={e => setNewMod({ ...newMod, name: e.target.value })}
                                className="mod-input"
                            />
                            <input
                                placeholder="Email" value={newMod.email}
                                onChange={e => setNewMod({ ...newMod, email: e.target.value })}
                                className="mod-input"
                            />
                            <select
                                value={newMod.role}
                                onChange={e => setNewMod({ ...newMod, role: e.target.value })}
                                className="mod-input"
                            >
                                <option value="moderator">Moderator</option>
                                <option value="admin">Admin</option>
                                <option value="editor">Editor</option>
                            </select>
                            <div className="mod-add-actions">
                                <button className="btn btn-sm btn-primary" onClick={addModerator}>Saqlash</button>
                                <button className="btn btn-sm btn-ghost" onClick={() => setShowAddMod(false)}>Bekor</button>
                            </div>
                        </div>
                    )}

                    {/* Moderators list */}
                    <div className="mod-list">
                        {moderators.map(mod => (
                            <div key={mod.id} className={`mod-item ${!mod.active ? 'inactive' : ''}`}>
                                <div className="mod-avatar">
                                    {mod.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="mod-info">
                                    <strong>{mod.name}</strong>
                                    <span>{mod.email}</span>
                                </div>
                                <span className={`mod-role ${mod.role}`}>
                                    {mod.role === 'admin' ? '👑 Admin' : mod.role === 'moderator' ? '🛡️ Moderator' : '✏️ Editor'}
                                </span>
                                <span className={`mod-status ${mod.active ? 'active' : 'disabled'}`}>
                                    {mod.active ? 'Faol' : 'O\'chirilgan'}
                                </span>
                                {mod.id !== 1 && (
                                    <div className="mod-actions">
                                        <button className="btn btn-sm btn-ghost" onClick={() => toggleModStatus(mod.id)}>
                                            {mod.active ? 'O\'chirish' : 'Yoqish'}
                                        </button>
                                        <button className="btn btn-sm btn-danger" onClick={() => removeModerator(mod.id)}>
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* === STATS TAB === */}
            {activeTab === 'stats' && (
                <div className="stats-section">
                    <div className="stats-grid">
                        <div className="admin-stat-card">
                            <div className="admin-stat-icon" style={{ background: 'rgba(99, 102, 241, 0.15)' }}><Film size={24} color="#6366f1" /></div>
                            <div className="admin-stat-value">{totalFilms}</div>
                            <div className="admin-stat-label">Jami filmlar</div>
                        </div>
                        <div className="admin-stat-card">
                            <div className="admin-stat-icon" style={{ background: 'rgba(34, 197, 94, 0.15)' }}><CheckCircle size={24} color="#22c55e" /></div>
                            <div className="admin-stat-value">{readyFilms}</div>
                            <div className="admin-stat-label">Tayyor</div>
                        </div>
                        <div className="admin-stat-card">
                            <div className="admin-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)' }}><Cpu size={24} color="#f59e0b" /></div>
                            <div className="admin-stat-value">{processingFilms}</div>
                            <div className="admin-stat-label">Qayta ishlash</div>
                        </div>
                        <div className="admin-stat-card">
                            <div className="admin-stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)' }}><AlertTriangle size={24} color="#ef4444" /></div>
                            <div className="admin-stat-value">{errorFilms}</div>
                            <div className="admin-stat-label">Xatolar</div>
                        </div>
                    </div>

                    <div className="admin-stat-card" style={{ marginTop: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Moderatorlar</h3>
                        <div className="admin-stat-value" style={{ fontSize: '2rem' }}>{moderators.length}</div>
                        <div className="admin-stat-label">
                            {moderators.filter(m => m.active).length} faol · {moderators.filter(m => !m.active).length} o'chirilgan
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
