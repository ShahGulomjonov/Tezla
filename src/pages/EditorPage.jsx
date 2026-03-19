import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, RotateCcw, Eye, Layers } from 'lucide-react';
import VideoPreview from '../components/Editor/VideoPreview';
import ScenePanel from '../components/Editor/ScenePanel';
import CutControls from '../components/Editor/CutControls';
import Timeline from '../components/Editor/Timeline';
import ExportPanel from '../components/Export/ExportPanel';
import { projects } from '../data/mockData';

export default function EditorPage() {
    const { projectId } = useParams();
    const project = projects.find(p => p.id === projectId) || projects[0];

    const [scenes, setScenes] = useState(project.scenes);
    const [selectedScene, setSelectedScene] = useState(null);
    const [showExport, setShowExport] = useState(false);

    const handleStatusChange = useCallback((sceneId, newStatus) => {
        setScenes(prev => prev.map(s =>
            s.id === sceneId ? { ...s, status: newStatus } : s
        ));
        setSelectedScene(prev =>
            prev && prev.id === sceneId ? { ...prev, status: newStatus } : prev
        );
    }, []);

    const handleSelectScene = useCallback((scene) => {
        setSelectedScene(scene);
    }, []);

    const keptCount = scenes.filter(s => s.status === 'keep').length;
    const cutCount = scenes.filter(s => s.status === 'cut').length;

    return (
        <div className="editor">
            {/* Editor Toolbar */}
            <div className="editor-toolbar">
                <div className="editor-toolbar-left">
                    <Link to="/" className="btn btn-sm btn-ghost">
                        <ArrowLeft style={{ width: 14, height: 14 }} />
                        Back
                    </Link>
                    <span className="editor-project-title">{project.title}</span>
                    <span className="editor-project-meta">
                        {project.genre} • {project.runtime} → {project.condensedDuration}
                    </span>
                    <span className="badge badge-success">{keptCount} kept</span>
                    <span className="badge badge-danger">{cutCount} cut</span>
                </div>
                <div className="editor-toolbar-right">
                    <button
                        className={`btn btn-sm ${showExport ? 'btn-accent' : 'btn-ghost'}`}
                        onClick={() => setShowExport(!showExport)}
                    >
                        <Download style={{ width: 14, height: 14 }} />
                        {showExport ? 'Timeline' : 'Export'}
                    </button>
                    <button className="btn btn-sm btn-ghost" title="Reset all cuts to AI defaults">
                        <RotateCcw style={{ width: 14, height: 14 }} />
                        Reset
                    </button>
                    <button className="btn btn-sm btn-ghost">
                        <Eye style={{ width: 14, height: 14 }} />
                        Preview
                    </button>
                    <button className="btn btn-sm btn-primary">
                        <Layers style={{ width: 14, height: 14 }} />
                        Generate Cut
                    </button>
                </div>
            </div>

            {showExport ? (
                <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-6)' }}>
                    <ExportPanel project={{ ...project, scenes }} />
                </div>
            ) : (
                <>
                    {/* Top Area: Video + Scene Panel */}
                    <div className="editor-top">
                        <VideoPreview scene={selectedScene} projectTitle={project.title} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <ScenePanel scene={selectedScene} />
                            <CutControls scene={selectedScene} onStatusChange={handleStatusChange} />
                        </div>
                    </div>

                    {/* Timeline */}
                    <Timeline
                        scenes={scenes}
                        selectedScene={selectedScene}
                        onSelectScene={handleSelectScene}
                        condensedSeconds={project.condensedSeconds}
                        runtimeSeconds={project.runtimeSeconds}
                    />
                </>
            )}
        </div>
    );
}
