import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Play, Clock, Scissors, Film, Star, Info, Search, X, User, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import '../styles/home.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function HomePage() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [authModal, setAuthModal] = useState(false);
    const [myList, setMyList] = useState([]);
    const searchRef = useRef(null);

    useEffect(() => {
        fetch(`${API_URL}/api/projects`)
            .then(res => res.json())
            .then(data => {
                setProjects(data.filter(p => p.status === 'ready' || p.status === 'exported'));
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    // Load my list from localStorage
    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('tezla_mylist') || '[]');
        setMyList(saved);
    }, []);

    useEffect(() => {
        if (searchOpen && searchRef.current) searchRef.current.focus();
    }, [searchOpen]);

    const featured = projects[0];
    const genres = [...new Set(projects.flatMap(p => (p.genre || '').split(',').map(g => g.trim())).filter(Boolean))];

    // Top 10
    const top10 = [...projects].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0)).slice(0, 10);

    // My List films
    const myListFilms = projects.filter(p => myList.includes(p.id));

    // Search filter
    const filtered = searchQuery.trim()
        ? projects.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
        : null;

    const toggleMyList = (filmId) => {
        let updated;
        if (myList.includes(filmId)) {
            updated = myList.filter(x => x !== filmId);
        } else {
            updated = [...myList, filmId];
        }
        setMyList(updated);
        localStorage.setItem('tezla_mylist', JSON.stringify(updated));
    };

    return (
        <div className="home-page">
            {/* Top Nav */}
            <nav className="nav-transparent">
                <Link to="/" className="nav-logo">Tezla</Link>
                <div className="nav-links">
                    <Link to="/" className="nav-link-item active">Bosh sahifa</Link>
                    <Link to="/studio" className="nav-link-item">Studio</Link>
                    {genres.slice(0, 3).map(g => (
                        <a key={g} href={`#genre-${g}`} className="nav-link-item hide-mobile">{g}</a>
                    ))}
                </div>
                <div className="nav-right">
                    {searchOpen ? (
                        <div className="nav-search-box">
                            <Search size={16} />
                            <input
                                ref={searchRef}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Film qidirish..."
                                className="nav-search-input"
                            />
                            <button className="nav-search-close" onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <button className="nav-icon-btn" onClick={() => setSearchOpen(true)}>
                            <Search size={18} />
                        </button>
                    )}
                    <button className="nav-icon-btn" onClick={() => setAuthModal(true)}>
                        <User size={18} />
                    </button>
                </div>
            </nav>

            {/* Search Results */}
            {filtered && (
                <div className="search-results">
                    <div className="search-results-inner">
                        <h2>Qidiruv: "{searchQuery}" ({filtered.length} ta natija)</h2>
                        {filtered.length > 0 ? (
                            <div className="films-grid">
                                {filtered.map(film => (
                                    <FilmCard key={film.id} film={film} myList={myList} toggleMyList={toggleMyList} />
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: '#666', marginTop: '1rem' }}>Hech narsa topilmadi</p>
                        )}
                    </div>
                </div>
            )}

            {!filtered && (
                <>
                    {/* Hero */}
                    {featured ? (
                        <div className="hero" style={{
                            background: featured.backdrop_url
                                ? `linear-gradient(to right, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.2) 100%), url(${featured.backdrop_url}) right center / cover`
                                : featured.poster_url
                                    ? `linear-gradient(to right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.1) 100%), url(${featured.poster_url}) right center / cover`
                                    : 'linear-gradient(135deg, #0f0f1a, #1a1a2e)'
                        }}>
                            <div className="hero-content">
                                <div className="hero-badge"><Scissors size={14} /> Tezla Exclusive</div>
                                <h1 className="hero-title">{featured.title}</h1>
                                <div className="hero-meta">
                                    {featured.year && <span>{featured.year}</span>}
                                    {featured.genre && <span>{featured.genre}</span>}
                                    {featured.vote_average > 0 && (
                                        <span className="hero-rating">
                                            <Star size={14} fill="#eab308" color="#eab308" /> {featured.vote_average.toFixed(1)}
                                        </span>
                                    )}
                                    {featured.condensedDuration && (
                                        <span className="hero-duration">
                                            <Clock size={14} /> {featured.condensedDuration}
                                        </span>
                                    )}
                                </div>
                                {featured.overview && (
                                    <p className="hero-desc">
                                        {featured.overview.slice(0, 200)}{featured.overview.length > 200 ? '...' : ''}
                                    </p>
                                )}
                                <div className="hero-actions">
                                    <Link to={`/film/${featured.id}`} className="btn-play-large">
                                        <Play fill="black" size={18} /> Ko'rish
                                    </Link>
                                    <Link to={`/film/${featured.id}`} className="btn-info-large">
                                        <Info size={18} /> Batafsil
                                    </Link>
                                    <button className="btn-mylist-hero" onClick={() => toggleMyList(featured.id)}>
                                        <Plus size={18} className={myList.includes(featured.id) ? 'rotated' : ''} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : !loading ? (
                        <div className="hero hero-empty">
                            <div className="hero-content" style={{ textAlign: 'center', alignItems: 'center' }}>
                                <div className="empty-icon"><Film size={64} color="#333" /></div>
                                <h1 className="hero-title" style={{ fontSize: '2.5rem' }}>Tezla</h1>
                                <p className="hero-desc" style={{ textAlign: 'center', maxWidth: 450 }}>
                                    Filmlarning eng muhim sahnalarini AI yordamida 25 daqiqada tomosha qiling
                                </p>
                            </div>
                        </div>
                    ) : null}

                    {/* My List */}
                    {myListFilms.length > 0 && (
                        <FilmRow title="Mening ro'yxatim" films={myListFilms} myList={myList} toggleMyList={toggleMyList} />
                    )}

                    {/* Top 10 */}
                    {top10.length > 0 && (
                        <div className="films-section">
                            <h2 className="section-title">🔥 Top 10 Tezla</h2>
                            <div className="top10-row">
                                {top10.map((film, idx) => (
                                    <Link key={film.id} to={`/film/${film.id}`} className="top10-card">
                                        <span className="top10-num">{idx + 1}</span>
                                        <div className="top10-poster">
                                            {film.poster_url
                                                ? <img src={film.poster_url} alt={film.title} />
                                                : <div className="top10-placeholder"><Film size={24} color="#444" /></div>
                                            }
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Genre Rows */}
                    {genres.map(genre => {
                        const genreFilms = projects.filter(p => (p.genre || '').includes(genre));
                        if (genreFilms.length === 0) return null;
                        return (
                            <FilmRow
                                key={genre}
                                id={`genre-${genre}`}
                                title={genre}
                                films={genreFilms}
                                myList={myList}
                                toggleMyList={toggleMyList}
                            />
                        );
                    })}

                    {projects.length === 0 && !loading && (
                        <div className="how-it-works">
                            <h2>Tez kunda</h2>
                            <p style={{ color: '#666', maxWidth: 500, margin: '0 auto' }}>
                                Filmlar katalogi tayyorlanmoqda. Eng yaxshi filmlarning
                                AI tomonidan tahlil qilingan qisqartirilgan versiyalari tez orada qo'shiladi.
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* Auth Modal (ixtiyoriy) */}
            {authModal && (
                <div className="auth-overlay" onClick={() => setAuthModal(false)}>
                    <div className="auth-modal" onClick={e => e.stopPropagation()}>
                        <button className="auth-close" onClick={() => setAuthModal(false)}><X size={20} /></button>
                        <h2>Tezla'ga xush kelibsiz</h2>
                        <p>Sevimli filmlaringizni saqlash va kuzatish uchun tizimga kiring</p>
                        <div className="auth-form">
                            <input type="email" placeholder="Email" className="auth-input" />
                            <input type="password" placeholder="Parol" className="auth-input" />
                            <button className="auth-submit">Kirish</button>
                            <p className="auth-alt">Akkauntingiz yo'qmi? <a href="#" onClick={e => e.preventDefault()}>Ro'yxatdan o'tish</a></p>
                        </div>
                    </div>
                </div>
            )}

            <footer className="home-footer">
                <p>Tezla — AI-powered cinema experience</p>
            </footer>
        </div>
    );
}

/* Netflix-style horizontal scrollable row */
function FilmRow({ title, films, id, myList, toggleMyList }) {
    const scrollRef = useRef(null);
    const scroll = (dir) => {
        if (scrollRef.current) scrollRef.current.scrollBy({ left: dir * 300, behavior: 'smooth' });
    };

    return (
        <div className="films-section" id={id}>
            <h2 className="section-title">{title}</h2>
            <div className="row-wrapper">
                <button className="row-arrow left" onClick={() => scroll(-1)}><ChevronLeft size={28} /></button>
                <div className="films-row" ref={scrollRef}>
                    {films.map(film => (
                        <FilmCard key={film.id} film={film} myList={myList} toggleMyList={toggleMyList} />
                    ))}
                </div>
                <button className="row-arrow right" onClick={() => scroll(1)}><ChevronRight size={28} /></button>
            </div>
        </div>
    );
}

/* Film card with hover preview */
function FilmCard({ film, myList, toggleMyList }) {
    const [hovered, setHovered] = useState(false);
    const inList = myList.includes(film.id);

    return (
        <div
            className="film-card-wrapper"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <Link to={`/film/${film.id}`} className="film-card">
                <div className="card-thumb">
                    {film.poster_url
                        ? <img src={film.poster_url} alt={film.title} />
                        : <div className="card-thumb-placeholder"><Film size={32} color="#444" /></div>
                    }
                    <div className="card-play-btn"><Play size={20} fill="white" /></div>
                    <div className="card-duration-badge">{film.condensedDuration || film.runtime}</div>
                </div>
                <div className="card-info">
                    <p className="card-title">{film.title}</p>
                    <p className="card-meta">
                        {film.year && `${film.year}`}
                        {film.vote_average > 0 && ` · ★ ${film.vote_average.toFixed(1)}`}
                    </p>
                </div>
            </Link>

            {/* Hover expanded info */}
            {hovered && (
                <div className="card-hover-info">
                    <div className="hover-actions">
                        <Link to={`/film/${film.id}`} className="hover-play-btn">
                            <Play size={14} fill="white" />
                        </Link>
                        <button className={`hover-add-btn ${inList ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); toggleMyList(film.id); }}>
                            <Plus size={14} className={inList ? 'rotated' : ''} />
                        </button>
                    </div>
                    <p className="hover-genre">{film.genre}</p>
                </div>
            )}
        </div>
    );
}
