import React, { useState } from 'react';
import { 
  WorkbenchWorkspace, 
  WorkbenchPullRequest, 
  WorkbenchViewLevel,
  PwaCacheStatus,
  ExecOsLocalLaneStatus,
  ModelChoice,
  ChatMessageItem,
} from '../../types';
import { 
  INITIAL_PWA_CACHE_STATUS,
  INITIAL_EXECOS_STATUS 
} from '../../data/mockWorkbench';
import { WorkbenchDiffSheet } from './WorkbenchDiffSheet';
import { PwaCacheInspectorSheet } from './PwaCacheInspectorSheet';
import { ExecOsLocalLaneSheet } from './ExecOsLocalLaneSheet';
import { FlexFitComposer } from './FlexFitComposer';
import { AgentComputerSurface } from '../browser/AgentComputerSurface';
import { 
  X, 
  Layers, 
  Cpu, 
  Globe, 
  Terminal, 
  Plus, 
  Share2, 
  PanelRight, 
  PanelLeft, 
  ChevronRight, 
  ChevronDown, 
  ThumbsUp, 
  ThumbsDown, 
  Copy, 
  RotateCcw, 
  Volume2, 
  MoreHorizontal, 
  FileCode, 
  ExternalLink, 
  Check, 
  CheckCircle2, 
  AlertCircle,
  Paperclip,
  Sparkles,
  Bot
} from 'lucide-react';
import { useSidebar } from '../navigation/Sidebar';
import { cn } from '../../lib/utils';

interface AgentSamWorkModeProps {
  onDispatchAgentMessage: (message: string) => void;
  onOpenTerminal?: () => void;
  onConnectMachine?: () => void;
  localConnectionActive?: boolean;
  messages?: ChatMessageItem[];
  isProcessing?: boolean;
  activePath?: string;
  activeBranch?: string;
}

