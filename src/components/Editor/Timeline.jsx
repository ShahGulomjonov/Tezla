import { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Scissors } from 'lucide-react';
import { getImportanceColor } from '../../data/mockData';

export default function Timeline({ scenes, selectedScene, onSelectScene, condensedSeconds, runtimeSeconds }) {
    const [zoom, setZoom] = useState(1);
    const trackRef = useRef(null);

    const keptScenes = scenes.filter(s => s.status === 'keep');
    const keptDuration = keptScenes.reduce((sum, s) => {
        const [sh, sm, ss] = s.start.split(':').map(Number);
        const [eh, em, es] = s.end.split(':').map(Number);
        return sum + ((eh * 3600 + em * 60 + es) - (sh * 3600 + sm * 60 + ss));
    }, 0);
    const budgetUsed = condensedSeconds > 0 ? (keptDuration / condensedSeconds) * 100 : 0;
    const budgetClass = budgetUsed > 110 ? 'danger' : budgetUsed > 100 ? 'warning' : '';

    const totalSegmentWidth = scenes.reduce((sum, scene) => {
        const [sh, sm, ss] = scene.start.split(':').map(Number);
        const [eh, em, es] = scene.end.split(':').map(Number);
        const dur = (eh * 3600 + em * 60 + es) - (sh * 3600 + sm * 60 + ss);
        return sum + dur;
    }, 0);

    const formatBudgetTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    return (
        <div className="timeline-container">
            <div className="timeline-header">
                <div className="timeline-header-left">
                    <h4>Timeline</h4>
                    <div className="timeline-budget">
                        <span className="timeline-budget-label">
                            Budget: {formatBudgetTime(keptDuration)} / {formatBudgetTime(condensedSeconds)}
                        </span>
                        <div className="timeline-budget-bar">
                            <div
                                className={`timeline-budget-fill ${budgetClass}`}
                                style={{ width: `${Math.min(budgetUsed, 100)}%` }}
                            />
                        </div>
                        <span className="timeline-budget-label" style={{
                            color: budgetUsed > 110 ? 'var(--color-danger)' : budgetUsed > 100 ? 'var(--color-warning)' : 'var(--color-success)'
                        }}>
                            {budgetUsed.toFixed(0)}%
                        </span>
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                        {keptScenes.length}/{scenes.length} scenes kept
                    </span>
                </div>
                <div className="timeline-zoom">
                    <button onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>
                        <ZoomOut />
                    </button>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                        {zoom.toFixed(1)}x
                    </span>
                    <button onClick={() => setZoom(Math.min(3, zoom + 0.25))}>
                        <ZoomIn />
                    </button>
                </div>
            </div>

            <div className="timeline-body" ref={trackRef}>
                {/* Ruler */}
                <div className="timeline-ruler" style={{ width: `${totalSegmentWidth * zoom * 1.2}px`, minWidth: '100%' }}>
                    {Array.from({ length: Math.ceil(runtimeSeconds / 300) + 1 }, (_, i) => {
                        const secs = i * 300;
                        const m = Math.floor(secs / 60);
                        const pct = totalSegmentWidth > 0 ? (secs / runtimeSeconds) * totalSegmentWidth * zoom * 1.2 : 0;
                        return (
                            <span key={i} className="timeline-ruler-mark" style={{ left: `${pct}px` }}>
                                {m}:00
                            </span>
                        );
                    })}
                </div>

                {/* Track */}
                <div className="timeline-track" style={{ width: `${totalSegmentWidth * zoom * 1.2}px`, minWidth: '100%' }}>
                    {scenes.map((scene) => {
                        const [sh, sm, ss] = scene.start.split(':').map(Number);
                        const [eh, em, es] = scene.end.split(':').map(Number);
                        const dur = (eh * 3600 + em * 60 + es) - (sh * 3600 + sm * 60 + ss);
                        const segWidth = Math.max(30, dur * zoom * 1.2);
                        const importColor = getImportanceColor(scene.importance);
                        const isSelected = selectedScene?.id === scene.id;
                        const isCut = scene.status === 'cut';

                        return (
                            <div
                                key={scene.id}
                                className={`timeline-segment ${isSelected ? 'selected' : ''} ${isCut ? 'cut' : ''}`}
                                style={{
                                    width: `${segWidth}px`,
                                    background: isCut
                                        ? `repeating-linear-gradient(45deg, ${importColor}22, ${importColor}22 4px, transparent 4px, transparent 8px)`
                                        : `linear-gradient(135deg, ${importColor}cc, ${importColor}88)`,
                                    borderColor: isSelected ? 'white' : 'transparent',
                                }}
                                onClick={() => onSelectScene(scene)}
                                title={`${scene.label} — ${scene.rationale} (${(scene.importance * 100).toFixed(0)}%)`}
                            >
                                {segWidth > 50 && (
                                    <span className="timeline-segment-label">
                                        {isCut && <Scissors style={{ width: 10, height: 10, marginRight: 3, display: 'inline', verticalAlign: 'middle' }} />}
                                        {scene.label}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="timeline-legend">
                <div className="timeline-legend-item">
                    <div className="timeline-legend-color" style={{ background: 'var(--importance-critical)' }} />
                    Critical (90+)
                </div>
                <div className="timeline-legend-item">
                    <div className="timeline-legend-color" style={{ background: 'var(--importance-high)' }} />
                    High (70-89)
                </div>
                <div className="timeline-legend-item">
                    <div className="timeline-legend-color" style={{ background: 'var(--importance-medium)' }} />
                    Medium (50-69)
                </div>
                <div className="timeline-legend-item">
                    <div className="timeline-legend-color" style={{ background: 'var(--importance-low)' }} />
                    Low (30-49)
                </div>
                <div className="timeline-legend-item">
                    <div className="timeline-legend-color" style={{ background: 'var(--importance-skip)', opacity: 0.5 }} />
                    Skip (&lt;30)
                </div>
                <div className="timeline-legend-item">
                    <div className="timeline-legend-color" style={{ background: 'repeating-linear-gradient(45deg, var(--importance-low) 0px, var(--importance-low) 2px, transparent 2px, transparent 4px)' }} />
                    Cut
                </div>
            </div>
        </div>
    );
}
