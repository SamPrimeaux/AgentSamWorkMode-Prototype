import React from 'react';
import { ChevronRight, File, Folder, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { FileEntry } from '../../lib/bridge/fileBridgeApi';

type FileTreePanelProps = {
  entries: FileEntry[];
  currentPath: string;
  selectedPath?: string | null;
  loading?: boolean;
  onNavigate: (path: string) => void;
  onOpenFile: (path: string) => void;
  onRefresh: () => void;
};

export const FileTreePanel: React.FC<FileTreePanelProps> = ({
  entries,
  currentPath,
  selectedPath,
  loading,
  onNavigate,
  onOpenFile,
  onRefresh,
}) => {
  const parent = currentPath === '.' ? null : currentPath.split('/').slice(0, -1).join('.') || '.';

  return (
    <div className="h-full flex flex-col bg-zinc-950 border-r border-zinc-800">
      <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono text-zinc-400 truncate" title={currentPath}>
          {currentPath}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-400"
          title="Refresh"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto text-xs font-mono">
        {parent != null && (
          <button
            type="button"
            onClick={() => onNavigate(parent)}
            className="w-full px-3 py-1.5 flex items-center gap-2 text-zinc-400 hover:bg-zinc-900"
          >
            <ChevronRight size={12} className="rotate-180" />
            ..
          </button>
        )}
        {entries.map((entry) => {
          const isDir = entry.kind === 'directory';
          const selected = selectedPath === entry.path;
          return (
            <button
              key={entry.path}
              type="button"
              onClick={() => (isDir ? onNavigate(entry.path) : onOpenFile(entry.path))}
              className={cn(
                'w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-zinc-900',
                selected ? 'bg-zinc-900 text-emerald-300' : 'text-zinc-300',
              )}
            >
              {isDir ? <Folder size={12} className="text-amber-400 shrink-0" /> : <File size={12} className="text-blue-400 shrink-0" />}
              <span className="truncate">{entry.name}</span>
            </button>
          );
        })}
        {entries.length === 0 && !loading && (
          <div className="px-3 py-4 text-zinc-500 text-[11px]">No files — run agentsam-bridge</div>
        )}
      </div>
    </div>
  );
};
