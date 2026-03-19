import { useState, useEffect, useRef } from 'react';
import { Film, TrendingUp, Percent, Activity, Upload, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import ProjectCard from '../components/Dashboard/ProjectCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function DashboardPage() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const fetchProjects = () => {
        fetch(`${API_URL}/api/projects`)
            .then(res => res.json())
            .then(data => {
                setProjects(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchProjects();
        // Poll every 3s to track processing
        const interval = setInterval(fetchProjects, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleFileDrop = async (file) => {
        if (!file || !file.type.startsWith('video/')) {
            alert('Faqat video fayllar qabul qilinadi');
            return;
        }
        await uploadAndProcess(file);
    };

    const uploadAndProcess = async (file) => {
        setUploading(true);
        setUploadProgress(10);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: formData });
            if (!res.ok) throw new Error('Yuklash muvaffaqiyatsiz');

            const data = await res.json();
            const projectId = data.project.id;
            setUploadProgress(50);

            // Auto-start AI processing
            await fetch(`${API_URL}/api/projects/${projectId}/process`, { method: 'POST' });
            setUploadProgress(100);
            fetchProjects();
        } catch (err) {
            alert('Xato: ' + err.message);
        }
        setUploading(false);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Calculate real stats
    const totalCount = projects.length;
    const avgConfidence = totalCount > 0
        ? (projects.reduce((s, p) => s + (p.confidence || 0), 0) / totalCount).toFixed(1)
        : 0;
    const avgCompression = totalCount > 0
        ? (projects.reduce((s, p) => s + (p.compressionRatio || 0), 0) / totalCount).toFixed(0)
        : 0;
    const avgRetention = totalCount > 0
        ? (projects.reduce((s, p) => s + (p.narrativeRetention || 0), 0) / totalCount).toFixed(1)
        : 0;

    return (
        <div className="page-content">
            <div className={`dashboard ${dragOver ? 'drag-active' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFileDrop(e.dataTransfer.files[0]); }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    style={{ display: 'none' }}
                    onChange={e => e.target.files[0] && handleFileDrop(e.target.files[0])}
                />

                <div className="dashboard-header">
                    <div>
                        <h2>Tezla Studio</h2>
                        <p>AI-condensed video projects dashboard</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        <Upload style={{ width: 16, height: 16 }} />
                        {uploading ? 'Yuklanmoqda...' : 'New Project'}
                    </button>
                </div>

                {uploading && (
                    <div className="global-upload-progress">
                        <div className="progress-bar-track">
                            <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-card-header">
                            <div className="stat-card-icon"><Film /></div>
                        </div>
                        <div className="stat-card-value">{totalCount}</div>
                        <div className="stat-card-label">Total Projects</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-card-header">
                            <div className="stat-card-icon"><Activity /></div>
                        </div>
                        <div className="stat-card-value">{avgConfidence}%</div>
                        <div className="stat-card-label">Avg Confidence</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-card-header">
                            <div className="stat-card-icon"><Percent /></div>
                        </div>
                        <div className="stat-card-value">{avgCompression}%</div>
                        <div className="stat-card-label">Avg Compression</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-card-header">
                            <div className="stat-card-icon"><TrendingUp /></div>
                        </div>
                        <div className="stat-card-value">{avgRetention}%</div>
                        <div className="stat-card-label">Narrative Retention</div>
                    </div>
                </div>

                {/* Projects */}
                <div className="projects-section-header">
                    <h3>Proyektlar</h3>
                </div>

                {projects.length > 0 ? (
                    <div className="projects-grid">
                        {projects.map(project => (
                            <ProjectCard key={project.id} project={project} onRefresh={fetchProjects} />
                        ))}
                    </div>
                ) : !loading && (
                    <div className="upload-area" onClick={() => !uploading && fileInputRef.current?.click()}>
                        <div className="upload-area-icon">
                            <Upload />
                        </div>
                        <h4>Proyektlar yo'q. Video yuklash uchun bosing yoki faylni shu yerga tashlang.</h4>
                        <p>MP4, MKV, AVI qo'llab-quvvatlanadi</p>
                    </div>
                )}
            </div>
        </div>
    );
}
