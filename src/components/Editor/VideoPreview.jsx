import { Film, Play, Pause, SkipBack, SkipForward, Volume2, Maximize } from 'lucide-react';
import { useState } from 'react';

export default function VideoPreview({ scene, projectTitle }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(25);

    return (
        <div className="video-preview">
            <div className="video-preview-container">
                <div className="video-frame">
                    {scene ? (
                        <>
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: `linear-gradient(${135 + Math.random() * 90}deg, 
                    hsl(${220 + scene.importance * 40}, 30%, ${8 + scene.importance * 5}%) 0%, 
                    hsl(${260 + scene.importance * 30}, 25%, ${12 + scene.importance * 5}%) 50%, 
                    hsl(${200 + scene.importance * 20}, 35%, ${6 + scene.importance * 3}%) 100%)`,
                                    transition: 'background var(--transition-slow)',
                                }}
                            />
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 1,
                            }}>
                                <Film style={{ width: 80, height: 80, color: 'rgba(255,255,255,0.08)' }} />
                            </div>
                            <div className="video-scene-overlay">
                                <div className="video-scene-info">
                                    <h4>{scene.label}</h4>
                                    <span>{scene.start} — {scene.end}</span>
                                </div>
                                <span className="badge badge-accent" style={{ fontSize: 10 }}>
                                    Scene {scene.id.replace('s', '#')}
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className="video-frame-placeholder">
                            <Film />
                            <span>Select a scene to preview</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="video-controls">
                <div className="video-controls-left">
                    <button className="btn btn-icon btn-ghost" onClick={() => { }}>
                        <SkipBack style={{ width: 14, height: 14 }} />
                    </button>
                    <button className="play-btn" onClick={() => setIsPlaying(!isPlaying)}>
                        {isPlaying ? <Pause /> : <Play style={{ marginLeft: 2 }} />}
                    </button>
                    <button className="btn btn-icon btn-ghost" onClick={() => { }}>
                        <SkipForward style={{ width: 14, height: 14 }} />
                    </button>
                    <span className="video-time">
                        {scene ? scene.start : '00:00:00'} / {scene ? scene.end : '00:00:00'}
                    </span>
                </div>

                <div
                    className="video-seekbar"
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pct = ((e.clientX - rect.left) / rect.width) * 100;
                        setProgress(Math.max(0, Math.min(100, pct)));
                    }}
                >
                    <div className="video-seekbar-fill" style={{ width: `${progress}%` }} />
                </div>

                <div className="video-controls-right">
                    <button className="btn btn-icon btn-ghost">
                        <Volume2 style={{ width: 14, height: 14 }} />
                    </button>
                    <button className="btn btn-icon btn-ghost">
                        <Maximize style={{ width: 14, height: 14 }} />
                    </button>
                </div>
            </div>
        </div>
    );
}
