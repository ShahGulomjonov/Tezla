import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    Upload, Film, Cpu, Play, Clock, CheckCircle,
    AlertTriangle, Zap, Scissors, Send, RefreshCw
} from 'lucide-react';
import '../styles/studio.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const STATUS_MAP = {
    uploaded:   { label: 'Yuklangan',           color: '#888',    Icon: Clock },
    processing: { label: 'AI qayta ishlash...',  color: '#f59e0b', Icon: Cpu },
    ready:      { label: 'Tayyor',               color: '#22c55e', Icon: CheckCircle },
    exported:   { label: 'Nashr qilingan',       color: '#818cf8', Icon: CheckCircle },
    error:      { label: 'Xato',                 color: '#ef4444', Icon: AlertTriangle },
};

export default function StudioPage() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragOver, setDragOver] = useState(false);
    
    // YTS API states
    const [activeTab, setActiveTab] = useState('local'); // 'local' or 'yts'
    const [ytsQuery, setYtsQuery] = useState('');
    const [ytsResults, setYtsResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const fileInputRef = useRef(null);

    /* ---------- data fetching ---------- */
    const fetchProjects = () => {
        fetch(`${API_URL}/api/projects`)
            .then(r => r.json())
            .then(data => { setProjects(data); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchProjects();
        const id = setInterval(fetchProjects, 4000);
        return () => clearInterval(id);
    }, []);

    /* ---------- upload + auto-process ---------- */
    const handleFileDrop = async (file) => {
        if (!file || !file.type.startsWith('video/')) {
            alert('Faqat video fayllar qabul qilinadi (mp4, mkv, avi...)');
            return;
        }
        setUploading(true);
        setUploadProgress(0);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: fd });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `Yuklash xatosi: ${res.status}`);
            }
            const data = await res.json();
            setUploadProgress(50);
            fetchProjects();

            // Auto-start AI processing
            await fetch(`${API_URL}/api/projects/${data.project.id}/process`, { method: 'POST' });
            setUploadProgress(100);
            fetchProjects();
        } catch (err) {
            alert('Xato: ' + err.message);
        }
        setUploading(false);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleProcess = async (id) => {
        try {
            const res = await fetch(`${API_URL}/api/projects/${id}/process`, { method: 'POST' });
            if (!res.ok) throw new Error('AI qayta ishlash boshlanmadi');
            fetchProjects();
        } catch (err) { alert('Xato: ' + err.message); }
    };

    const handlePublish = async (id) => {
        try {
            const res = await fetch(`${API_URL}/api/projects/${id}/publish`, { method: 'POST' });
            if (!res.ok) throw new Error('Nashr qilish muvaffaqiyatsiz');
            fetchProjects();
        } catch (err) { alert('Xato: ' + err.message); }
    };

    /* ---------- TMDB Search & Import ---------- */
    const handleYtsSearch = async (e) => {
        e.preventDefault();
        if (!ytsQuery) return;
        setIsSearching(true);
        try {
            const res = await fetch(`${API_URL}/api/tmdb/search?q=${encodeURIComponent(ytsQuery)}`);
            if (!res.ok) throw new Error('Qidiruvda xatolik yuz berdi');
            const data = await res.json();
            const movies = (data.results || []).filter(m => m.poster_path).map(m => ({
                id: m.id,
                title: m.title,
                year: m.release_date ? m.release_date.substring(0, 4) : '—',
                rating: m.vote_average?.toFixed(1) || '—',
                poster: m.poster_url || `https://image.tmdb.org/t/p/w200${m.poster_path}`,
                overview: m.overview || '',
                tmdb_id: m.id
            }));
            setYtsResults(movies);
        } catch (err) {
            alert('Xato: ' + err.message);
        }
        setIsSearching(false);
    };

    const handleYtsImport = async (movie) => {
        try {
            const res = await fetch(`${API_URL}/api/tmdb/import/${movie.tmdb_id}`, { method: 'POST' });
            if (!res.ok) throw new Error("Import boshlanmadi");
            setYtsResults([]);
            setYtsQuery('');
            setActiveTab('local');
            fetchProjects();
        } catch(err) {
            alert("Xato: " + err.message);
        }
    };

    /* ---------- render ---------- */
    return (
        <div className="studio-page">
            {/* Header */}
            <div className="studio-header">
                <div>
                    <h1>⚡ Tezla Studio</h1>
                    <p>Film yuklang — Opus AI 25 daqiqalik strategik kondensatsiya qiladi</p>
                </div>
                <div className="header-actions">
                    <div className="ai-badge">
                        <span className="ai-dot" />
                        Claude Opus AI
                    </div>
                    <Link to="/" className="btn btn-outline" style={{
                        padding: '0.5rem 1rem', borderRadius: 10, fontSize: '0.85rem',
                        color: '#aaa', border: '1px solid rgba(255,255,255,0.1)',
                        textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem'
                    }}>
                        ← Kinoteatr
                    </Link>
                </div>
            </div>

            {/* Upload / YTS Tabs */}
            <div className="studio-tabs">
                <button className={`studio-tab ${activeTab === 'local' ? 'active' : ''}`} onClick={() => setActiveTab('local')}>Kompyuterdan yuklash</button>
                <button className={`studio-tab ${activeTab === 'yts' ? 'active' : ''}`} onClick={() => setActiveTab('yts')}>🎬 TMDB dan qidirish</button>
            </div>

            {activeTab === 'local' && (
                <div
                    className={`studio-upload-zone ${dragOver ? 'drag-active' : ''}`}
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
                            <p style={{ color: '#aaa' }}>
                                {uploadProgress < 60 ? 'Video yuklanmoqda...' : 'AI Opus qayta ishlash boshlanmoqda...'}
                            </p>
                            <div className="progress-track" style={{ maxWidth: 320, width: '100%' }}>
                                <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="upload-icon-wrap">
                                <Upload size={32} color="#818cf8" />
                            </div>
                            <h2>Video faylni shu yerga tashlang</h2>
                            <p className="upload-hint">yoki bosing va kompyuterdan tanlang</p>
                            <p className="upload-formats">MP4, MKV, AVI, MOV · Maks 4 GB</p>
                        </>
                    )}
                </div>
            )}

            {activeTab === 'yts' && (
                <div className="yts-zone">
                    <form className="yts-search-form" onSubmit={handleYtsSearch}>
                        <input 
                            type="text" 
                            className="yts-input" 
                            placeholder="Film nomini yozing (masalan: Inception)..."
                            value={ytsQuery}
                            onChange={(e) => setYtsQuery(e.target.value)}
                        />
                        <button type="submit" className="btn btn-primary" disabled={isSearching}>
                            {isSearching ? <RefreshCw className="spin" size={18} /> : 'Qidirish'}
                        </button>
                    </form>

                    {ytsResults.length > 0 && (
                        <div className="yts-results">
                            {ytsResults.map(movie => (
                                <div key={movie.id} className="yts-card">
                                    <img src={movie.poster} alt={movie.title} className="yts-poster" />
                                    <div className="yts-info">
                                        <h4>{movie.title} ({movie.year})</h4>
                                        <p>⭐ {movie.rating} · {movie.year}</p>
                                        <div className="yts-actions">
                                            <button className="btn btn-publish" onClick={() => handleYtsImport(movie)}>
                                                Tezla'ga import qilish
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Pipeline Steps */}
            <div className="studio-pipeline">
                {[
                    { icon: Upload,   label: '1. Yuklash',    desc: 'Video fayl yuklash' },
                    { icon: Film,     label: '2. Sahnalar',   desc: 'Sahnalarni aniqlash' },
                    { icon: Zap,      label: '3. Opus AI',    desc: '80/20 Pareto tahlil' },
                    { icon: Scissors, label: '4. 25 daqiqa',  desc: 'Strategik kesim' },
                ].map((step, i) => (
                    <div key={i} className="pipeline-card">
                        <div className="step-icon">
                            <step.icon size={20} color="#818cf8" />
                        </div>
                        <strong>{step.label}</strong>
                        <span>{step.desc}</span>
                    </div>
                ))}
            </div>

            {/* Projects Section */}
            {!loading && projects.length > 0 && (
                <>
                    <div className="studio-section-header">
                        <h2>Loyihalar</h2>
                        <span className="count-badge">{projects.length} ta film</span>
                    </div>

                    <div className="studio-projects-grid">
                        {projects.map(project => {
                            const st = STATUS_MAP[project.status] || STATUS_MAP.uploaded;
                            const isProcessing = project.status === 'processing';
                            return (
                                <div key={project.id} className="studio-project-card">
                                    {/* Card Header */}
                                    <div className="project-card-header">
                                        {(project.backdrop_url || project.poster_url) ? (
                                            <img className="card-bg" src={project.backdrop_url || project.poster_url} alt="" />
                                        ) : (
                                            <div className="card-bg" style={{
                                                background: project.thumbnailGradient || 'linear-gradient(135deg, #1a1a3e, #2d1b4e)'
                                            }} />
                                        )}
                                        <div className="card-gradient" />
                                        <div className={`status-chip ${project.status}`}>
                                            <st.Icon size={12} />
                                            {st.label}
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    <div className="project-card-body">
                                        <h3>{project.title}</h3>
                                        <div className="project-meta-row">
                                            {project.runtime && project.runtime !== '00:00' && (
                                                <span className="meta-tag"><Clock size={12} /> {project.runtime}</span>
                                            )}
                                            {project.condensedDuration && project.status === 'ready' && (
                                                <span className="meta-tag condensed">→ {project.condensedDuration}</span>
                                            )}
                                            {project.genre && project.genre !== 'Unknown' && (
                                                <span className="meta-tag">{project.genre}</span>
                                            )}
                                        </div>

                                        {/* Progress bar for processing */}
                                        {isProcessing && (
                                            <div className="project-progress">
                                                <div className="progress-track">
                                                    <div className="progress-fill processing"
                                                         style={{ width: `${project.progress || 5}%` }} />
                                                </div>
                                                <div className="progress-label">
                                                    Opus AI tahlil qilmoqda... {project.progress || 0}%
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="project-card-actions">
                                            {project.status === 'ready' && (
                                                <>
                                                    <Link to={`/film/${project.id}`} className="btn btn-play">
                                                        <Play size={14} fill="white" /> Ko'rish
                                                    </Link>
                                                    <button className="btn btn-publish" onClick={() => handlePublish(project.id)}>
                                                        <Send size={14} /> Nashr qilish
                                                    </button>
                                                </>
                                            )}
                                            {project.status === 'exported' && (
                                                <Link to={`/film/${project.id}`} className="btn btn-play">
                                                    <Play size={14} fill="white" /> Ko'rish
                                                </Link>
                                            )}
                                            {project.status === 'uploaded' && (
                                                <button className="btn btn-process" onClick={() => handleProcess(project.id)}>
                                                    <Cpu size={14} /> AI Opus Qirqish
                                                </button>
                                            )}
                                            {project.status === 'error' && (
                                                <button className="btn btn-retry" onClick={() => handleProcess(project.id)}>
                                                    <RefreshCw size={14} /> Qayta urinish
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Empty state */}
            {!loading && projects.length === 0 && (
                <div className="studio-empty">
                    <div className="empty-icon">
                        <Film size={36} color="#444" />
                    </div>
                    <p>Hali hech qanday film yuklanmagan.<br />Yuqoridagi zona orqali birinchi filmingizni yuklang.</p>
                </div>
            )}
        </div>
    );
}
