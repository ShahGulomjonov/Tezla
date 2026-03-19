import { Check, X, ArrowRightLeft, RotateCcw, Sparkles } from 'lucide-react';

export default function CutControls({ scene, onStatusChange }) {
    if (!scene) return null;

    return (
        <div className="cut-controls">
            <div className="cut-controls-header">
                <h4>Cut Decision</h4>
                <span className="mono" style={{ color: 'var(--text-tertiary)' }}>
                    {scene.id.toUpperCase()} — {scene.label}
                </span>
            </div>

            <div className="cut-controls-actions">
                <button
                    className={`btn btn-sm ${scene.status === 'keep' ? 'btn-success' : 'btn-ghost'}`}
                    onClick={() => onStatusChange(scene.id, 'keep')}
                    title="Keep this scene in condensed version"
                >
                    <Check style={{ width: 14, height: 14 }} />
                    Keep
                </button>
                <button
                    className={`btn btn-sm ${scene.status === 'cut' ? 'btn-danger' : 'btn-ghost'}`}
                    onClick={() => onStatusChange(scene.id, 'cut')}
                    title="Remove this scene from condensed version"
                >
                    <X style={{ width: 14, height: 14 }} />
                    Cut
                </button>
                <button
                    className="btn btn-sm btn-ghost"
                    title="Swap with the next-highest-scoring candidate"
                >
                    <ArrowRightLeft style={{ width: 14, height: 14 }} />
                    Swap
                </button>
            </div>

            <div className="cut-controls-row">
                <select className="transition-select">
                    <option value="cut">Hard Cut</option>
                    <option value="dissolve">Dissolve (0.5s)</option>
                    <option value="fade">Fade to Black</option>
                    <option value="wipe">Wipe</option>
                </select>

                <button className="btn btn-sm btn-ghost" title="Regenerate cut around this scene only">
                    <RotateCcw style={{ width: 13, height: 13 }} />
                    Regen
                </button>
                <button className="btn btn-sm btn-primary" title="AI suggest best action">
                    <Sparkles style={{ width: 13, height: 13 }} />
                    AI
                </button>
            </div>
        </div>
    );
}
