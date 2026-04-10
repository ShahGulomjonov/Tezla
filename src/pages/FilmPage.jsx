import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Play, Clock, Film, Star, Scissors, ChevronRight, RefreshCw, Share2, Plus, ThumbsUp, Download, Cpu } from 'lucide-react';
import '../styles/film.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function FilmPage() {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeScene, setActiveScene] = useState(null);
    const [videoError, setVideoError] = useState(false);
    const [videoKey, setVideoKey] = useState(0);
    const [allProjects, setAllProjects] = useState([]);
    const [inMyList, setInMyList] = useState(false);
    const videoRef = useRef(null);

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [id]);

    const fetchProject = () => {
        fetch(`${API_URL}/api/projects/${id}`)
            .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
            .then(data => { setProject(data); setLoading(false); })
            .catch(err => { console.error(err); setLoading(false); });
    };

    useEffect(() => { fetchProject(); }, [id]);

    // Fetch all projects for "Similar" section
    useEffect(() => {
        fetch(`${API_URL}/api/projects`)
            .then(r => r.json())
            .then(data => setAllProjects(data.filter(p => p.id !== id && (p.status === 'ready' || p.status === 'exported'))))
            .catch(() => { });
    }, [id]);

    useEffect(() => {
        if (!project) return;
        if (project.status === 'downloading' || project.status === 'processing') {
            const interval = setInterval(fetchProject, 3000);
            return () => clearInterval(interval);
        }
        if (project.status === 'ready' || project.status === 'exported') {
            setVideoError(false);
            setVideoKey(prev => prev + 1);
        }
    }, [project?.status, project?.progress]);

    // Check my list
    useEffect(() => {
        const myList = JSON.parse(localStorage.getItem('tezla_mylist') || '[]');
        setInMyList(myList.includes(id));
    }, [id]);

    const toggleMyList = () => {
        const myList = JSON.parse(localStorage.getItem('tezla_mylist') || '[]');
        if (inMyList) {
            localStorage.setItem('tezla_mylist', JSON.stringify(myList.filter(x => x !== id)));
        } else {
            myList.push(id);
            localStorage.setItem('tezla_mylist', JSON.stringify(myList));
        }
        setInMyList(!inMyList);
    };

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            await navigator.share({ title: project?.title, url });
        } else {
            await navigator.clipboard.writeText(url);
            alert('Havola nusxalandi!');
        }
    };

    const keptScenes = project?.scenes?.filter(s => s.status === 'keep') || [];
    const isReady = project?.status === 'ready' || project?.status === 'exported';
    const isDownloading = project?.status === 'downloading';
    const isProcessing = project?.status === 'processing';
    const videoUrl = isReady ? `${API_URL}/api/projects/${id}/video?t=${videoKey}` : null;

    const retryVideo = () => { setVideoError(false); setVideoKey(prev => prev + 1); };

    if (loading) return (
        <div className="film-loading">
            <div className="loading-spinner" />
            <p>Film yuklanmoqda...</p>
        </div>
    );

    if (!project) return (
        <div className="film-loading">
            <Film size={48} color="#444" />
            <p>Film topilmadi</p>
            <Link to="/" style={{ color: '#6366f1', marginTop: '1rem' }}>← Bosh sahifaga</Link>
        </div>
    );

    // Similar films (same genre)
    const projectGenres = (project.genre || '').split(',').map(g => g.trim());
    const similarFilms = allProjects
        .filter(p => projectGenres.some(g => (p.genre || '').includes(g)))
        .slice(0, 8);

    return (
        <div className="film-page">
            <Link to="/" className="back-btn"><ArrowLeft size={20} /></Link>

            {/* Video Player — sticky top */}
            <div className="player-section">
                {isReady && videoUrl && !videoError ? (
                    <video
                        key={videoKey}
                        ref={videoRef}
                        className="main-video"
                        src={videoUrl}
                        controls
                        autoPlay={false}
                        poster={project.backdrop_url || project.poster_url || undefined}
                        onError={() => setVideoError(true)}
                        preload="metadata"
                    />
                ) : isReady && videoError ? (
                    <div className="player-placeholder" style={{ background: 'linear-gradient(135deg, #111, #1a1a2e)' }}>
                        <div className="placeholder-inner">
                            <Film size={48} color="#ef4444" />
                            <h2>Video yuklanmadi</h2>
                            <p style={{ color: '#888', marginTop: '0.5rem' }}>Texnik nosozlik yuz berdi</p>
                            <button onClick={retryVideo} className="btn btn-accent" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <RefreshCw size={15} /> Qayta urinish
                            </button>
                        </div>
                    </div>
                ) : (isDownloading || isProcessing) ? (
                    <div className="player-placeholder" style={{
                        background: project.backdrop_url
                            ? `linear-gradient(to bottom, rgba(0,0,0,0.7), #0a0a0a), url(${project.backdrop_url}) center/cover`
                            : project.poster_url
                                ? `linear-gradient(to bottom, rgba(0,0,0,0.7), #0a0a0a), url(${project.poster_url}) center/cover`
                                : 'linear-gradient(135deg, #111, #1a1a2e)'
                    }}>
                        <div className="placeholder-inner">
                            {isDownloading ? (
                                <Download size={48} color="#3b82f6" className="pulse-icon" />
                            ) : (
                                <Cpu size={48} color="#f59e0b" className="pulse-icon" />
                            )}
                            <h2>{isDownloading ? 'Yuklab olinmoqda...' : 'AI tahlil qilmoqda...'}</h2>
                            <p style={{ color: '#888', marginTop: '0.5rem' }}>
                                {isDownloading ? 'Rutor.info dan film yuklanmoqda' : 'Opus AI filmni zichlab tayyorlamoqda'}
                            </p>
                            <div className="film-progress-bar" style={{ marginTop: '1.5rem', width: '80%', maxWidth: '400px' }}>
                                <div className="film-progress-track">
                                    <div className={`film-progress-fill ${isDownloading ? 'downloading' : 'processing'}`}
                                         style={{ width: `${project.progress || 2}%` }} />
                                </div>
                                <span className="film-progress-label">{project.progress || 0}%</span>
                            </div>
                        </div>
                    </div>
                ) : project.status === 'error' ? (
                    <div className="player-placeholder" style={{
                        background: project.backdrop_url
                            ? `linear-gradient(to bottom, rgba(0,0,0,0.8), #0a0a0a), url(${project.backdrop_url}) center/cover`
                            : 'linear-gradient(135deg, #111, #1a1a2e)'
                    }}>
                        <div className="placeholder-inner">
                            <Film size={48} color="#ef4444" />
                            <h2>Yuklashda xatolik</h2>
                            <p style={{ color: '#888', marginTop: '0.5rem' }}>Torrent yuklab olishda muammo yuz berdi</p>
                            <button onClick={async () => {
                                try {
                                    if (id.startsWith('tmdb-')) {
                                        await fetch(`${API_URL}/api/tmdb/retry/${id}`, { method: 'POST' });
                                    } else {
                                        await fetch(`${API_URL}/api/projects/${id}/process`, { method: 'POST' });
                                    }
                                    fetchProject();
                                } catch (e) { console.error(e); }
                            }} className="btn btn-accent" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <RefreshCw size={15} /> Qayta yuklash
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="player-placeholder" style={{
                        background: project.backdrop_url
                            ? `linear-gradient(to bottom, rgba(0,0,0,0.6), #0a0a0a), url(${project.backdrop_url}) center/cover`
                            : project.poster_url
                                ? `linear-gradient(to bottom, rgba(0,0,0,0.6), #0a0a0a), url(${project.poster_url}) center/cover`
                                : 'linear-gradient(135deg, #111, #1a1a2e)'
                    }}>
                        <div className="placeholder-inner">
                            <Film size={48} color="#444" />
                            <h2>Tez kunda</h2>
                            <p style={{ color: '#666' }}>Film tayyorlanmoqda</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Film Info */}
            <div className="film-details">
                <div className="film-info-main">
                    <h1 className="film-title">{project.title}</h1>
                    <div className="film-meta-row">
                        {project.year && <span>{project.year}</span>}
                        {project.genre && <span className="genre-chip">{project.genre}</span>}
                        {project.vote_average > 0 && (
                            <span className="confidence-badge">
                                <Star size={13} fill="#eab308" color="#eab308" /> {project.vote_average.toFixed(1)}
                            </span>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="film-actions">
                        {isReady && videoUrl && (
                            <button className="btn-film-play" onClick={() => videoRef.current?.play()}>
                                <Play size={18} fill="white" /> Ko'rish
                            </button>
                        )}
                        <button className={`btn-film-action ${inMyList ? 'active' : ''}`} onClick={toggleMyList}>
                            <Plus size={18} className={inMyList ? 'rotated' : ''} />
                            {inMyList ? 'Ro\'yxatda' : 'Ro\'yxatga'}
                        </button>
                        <button className="btn-film-action" onClick={() => { }}>
                            <ThumbsUp size={18} />
                        </button>
                        <button className="btn-film-action" onClick={handleShare}>
                            <Share2 size={18} />
                        </button>
                    </div>

                    {project.overview && <p className="film-overview">{project.overview}</p>}

                    {project.cast && project.cast.length > 0 && (
                        <p className="film-cast">
                            <span>Aktyorlar:</span> {project.cast.slice(0, 5).join(', ')}
                        </p>
                    )}

                    {isReady && (
                        <div className="stats-row">
                            <div className="stat-card">
                                <div className="stat-value">{project.runtime || '—'}</div>
                                <div className="stat-label">Asl uzunlik</div>
                            </div>
                            <div className="stat-card accent">
                                <div className="stat-value">{project.condensedDuration || '—'}</div>
                                <div className="stat-label">Tezla versiya</div>
                            </div>
                            {project.compressionRatio > 0 && (
                                <div className="stat-card success">
                                    <div className="stat-value">{project.compressionRatio}%</div>
                                    <div className="stat-label">Siqilish</div>
                                </div>
                            )}
                            {keptScenes.length > 0 && (
                                <div className="stat-card">
                                    <div className="stat-value">{keptScenes.length}</div>
                                    <div className="stat-label">Sahnalar</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Scene Chapters */}
                {keptScenes.length > 0 && (
                    <div className="scene-breakdown">
                        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Scissors size={18} /> Sahnalar ({keptScenes.length})
                        </h3>
                        <div className="scene-list">
                            {keptScenes.map((scene, i) => {
                                const startMin = Math.floor(scene.start_sec / 60);
                                const startSec = Math.floor(scene.start_sec % 60);
                                const duration = Math.round(scene.end_sec - scene.start_sec);
                                return (
                                    <button
                                        key={scene.id || i}
                                        className={`scene-item ${activeScene === i ? 'active' : ''}`}
                                        onClick={() => {
                                            setActiveScene(i);
                                            if (videoRef.current) {
                                                const condensedOffset = keptScenes
                                                    .slice(0, i)
                                                    .reduce((sum, s) => sum + (s.end_sec - s.start_sec), 0);
                                                videoRef.current.currentTime = condensedOffset;
                                                videoRef.current.play();
                                            }
                                        }}
                                    >
                                        <div className="scene-num">{i + 1}</div>
                                        <div className="scene-body">
                                            <div className="scene-label">{scene.label || `Sahna ${i + 1}`}</div>
                                            <div className="scene-time-row">
                                                <Clock size={11} /> {startMin}:{String(startSec).padStart(2, '0')} · {duration}s
                                            </div>
                                        </div>
                                        <ChevronRight size={14} color="#555" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Similar Films */}
            {similarFilms.length > 0 && (
                <div className="similar-section">
                    <h2 className="similar-title">Shunga o'xshash filmlar</h2>
                    <div className="similar-grid">
                        {similarFilms.map(film => (
                            <Link key={film.id} to={`/film/${film.id}`} className="similar-card">
                                <div className="similar-thumb">
                                    {film.poster_url
                                        ? <img src={film.poster_url} alt={film.title} />
                                        : <div className="similar-thumb-placeholder"><Film size={24} color="#444" /></div>
                                    }
                                    <div className="similar-play"><Play size={16} fill="white" /></div>
                                </div>
                                <div className="similar-info">
                                    <p className="similar-name">{film.title}</p>
                                    <p className="similar-meta">
                                        {film.year} {film.vote_average > 0 && `· ★ ${film.vote_average.toFixed(1)}`}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
