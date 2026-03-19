import { Info, Clock, BarChart3, Shield, Users, Heart } from 'lucide-react';
import { getImportanceColor, getImportanceLabel, CHARACTER_COLOR_MAP } from '../../data/mockData';

const EMOTION_COLORS = {
    'wonder': { bg: 'rgba(99, 102, 241, 0.12)', color: '#818cf8' },
    'tension': { bg: 'rgba(239, 68, 68, 0.12)', color: '#f87171' },
    'surprise': { bg: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24' },
    'curiosity': { bg: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa' },
    'neutral': { bg: 'rgba(107, 114, 128, 0.12)', color: '#9ca3af' },
    'serious': { bg: 'rgba(107, 114, 128, 0.12)', color: '#9ca3af' },
    'excitement': { bg: 'rgba(34, 197, 94, 0.12)', color: '#4ade80' },
    'fear': { bg: 'rgba(239, 68, 68, 0.12)', color: '#f87171' },
    'contemplation': { bg: 'rgba(139, 92, 246, 0.12)', color: '#a78bfa' },
    'anger': { bg: 'rgba(239, 68, 68, 0.12)', color: '#f87171' },
    'secrecy': { bg: 'rgba(139, 92, 246, 0.12)', color: '#a78bfa' },
    'urgency': { bg: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24' },
    'calm': { bg: 'rgba(34, 197, 94, 0.12)', color: '#4ade80' },
    'panic': { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' },
    'tenderness': { bg: 'rgba(236, 72, 153, 0.12)', color: '#f472b6' },
    'shock': { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' },
    'disbelief': { bg: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24' },
    'conflict': { bg: 'rgba(239, 68, 68, 0.12)', color: '#f87171' },
    'determination': { bg: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa' },
    'isolation': { bg: 'rgba(107, 114, 128, 0.15)', color: '#9ca3af' },
    'danger': { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' },
    'bravery': { bg: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa' },
    'grief': { bg: 'rgba(139, 92, 246, 0.12)', color: '#a78bfa' },
    'heroism': { bg: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24' },
    'relief': { bg: 'rgba(34, 197, 94, 0.12)', color: '#4ade80' },
    'melancholy': { bg: 'rgba(139, 92, 246, 0.12)', color: '#a78bfa' },
    'hope': { bg: 'rgba(34, 197, 94, 0.12)', color: '#4ade80' },
    'bittersweet': { bg: 'rgba(236, 72, 153, 0.12)', color: '#f472b6' },
    'closure': { bg: 'rgba(107, 114, 128, 0.12)', color: '#9ca3af' },
    'mystery': { bg: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' },
    'nostalgia': { bg: 'rgba(236, 72, 153, 0.12)', color: '#f472b6' },
    'beauty': { bg: 'rgba(236, 72, 153, 0.12)', color: '#f472b6' },
    'charm': { bg: 'rgba(236, 72, 153, 0.12)', color: '#f472b6' },
    'joy': { bg: 'rgba(34, 197, 94, 0.12)', color: '#4ade80' },
    'connection': { bg: 'rgba(99, 102, 241, 0.12)', color: '#818cf8' },
    'lighthearted': { bg: 'rgba(34, 197, 94, 0.12)', color: '#4ade80' },
    'sadness': { bg: 'rgba(139, 92, 246, 0.12)', color: '#a78bfa' },
    'romance': { bg: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' },
    'saudade': { bg: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' },
    'intimacy': { bg: 'rgba(236, 72, 153, 0.12)', color: '#f472b6' },
    'frustration': { bg: 'rgba(239, 68, 68, 0.12)', color: '#f87171' },
    'vulnerability': { bg: 'rgba(236, 72, 153, 0.12)', color: '#f472b6' },
    'love': { bg: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' },
    'longing': { bg: 'rgba(139, 92, 246, 0.12)', color: '#a78bfa' },
    'adrenaline': { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' },
    'focus': { bg: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa' },
    'boredom': { bg: 'rgba(107, 114, 128, 0.12)', color: '#9ca3af' },
    'alert': { bg: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24' },
    'intensity': { bg: 'rgba(239, 68, 68, 0.12)', color: '#f87171' },
    'cunning': { bg: 'rgba(139, 92, 246, 0.12)', color: '#a78bfa' },
    'fatigue': { bg: 'rgba(107, 114, 128, 0.12)', color: '#9ca3af' },
    'betrayal': { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' },
    'justice': { bg: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa' },
    'peace': { bg: 'rgba(34, 197, 94, 0.12)', color: '#4ade80' },
    'pain': { bg: 'rgba(239, 68, 68, 0.12)', color: '#f87171' },
    'mundane': { bg: 'rgba(107, 114, 128, 0.12)', color: '#9ca3af' },
    'regret': { bg: 'rgba(139, 92, 246, 0.12)', color: '#a78bfa' },
    'hurt': { bg: 'rgba(239, 68, 68, 0.12)', color: '#f87171' },
    'awkward': { bg: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24' },
    'warmth': { bg: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24' },
    'honesty': { bg: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa' },
    'healing': { bg: 'rgba(34, 197, 94, 0.12)', color: '#4ade80' },
    'tears': { bg: 'rgba(139, 92, 246, 0.12)', color: '#a78bfa' },
    'family': { bg: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24' },
};

export default function ScenePanel({ scene }) {
    if (!scene) {
        return (
            <div className="scene-panel">
                <div className="scene-panel-header">
                    <h3><Info style={{ width: 16, height: 16 }} /> Scene Details</h3>
                </div>
                <div className="scene-panel-content">
                    <div className="scene-empty">
                        <Info />
                        <p>Select a scene on the timeline to view its details, importance score, and AI rationale.</p>
                    </div>
                </div>
            </div>
        );
    }

    const importanceColor = getImportanceColor(scene.importance);
    const importanceLabel = getImportanceLabel(scene.importance);

    return (
        <div className="scene-panel">
            <div className="scene-panel-header">
                <h3><Info style={{ width: 16, height: 16 }} /> Scene Details</h3>
                <span className={`badge ${scene.status === 'keep' ? 'badge-success' : 'badge-danger'}`}>
                    {scene.status === 'keep' ? 'KEEP' : 'CUT'}
                </span>
            </div>
            <div className="scene-panel-content">
                <div className="scene-detail animate-fade-in">

                    {/* Title & Description */}
                    <div className="scene-detail-section">
                        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
                            {scene.label}
                        </h3>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
                            {scene.description}
                        </p>
                    </div>

                    {/* Importance Score */}
                    <div className="scene-detail-section">
                        <div className="scene-detail-section-title">
                            <BarChart3 style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                            Importance Score
                        </div>
                        <div className="scene-importance">
                            <div>
                                <div className="scene-importance-score" style={{ color: importanceColor }}>
                                    {(scene.importance * 100).toFixed(0)}
                                </div>
                                <div className="scene-importance-label">{importanceLabel}</div>
                            </div>
                            <div className="scene-importance-bar">
                                <div
                                    className="scene-importance-bar-fill"
                                    style={{ width: `${scene.importance * 100}%`, background: importanceColor }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* AI Rationale */}
                    <div className="scene-detail-section">
                        <div className="scene-detail-section-title">AI Rationale</div>
                        <div className="scene-rationale">{scene.rationale}</div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="scene-detail-section">
                        <div className="scene-detail-section-title">
                            <Clock style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                            Timestamps
                        </div>
                        <div className="scene-meta-grid">
                            <div className="scene-meta-item">
                                <label>Start</label>
                                <span>{scene.start}</span>
                            </div>
                            <div className="scene-meta-item">
                                <label>End</label>
                                <span>{scene.end}</span>
                            </div>
                            <div className="scene-meta-item">
                                <label>Confidence</label>
                                <span style={{ color: scene.confidence >= 0.9 ? 'var(--color-success)' : 'var(--accent-warm)' }}>
                                    {(scene.confidence * 100).toFixed(0)}%
                                </span>
                            </div>
                            <div className="scene-meta-item">
                                <label>Phase</label>
                                <span style={{ textTransform: 'capitalize' }}>{scene.narrativePhase}</span>
                            </div>
                        </div>
                    </div>

                    {/* Characters */}
                    {scene.characters.length > 0 && (
                        <div className="scene-detail-section">
                            <div className="scene-detail-section-title">
                                <Users style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                                Characters
                            </div>
                            <div className="scene-characters">
                                {scene.characters.map(char => (
                                    <span key={char} className="scene-character-tag">
                                        <span
                                            className="scene-character-dot"
                                            style={{ background: CHARACTER_COLOR_MAP[char] || '#6b7280' }}
                                        />
                                        {char.charAt(0).toUpperCase() + char.slice(1).replace('-', ' ')}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Emotions */}
                    {scene.emotions.length > 0 && (
                        <div className="scene-detail-section">
                            <div className="scene-detail-section-title">
                                <Heart style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                                Emotions
                            </div>
                            <div className="scene-emotions">
                                {scene.emotions.map(emotion => {
                                    const emotionStyle = EMOTION_COLORS[emotion] || { bg: 'rgba(107, 114, 128, 0.12)', color: '#9ca3af' };
                                    return (
                                        <span
                                            key={emotion}
                                            className="scene-emotion-tag"
                                            style={{ background: emotionStyle.bg, color: emotionStyle.color }}
                                        >
                                            {emotion}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Transition */}
                    <div className="scene-detail-section">
                        <div className="scene-detail-section-title">
                            <Shield style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                            Transition
                        </div>
                        <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                            {scene.transition}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
