import React, { useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Save, FileCode } from 'lucide-react';
import { FileTreePanel } from './FileTreePanel';
import { useFileBridge } from '../../hooks/useFileBridge';
import { monacoLanguageForPath } from '../../lib/bridge/fileBridgeApi';
import { cn } from '../../lib/utils';

type WorkbenchEditorProps = {
  className?: string;
  rootPath?: string;
};

export const WorkbenchEditor: React.FC<WorkbenchEditorProps> = ({
  className,
  rootPath = '.',
}) => {
  const files = useFileBridge(rootPath);

  const handleSave = useCallback(async () => {
    await files.save();
  }, [files]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSave]);

  return (
    <div className={cn('flex h-full min-h-[320px] rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-950', className)}>
      <div className="w-52 shrink-0">
        <FileTreePanel
          entries={files.entries}
          currentPath={files.currentPath}
          selectedPath={files.openFile?.path}
          loading={files.loading}
          onNavigate={(p) => void files.refresh(p)}
          onOpenFile={(p) => void files.open(p)}
          onRefresh={() => void files.refresh()}
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between gap-2 bg-zinc-900/80">
          <div className="flex items-center gap-2 min-w-0 text-xs font-mono text-zinc-300">
            <FileCode size={14} className="text-emerald-400 shrink-0" />
            <span className="truncate">{files.openFile?.path || 'Select a file'}</span>
            {files.openFile?.dirty && <span className="text-amber-400">•</span>}
          </div>
          <button
            type="button"
            disabled={!files.openFile}
            onClick={() => void handleSave()}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 disabled:opacity-40"
          >
            <Save size={12} />
            Save
          </button>
        </div>
        {files.error && (
          <div className="px-3 py-2 text-xs text-amber-300 bg-amber-950/30 border-b border-amber-900/40">
            {files.error}
          </div>
        )}
        <div className="flex-1 min-h-0">
          {files.openFile ? (
            <Editor
              height="100%"
              theme="vs-dark"
              language={monacoLanguageForPath(files.openFile.path)}
              value={files.openFile.content}
              onChange={(v) => files.setContent(v ?? '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-zinc-500 p-6 text-center">
              {files.bridgeAvailable
                ? 'Open a file from the tree to edit on your paired machine.'
                : 'Start the bridge: npm run bridge -- run'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