export const AgentSamWorkMode: React.FC<AgentSamWorkModeProps> = ({
  onDispatchAgentMessage,
  onOpenTerminal,
  onConnectMachine,
  localConnectionActive = false,
  messages = [],
  isProcessing = false,
  activePath = '',
  activeBranch = 'main',
}) => {
  const { toggleSidebar, isCollapsed } = useSidebar();
  
  // Inspector Drawer State
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isTraceExpanded, setIsTraceExpanded] = useState(false);
  const [repoTitle, setRepoTitle] = useState(activePath || 'Work Mode');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [dislikedMap, setDislikedMap] = useState<Record<string, boolean>>({});

  // Sheet Overlays State
  const [isDiffSheetOpen, setIsDiffSheetOpen] = useState(false);
  const [isCacheInspectorOpen, setIsCacheInspectorOpen] = useState(false);
  const [isExecOsSheetOpen, setIsExecOsSheetOpen] = useState(false);
  const [isAgentComputerOpen, setIsAgentComputerOpen] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<PwaCacheStatus>(INITIAL_PWA_CACHE_STATUS);
  const [execOsStatus, setExecOsStatus] = useState<ExecOsLocalLaneStatus>(INITIAL_EXECOS_STATUS);
  const [selectedModel, setSelectedModel] = useState<ModelChoice>('gemini-3.5-flash');

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleLike = (id: string) => {
    setLikedMap((prev) => ({ ...prev, [id]: !prev[id] }));
    if (dislikedMap[id]) {
      setDislikedMap((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleToggleDislike = (id: string) => {
    setDislikedMap((prev) => ({ ...prev, [id]: !prev[id] }));
    if (likedMap[id]) {
      setLikedMap((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleComposerSubmit = (text: string, model?: ModelChoice) => {
    if (!text.trim()) return;
    onDispatchAgentMessage(text);
    if (model) setSelectedModel(model);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#121214] text-zinc-100 selection:bg-purple-500/30 overflow-hidden font-sans">
      
      {/* 1. Sleek Top Bar (Mac window dots, Repo Title, Share & Inspector Drawer Toggle) */}
      <header className="w-full px-3 sm:px-6 py-2.5 sm:py-3 border-b border-zinc-800/80 bg-[#18181b]/95 backdrop-blur-md flex items-center justify-between z-20 shrink-0 min-h-[52px]">
        {/* Left Side: Window dots + Sidebar Toggle + Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Sidebar Toggle Button */}
          <button
            onClick={toggleSidebar}
            title={isCollapsed ? "Expand Sidebar (⌘B)" : "Collapse Sidebar (⌘B)"}
            aria-label="Toggle App Sidebar"
            className={cn(
              "min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation",
              isCollapsed 
                ? "text-purple-400 bg-purple-500/10 hover:bg-purple-500/20" 
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            )}
          >
            <PanelLeft size={18} />
          </button>

          {/* Repo / Task Title */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-xs sm:text-sm font-semibold text-zinc-200 truncate">
              {repoTitle}
            </span>
            <button 
              onClick={() => {
                const newTitle = prompt('Rename Work Mode Project:', repoTitle);
                if (newTitle) setRepoTitle(newTitle);
              }}
              title="Edit Title"
              aria-label="Rename Project"
              className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg active:scale-95"
            >
              <MoreHorizontal size={15} />
            </button>
          </div>
        </div>

        {/* Right Side: Share + Terminal + Inspector Drawer Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Share Button */}
          <button
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
                alert('Project share link copied to clipboard!');
              }
            }}
            className="flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-all active:scale-95 shadow-xs cursor-pointer touch-manipulation"
          >
            <Share2 size={14} className="text-zinc-400" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Connect machine */}
          <button
            onClick={() => (onConnectMachine ? onConnectMachine() : setIsExecOsSheetOpen(true))}
            title="Pair your machine with agentsam-bridge"
            aria-label="Connect machine"
            className={cn(
              'flex items-center gap-1.5 min-h-[44px] px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-xs cursor-pointer touch-manipulation border',
              localConnectionActive
                ? 'bg-emerald-600/15 text-emerald-300 border-emerald-500/30'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700',
            )}
          >
            <Terminal size={14} className={localConnectionActive ? 'text-emerald-400' : 'text-zinc-400'} />
            <span className="hidden sm:inline">{localConnectionActive ? 'Machine live' : 'Connect machine'}</span>
          </button>

          <button
            onClick={() => setIsAgentComputerOpen(true)}
            title="Open Agent Computer & Live Browser Runtime"
            aria-label="Open Agent Computer"
            className="flex items-center gap-1.5 min-h-[44px] px-3 sm:px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all active:scale-95 shadow-xs cursor-pointer touch-manipulation"
          >
            <Globe size={14} className="text-purple-400" />
            <span className="hidden sm:inline">Agent Computer</span>
          </button>

          {/* Terminal Trigger */}
          {onOpenTerminal && (
            <button
              onClick={onOpenTerminal}
              title="Open Terminal Drawer"
              aria-label="Open Terminal Drawer"
              className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-emerald-400 transition-all text-xs font-mono flex items-center justify-center active:scale-95 cursor-pointer touch-manipulation"
            >
              <Terminal size={16} />
            </button>
          )}

          {/* Inspector Toggle Button */}
          <button
            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
            title={isInspectorOpen ? "Hide Sources & Outputs Panel" : "Show Sources & Outputs Panel"}
            aria-label="Toggle Inspector Panel"
            className={cn(
              "min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer touch-manipulation",
              isInspectorOpen 
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/30" 
                : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
            )}
          >
            <PanelRight size={18} />
          </button>
        </div>
      </header>

      {/* 2. Main Work Mode Canvas Area */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        
        {/* Main Conversation & Execution Stream */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto relative no-scrollbar">
          <div className="w-full max-w-3xl sm:max-w-4xl mx-auto px-4 sm:px-8 pt-6 pb-36 space-y-6 flex-1 flex flex-col">
            {messages.length === 0 && !isProcessing && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-6">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
                  <Bot size={28} className="text-purple-400" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-100 mb-2">Start a work session</h2>
                <p className="text-sm text-zinc-400 max-w-md">
                  Ask Agent Sam to inspect a repo, run commands, review changes, or build assets.
                  {activePath ? ` Connected path: ${activePath}` : ' Set a workspace path in the header to scope execution.'}
                  {activeBranch ? ` Branch: ${activeBranch}.` : ''}
                </p>
              </div>
            )}
            {messages.map((msg) => {
              const isUser = msg.role === 'user';

              if (isUser) {
                return (
                  <div key={msg.id} className="flex justify-end w-full animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <div className="max-w-[85%] sm:max-w-[75%] bg-[#523d85]/90 text-white rounded-[24px] rounded-tr-md px-5 py-3.5 shadow-lg border border-purple-400/20 text-[14px] leading-relaxed font-sans">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="flex flex-col items-start w-full space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  {msg.taskTrace && (
                    <button
                      type="button"
                      onClick={() => setIsTraceExpanded(!isTraceExpanded)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 border border-zinc-700/60 text-xs font-mono transition-all"
                    >
                      <Sparkles size={12} className="text-purple-400" />
                      <span>{msg.taskTrace.title}</span>
                      <ChevronRight 
                        size={12} 
                        className={cn("text-zinc-400 transition-transform duration-200", isTraceExpanded && "rotate-90")} 
                      />
                    </button>
                  )}

                  {isTraceExpanded && msg.taskTrace?.outputSnippet && (
                    <div className="w-full p-3.5 rounded-2xl bg-black/60 border border-zinc-800 font-mono text-xs text-zinc-400 whitespace-pre-wrap animate-in fade-in duration-150">
                      {msg.taskTrace.outputSnippet}
                    </div>
                  )}

                  <div className="w-full space-y-4 text-[14px] leading-relaxed text-zinc-200">
                    <p className="text-zinc-200 leading-normal whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>

                  {/* Message Action Footer Bar */}
                  <div className="flex items-center gap-1 pt-1 text-zinc-400">
                    <button
                      onClick={() => handleToggleLike(msg.id)}
                      title="Good response"
                      className={cn(
                        "p-1.5 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors",
                        likedMap[msg.id] && "text-emerald-400 bg-emerald-500/10"
                      )}
                    >
                      <ThumbsUp size={14} />
                    </button>
                    <button
                      onClick={() => handleToggleDislike(msg.id)}
                      title="Bad response"
                      className={cn(
                        "p-1.5 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors",
                        dislikedMap[msg.id] && "text-rose-400 bg-rose-500/10"
                      )}
                    >
                      <ThumbsDown size={14} />
                    </button>
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      title="Copy message content"
                      className="p-1.5 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                      {copiedId === msg.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                    <button
                      onClick={() => handleComposerSubmit(msg.content)}
                      title="Retry / Regenerate"
                      className="p-1.5 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      onClick={() => {
                        const utterance = new SpeechSynthesisUtterance(msg.content);
                        window.speechSynthesis.speak(utterance);
                      }}
                      title="Read aloud"
                      className="p-1.5 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                      <Volume2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Floating / Docked Inspector Card ("Outputs" & "Sources") */}
        {isInspectorOpen && (
          <>
            {/* Mobile Backdrop Overlay */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 xl:hidden animate-in fade-in duration-150"
              onClick={() => setIsInspectorOpen(false)}
              aria-hidden="true"
            />

            <aside 
              aria-label="Outputs and Sources Inspector"
              className="fixed inset-y-0 right-0 z-40 w-80 max-w-[85vw] xl:static xl:z-10 xl:w-80 shrink-0 h-full p-4 border-l border-zinc-800/80 bg-[#18181b] xl:bg-[#18181b]/95 backdrop-blur-xl flex flex-col gap-4 shadow-2xl xl:shadow-none animate-in slide-in-from-right-4 duration-200"
            >
              {/* Header with Mobile Close */}
              <div className="flex items-center justify-between pb-1 border-b border-zinc-800/60 xl:hidden">
                <span className="text-xs font-bold text-zinc-300">Inspector & Context</span>
                <button
                  type="button"
                  onClick={() => setIsInspectorOpen(false)}
                  aria-label="Close Inspector"
                  className="min-w-[36px] min-h-[36px] w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Outputs Card */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-md space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Outputs</span>
                  <button 
                    onClick={() => setIsAgentComputerOpen(true)}
                    title="Create output"
                    aria-label="Create Output"
                    className="min-w-[36px] min-h-[36px] w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <button
                  onClick={() => setIsAgentComputerOpen(true)}
                  className="w-full min-h-[44px] p-2.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 text-left flex items-center justify-between text-xs text-zinc-300 hover:text-white transition-all group cursor-pointer active:scale-95"
                >
                  <div className="flex items-center gap-2">
                    <FileCode size={16} className="text-purple-400" />
                    <span className="font-medium">Create a file or site</span>
                  </div>
                  <ChevronRight size={14} className="text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* Sources Card */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-md space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Sources</span>
                  <button 
                    onClick={() => setIsExecOsSheetOpen(true)}
                    title="Add source"
                    aria-label="Add Source"
                    className="min-w-[36px] min-h-[36px] w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <button
                    onClick={() => setIsDiffSheetOpen(true)}
                    className="w-full min-h-[40px] p-2.5 rounded-xl bg-zinc-800/40 hover:bg-zinc-800/80 border border-zinc-700/40 text-left flex items-center gap-2 text-xs font-mono text-zinc-300 hover:text-purple-300 transition-colors cursor-pointer active:scale-95"
                  >
                    <span className="text-zinc-500">//</span>
                    <span className="truncate">{activePath || 'No workspace path set'}</span>
                  </button>

                  <button
                    onClick={() => setIsCacheInspectorOpen(true)}
                    className="w-full min-h-[36px] text-left px-2.5 py-1.5 text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  >
                    <ExternalLink size={12} />
                    <span>View all</span>
                  </button>
                </div>
              </div>

              {/* Quick Status / Environment Indicator */}
              <div className="mt-auto p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 text-xs space-y-2 text-zinc-400 font-mono">
                <div className="flex items-center justify-between">
                  <span>Local lane:</span>
                  <button
                    type="button"
                    onClick={() => onConnectMachine?.()}
                    className={cn(
                      'flex items-center gap-1',
                      localConnectionActive ? 'text-emerald-400' : 'text-amber-400 hover:text-amber-300',
                    )}
                  >
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        localConnectionActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400',
                      )}
                    />
                    {localConnectionActive ? 'user_hosted_tunnel' : 'Not paired'}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span>PWA Manifest:</span>
                  <span className="text-zinc-300">Warmed (v2.4)</span>
                </div>
              </div>
            </aside>
          </>
        )}
      </div>

      {/* 4. Bottom Floating FlexFit Composer / Connector Drawer */}
      <div className="absolute bottom-4 left-0 right-0 z-30 pointer-events-auto">
        <FlexFitComposer
          onSendMessage={handleComposerSubmit}
          onOpenTerminal={onOpenTerminal}
          onOpenConnectorDrawer={() => setIsExecOsSheetOpen(true)}
          placeholder="Work with Agent Sam"
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          isProcessing={isProcessing}
        />
      </div>

      {/* 5. Modals & Native Bottom Sheets */}
      {/* Diff Inspector Sheet */}
      <WorkbenchDiffSheet
        isOpen={isDiffSheetOpen}
        onClose={() => setIsDiffSheetOpen(false)}
        pr={{
          id: 'pr-1',
          number: 402,
          title: 'Fix terminal operator policy & drift',
          branch: 'fix/terminal-operator-policy',
          targetBranch: 'main',
          author: 'Agent Sam',
          authorAvatar: 'AS',
          status: 'in_review',
          createdAt: '12m ago',
          updatedAt: 'Just now',
          summary: '+142 -38 lines (4 files)',
          specMarkdown: 'Fix terminal operator policy and reconcile drift in test ratchet.',
          additions: 142,
          deletions: 38,
          files: [
            {
              id: 'f-1',
              filename: 'dispatch.ts',
              path: 'src/server/mcp/dispatch.ts',
              status: 'modified',
              additions: 45,
              deletions: 12,
              diffLines: [
                { type: 'header', content: '@@ -12,8 +12,12 @@ export function dispatchRatchet()' },
                { type: 'del', oldLine: 14, content: '-  logAgentsamMcpToolExecution(toolName);' },
                { type: 'add', newLine: 14, content: '+  // Ratchet log removed for clean execution policy' }
              ]
            }
          ]
        }}
        onSquashAndMerge={() => {
          setIsDiffSheetOpen(false);
          handleComposerSubmit("Squashed and merged PR #402 into main.");
        }}
      />

      {/* PWA Cache Engine Diagnostics Sheet */}
      <PwaCacheInspectorSheet
        isOpen={isCacheInspectorOpen}
        onClose={() => setIsCacheInspectorOpen(false)}
        cacheStatus={cacheStatus}
        onUpdateCacheStatus={setCacheStatus}
      />

      {/* ExecOS Local Lane & PM2 Environment Sanitizer Sheet */}
      <ExecOsLocalLaneSheet
        isOpen={isExecOsSheetOpen}
        onClose={() => setIsExecOsSheetOpen(false)}
        status={execOsStatus}
        onUpdateStatus={setExecOsStatus}
        onRunRemoteCommand={(cmd) => {
          handleComposerSubmit(`[Local Lane ExecOS @ 3099] Executed: ${cmd}`);
        }}
      />

      {/* Agent Computer Unified Environment Modal (Browser + Terminal + Files + Artifacts) */}
      {isAgentComputerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-5xl h-[85vh] flex flex-col bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden">
            <div className="px-4 py-3 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-purple-400" />
                <span className="font-bold text-sm text-white">Agent Computer</span>
                <span className="text-xs text-zinc-400 font-mono">Unified Runtime Layer</span>
              </div>
              <button
                onClick={() => setIsAgentComputerOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-2">
              <AgentComputerSurface
                onOpenTerminalDrawer={onOpenTerminal}
                className="h-full border-none shadow-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
