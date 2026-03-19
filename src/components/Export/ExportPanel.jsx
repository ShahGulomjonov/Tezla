import { useState } from 'react';
import { Download, FileVideo, Monitor, Clock, CheckCircle, AlertTriangle, XCircle, FileJson, Shield } from 'lucide-react';
import { qcReports } from '../../data/mockData';

export default function ExportPanel({ project }) {
    const [format, setFormat] = useState('h264');
    const [resolution, setResolution] = useState('1080p');
    const [exporting, setExporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showManifest, setShowManifest] = useState(false);

    const qc = qcReports[project.id] || qcReports['proj-001'];

    const handleExport = () => {
        setExporting(true);
        setProgress(0);
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setExporting(false);
                    return 100;
                }
                return prev + Math.random() * 8 + 2;
            });
        }, 200);
    };

    const manifest = {
        title: project.title,
        format: format.toUpperCase(),
        resolution,
        originalDuration: project.runtime,
        condensedDuration: project.condensedDuration,
        compressionRatio: project.compressionRatio,
        confidence: project.confidence,
        scenesKept: project.scenes.filter(s => s.status === 'keep').length,
        scenesTotal: project.scenes.length,
        cuts: project.scenes.filter(s => s.status === 'keep').map(s => ({
            id: s.id,
            label: s.label,
            start: s.start,
            end: s.end,
            importance: s.importance,
            rationale: s.rationale,
            confidence: s.confidence,
        })),
    };

    const qcIcon = (status) => {
        switch (status) {
            case 'pass': return <div className="qc-item-icon pass"><CheckCircle /></div>;
            case 'warning': return <div className="qc-item-icon warning"><AlertTriangle /></div>;
            case 'fail': return <div className="qc-item-icon fail"><XCircle /></div>;
            default: return null;
        }
    };

    return (
        <div className="export-panel">
            {/* Format Selection */}
            <div className="export-section">
                <div className="export-section-header">
                    <FileVideo />
                    <h4>Output Format</h4>
                </div>
                <div className="export-formats">
                    <div
                        className={`export-format-option ${format === 'h264' ? 'selected' : ''}`}
                        onClick={() => setFormat('h264')}
                    >
                        <h5>H.264 / AVC</h5>
                        <p>Maximum compatibility</p>
                    </div>
                    <div
                        className={`export-format-option ${format === 'hevc' ? 'selected' : ''}`}
                        onClick={() => setFormat('hevc')}
                    >
                        <h5>HEVC / H.265</h5>
                        <p>Better compression</p>
                    </div>
                    <div
                        className={`export-format-option ${format === 'prores' ? 'selected' : ''}`}
                        onClick={() => setFormat('prores')}
                    >
                        <h5>ProRes 422</h5>
                        <p>Professional editing</p>
                    </div>
                </div>
            </div>

            {/* Resolution */}
            <div className="export-section">
                <div className="export-section-header">
                    <Monitor />
                    <h4>Resolution</h4>
                </div>
                <div className="export-resolutions">
                    {['720p', '1080p', '1440p', '4K'].map(res => (
                        <button
                            key={res}
                            className={`export-resolution ${resolution === res ? 'selected' : ''}`}
                            onClick={() => setResolution(res)}
                        >
                            {res}
                        </button>
                    ))}
                </div>
            </div>

            {/* Duration Target */}
            <div className="export-section">
                <div className="export-section-header">
                    <Clock />
                    <h4>Target Duration</h4>
                </div>
                <div className="export-duration">
                    <label>Duration</label>
                    <input type="range" min={300} max={1200} defaultValue={900} />
                    <span className="export-duration-value">15:00</span>
                </div>
            </div>

            {/* Export Button + Progress */}
            <div className="export-section" style={{ textAlign: 'center' }}>
                {!exporting && progress < 100 && (
                    <button className="btn btn-lg btn-primary" onClick={handleExport} style={{ width: '100%' }}>
                        <Download style={{ width: 18, height: 18 }} />
                        Export Condensed Version
                    </button>
                )}
                {exporting && (
                    <div className="export-progress">
                        <div className="export-progress-bar">
                            <div className="export-progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
                        </div>
                        <div className="export-progress-label">
                            <span>Rendering condensed video...</span>
                            <span>{Math.min(Math.floor(progress), 100)}%</span>
                        </div>
                    </div>
                )}
                {progress >= 100 && !exporting && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <CheckCircle style={{ width: 40, height: 40, color: 'var(--color-success)' }} />
                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-success)', fontWeight: 600 }}>
                            Export Complete!
                        </span>
                        <button className="btn btn-sm btn-ghost" onClick={() => setProgress(0)}>Export Again</button>
                    </div>
                )}
            </div>

            {/* Manifest Viewer */}
            <div className="export-section">
                <div className="export-section-header" style={{ cursor: 'pointer' }} onClick={() => setShowManifest(!showManifest)}>
                    <FileJson />
                    <h4>Cut-List Manifest (JSON)</h4>
                    <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                        {showManifest ? '▼' : '▶'}
                    </span>
                </div>
                {showManifest && (
                    <div className="manifest-viewer">
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {JSON.stringify(manifest, null, 2)}
                        </pre>
                    </div>
                )}
            </div>

            {/* QC Report */}
            <div className="export-section">
                <div className="export-section-header">
                    <Shield />
                    <h4>Quality Control Report</h4>
                </div>
                <div className="qc-report">
                    {Object.values(qc).map((item, idx) => (
                        <div className="qc-item" key={idx}>
                            {qcIcon(item.status)}
                            <div className="qc-item-info">
                                <div className="qc-item-label">{item.label}</div>
                                <div className="qc-item-value">{item.value}</div>
                            </div>
                            <span className="qc-item-status" style={{
                                color: item.status === 'pass' ? 'var(--color-success)' :
                                    item.status === 'warning' ? 'var(--color-warning)' : 'var(--color-danger)'
                            }}>
                                {item.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
