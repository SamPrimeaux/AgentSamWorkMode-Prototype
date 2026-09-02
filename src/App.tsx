import React, { useState, useEffect, useCallback } from 'react';
import { 
  AppMode, 
  FlexLayoutMode,
  ModelChoice, 
  WorkSubTab,
  ChatMessageItem,
  ExecutionLane, 
  PresentationDeck, 
  ClientWebsiteData, 
  DashboardMetric, 
  BrandKitData, 
  CollaboratorAgent 
} from './types';
import {
  createEmptyBrandKit,
  createEmptyCollaborators,
  createEmptyMessages,
  createEmptyMetrics,
  createEmptyPresentation,
  createEmptyWebsite,
} from './lib/emptyState';
import { executeAgentSamTask } from './services/agentEngine';
import { PlatformProvider, usePlatform } from './contexts/PlatformContext';
import { useGitBridge } from './hooks/useGitBridge';
import { useShellBridge } from './hooks/useShellBridge';
import { useArtifactsBridge } from './hooks/useArtifactsBridge';
import { useCmsBridge } from './hooks/useCmsBridge';
import { useTelemetryBridge } from './hooks/useTelemetryBridge';
import { useTerminalBridge } from './hooks/useTerminalBridge';
import { useWorkDiffSession } from './hooks/useWorkDiffSession';
import { ConnectMachineSheet } from './components/workbench/ConnectMachineSheet';
import { targetToExecutionLane } from './components/terminal/TerminalLaneSelector';
import { executionLaneToTarget } from './lib/terminal/terminalLane';

// Configuration and Navigation Architecture
import { ConfigurationProvider, useConfiguration } from './contexts/ConfigurationContext';
import { Sidebar } from './components/navigation/Sidebar';
import { AppSidebar } from './components/navigation/AppSidebar';

// Components
import { MobileStatusBar } from './components/MobileStatusBar';
import { NavigationHeader } from './components/NavigationHeader';
import { ChatView } from './components/ChatView';
import { WorkModeView } from './components/WorkModeView';
import { TerminalDrawer } from './components/TerminalDrawer';
import { PresentationModal } from './components/PresentationModal';
import {
  CfUnifiedCommandPalette,
  useCommandPaletteShortcut,
} from './components/shell/CfUnifiedCommandPalette';
import { cn } from './lib/utils';
import { Smartphone, Columns } from 'lucide-react';

function AppInner() {
  const { config, setActiveBranch: setConfigBranch, setActivePath: setConfigPath } = useConfiguration();
  const platform = usePlatform();
  const { openShellTerminal, runInShellTerminal } = useShellBridge();
  const git = useGitBridge(platform.workspaceId);
  const artifacts = useArtifactsBridge(config.clientBrandName);
  const cms = useCmsBridge(config.clientBrandName);

  // Navigation & View State
  const [mode, setMode] = useState<AppMode>('work');
  const [workSubTab, setWorkSubTab] = useState<WorkSubTab>('workbench');
  const [layoutMode, setLayoutMode] = useState<FlexLayoutMode>('single');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState<boolean>(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [terminalSeedCommand, setTerminalSeedCommand] = useState<string | null>(null);
  const [connectMachineOpen, setConnectMachineOpen] = useState(false);

  // Model & Context (Initialized dynamically from environment-aware config)
  const [selectedModel, setSelectedModel] = useState<ModelChoice>(config.defaultModel);
  const [activeBranch, setActiveBranchState] = useState<string>(config.defaultBranch);
  const [activePath, setActivePathState] = useState<string>(config.defaultPath);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Synchronize branch/path changes with context
  const handleBranchChange = (newBranch: string) => {
    setActiveBranchState(newBranch);
    setConfigBranch(newBranch);
    if (git.live) void git.checkoutBranch(newBranch);
  };

  const handlePathChange = (newPath: string) => {
    setActivePathState(newPath);
    setConfigPath(newPath);
  };

  // Workspace Data State — empty until user or API populates
  const [messages, setMessages] = useState<ChatMessageItem[]>(() => createEmptyMessages());
  const [deck, setDeck] = useState<PresentationDeck>(() => createEmptyPresentation(config));
  const [website, setWebsite] = useState<ClientWebsiteData>(() => createEmptyWebsite(config));
  const [metrics, setMetrics] = useState<DashboardMetric[]>(() => createEmptyMetrics());
  const [brandKit, setBrandKit] = useState<BrandKitData>(() => createEmptyBrandKit(config));
  const [collaborators, setCollaborators] = useState<CollaboratorAgent[]>(() => createEmptyCollaborators());
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [localTelemetry, setLocalTelemetry] = useState<any[]>([]);
  const telemetryLogs = useTelemetryBridge(localTelemetry);

  const appendTerminalLine = useCallback((line: string) => {
    setTerminalLogs((prev) => [...prev, line]);
  }, []);

  const terminal = useTerminalBridge({
    workspaceId: platform.workspaceId,
    onOutputLine: appendTerminalLine,
  });

  const workDiff = useWorkDiffSession(platform.workspaceId);

  // Sync live git branch / repo path from platform API
  useEffect(() => {
    if (git.live && git.activeBranch) {
      setActiveBranchState(git.activeBranch);
      setConfigBranch(git.activeBranch);
    }
    if (git.repoFullName) {
      setActivePathState(git.repoFullName);
      setConfigPath(git.repoFullName);
    }
  }, [git.live, git.activeBranch, git.repoFullName, setConfigBranch, setConfigPath]);

  // Hydrate deck / brand from artifact store when available
  useEffect(() => {
    if (artifacts.artifacts.length > 0 && artifacts.deck.slides.length > 0) {
      setDeck(artifacts.deck);
    }
  }, [artifacts.artifacts.length, artifacts.deck.slides.length]);

  useEffect(() => {
    if (artifacts.brandKit.generatedImages.length || artifacts.brandKit.generatedVideos.length) {
      setBrandKit(artifacts.brandKit);
    }
  }, [artifacts.brandKit]);

  useEffect(() => {
    if (cms.website.blocks.length > 0 || cms.website.navLinks.length > 0) {
      setWebsite(cms.website);
    }
  }, [cms.website]);

  // Sync dark mode class with HTML element and localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      try {
        localStorage.setItem('theme', 'dark');
      } catch {}
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      try {
        localStorage.setItem('theme', 'light');
      } catch {}
    }
  }, [isDarkMode]);

  // Handle user sending message / prompt
  const handleSendMessage = async (text: string, model: ModelChoice) => {
    const userMsg: ChatMessageItem = {
      id: 'msg-' + Date.now(),
      role: 'user',
      authorName: config.developerName,
      authorInitials: config.developerInitials,
      authorAvatarBg: 'bg-blue-600 text-white',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: text
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const result = await executeAgentSamTask(text, model);

      if (result.telemetry) {
        setLocalTelemetry((prev) => [...prev, result.telemetry!]);
      }

      const agentMsg: ChatMessageItem = {
        id: 'msg-' + (Date.now() + 1),
        role: 'agent',
        authorName: config.agentName,
        authorInitials: config.agentInitials,
        authorAvatarBg: 'bg-zinc-900 dark:bg-emerald-600 text-white',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: result.text,
        reactions: ['thumbs-up', 'smile', 'clipboard']
      };

      setMessages((prev) => [...prev, agentMsg]);
      void workDiff.refresh(result.text);
    } catch (err: any) {
      const errorMsg: ChatMessageItem = {
        id: 'msg-' + (Date.now() + 1),
        role: 'agent',
        authorName: config.agentName,
        authorInitials: config.agentInitials,
        authorAvatarBg: 'bg-zinc-900 dark:bg-emerald-600 text-white',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: `Execution failed: ${err?.message || 'Unknown error'}.`
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunPaletteCommand = (command: string) => {
    setTerminalSeedCommand(command);
    setIsTerminalOpen(true);
    openShellTerminal('local');
    runInShellTerminal(command, 'local');
    void terminal.execCommand(command);
  };

  const handleOpenTerminal = useCallback(() => {
    setIsTerminalOpen(true);
    openShellTerminal('local');
    void terminal.connectWebSocket();
  }, [openShellTerminal, terminal]);

  const handleConnectMachine = useCallback(() => {
    setConnectMachineOpen(true);
  }, []);

  const handleTerminalLaneChange = useCallback(
    (lane: ExecutionLane) => {
      terminal.setLane(executionLaneToTarget(lane));
    },
    [terminal],
  );

  useCommandPaletteShortcut(() => setCommandPaletteOpen(true));

  return (
    <div className={cn(
      "w-full min-h-screen transition-colors duration-200 flex flex-col items-center justify-center font-sans antialiased overflow-hidden",
      isDarkMode ? "bg-zinc-950 text-zinc-100" : "bg-zinc-100 text-zinc-900"
    )}>
      {/* Top Floating Control Bar for Quick Layout Switch on Large Screens */}
      <aside aria-label="Device Preview and Viewport Controls" className="hidden 2xl:flex fixed top-3 right-6 z-50 items-center gap-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 shadow-xl text-xs font-medium">
        <button
          onClick={() => setLayoutMode(layoutMode === 'split' ? 'single' : 'split')}
          className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
        >
          <Columns size={13} />
          <span>{layoutMode === 'split' ? 'Split FlexFit' : 'Single Pane'}</span>
        </button>
        <span className="text-zinc-300 dark:text-zinc-700">|</span>
        <button
          onClick={() => setLayoutMode(layoutMode === 'phone' ? 'split' : 'phone')}
          className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
        >
          <Smartphone size={13} />
          <span>{layoutMode === 'phone' ? 'Exit Frame' : 'Phone Frame'}</span>
        </button>
      </aside>

      {/* Main Container: FlexFit Desktop Frame vs Phone Bezel */}
      <main className={cn(
        "relative w-full h-screen flex flex-col overflow-hidden transition-all duration-300 shadow-2xl",
        layoutMode === 'phone'
          ? "max-w-[430px] max-h-[910px] my-auto rounded-[44px] border-[10px] border-zinc-900 dark:border-zinc-800 bg-white dark:bg-zinc-950"
          : "max-w-[100vw] h-screen bg-white dark:bg-zinc-950"
      )}>
        {/* Mobile Top Status Bar (Only in phone mode) */}
        {layoutMode === 'phone' && (
          <MobileStatusBar darkMode={isDarkMode} />
        )}

        {/* Top Header Navigation [ Menu Trigger | Breadcrumbs | [ Chat | Work ] | Layout controls | + Connect ] */}
        <NavigationHeader
          mode={mode}
          onModeChange={setMode}
          workSubTab={workSubTab}
          onWorkSubTabChange={setWorkSubTab}
          onQuickAction={() => {}}
          onOpenTerminal={handleOpenTerminal}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          layoutMode={layoutMode}
          onLayoutModeChange={setLayoutMode}
          activeBranch={activeBranch}
          activePath={activePath}
        />

        {/* FlexFit Viewport Core with Remastered Sidebar */}
        <div className="flex-1 flex min-h-0 relative overflow-hidden">
          {/* Remastered Primary Sidebar (Collapsible Rail & Drawer) */}
          <AppSidebar
            currentMode={mode}
            onModeChange={setMode}
            currentWorkSubTab={workSubTab}
            onWorkSubTabChange={setWorkSubTab}
            onOpenTerminal={handleOpenTerminal}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            activePath={activePath}
            activeBranch={activeBranch}
            onBranchChange={handleBranchChange}
            onSelectPreset={(prompt) => handleSendMessage(prompt, selectedModel)}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
            {/* Case 1: Split FlexFit Mode on Desktop (Dual Pane: Chat on Left, Work on Right) */}
            {layoutMode === 'split' ? (
              <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden">
                {/* Left Pane: Chat View */}
                <section 
                  aria-label="Agent Chat Conversation Pane"
                  className={cn(
                    "flex-col h-full overflow-hidden bg-white dark:bg-zinc-950 border-r border-zinc-200/80 dark:border-zinc-800/80 transition-all",
                    "w-full lg:w-[400px] xl:w-[440px] 2xl:w-[480px] shrink-0",
                    mode === 'work' ? "hidden lg:flex" : "flex"
                  )}
                >
                  <ChatView
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    isProcessing={isProcessing}
                    selectedModel={selectedModel}
                    onSelectModel={setSelectedModel}
                    onOpenTerminal={handleOpenTerminal}
                    onNavigateToWork={() => setMode('work')}
                    activeBranch={activeBranch}
                    activePath={activePath}
                    onBranchChange={handleBranchChange}
                    onPathChange={handlePathChange}
                  />
                </section>

                {/* Right Pane: Work Mode Studio View */}
                <section 
                  aria-label="Work Mode Production Studio Pane"
                  className={cn(
                    "flex-1 flex-col h-full min-w-0 overflow-hidden bg-zinc-50/50 dark:bg-black transition-all",
                    mode === 'chat' ? "hidden lg:flex" : "flex"
                  )}
                >
                  <WorkModeView
                    subTab={workSubTab}
                    onSubTabChange={setWorkSubTab}
                    deck={deck}
                    onUpdateDeck={setDeck}
                    website={website}
                    onUpdateWebsite={setWebsite}
                    metrics={metrics}
                    brandKit={brandKit}
                    onUpdateBrandKit={setBrandKit}
                    collaborators={collaborators}
                    telemetryLogs={telemetryLogs}
                    onPresentDeck={() => setIsPresentationOpen(true)}
                    onOpenTerminal={handleOpenTerminal}
                    onConnectMachine={handleConnectMachine}
                    localConnectionActive={terminal.localConnectionActive}
                    onDispatchAgentMessage={(msg) => handleSendMessage(msg, selectedModel)}
                    chatMessages={messages}
                    isAgentProcessing={isProcessing}
                    activePath={activePath}
                    activeBranch={activeBranch}
                    workDiffSession={workDiff.session}
                    workDiffLoading={workDiff.loading}
                    workDiffError={workDiff.error}
                    workDiffSource={workDiff.source}
                    onRefreshWorkDiff={workDiff.refresh}
                  />
                </section>
              </div>
            ) : (
              /* Case 2: Single Maximized View or Phone Mode */
              <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden w-full h-full">
                {mode === 'chat' ? (
                  <ChatView
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    isProcessing={isProcessing}
                    selectedModel={selectedModel}
                    onSelectModel={setSelectedModel}
                    onOpenTerminal={handleOpenTerminal}
                    onNavigateToWork={() => setMode('work')}
                    activeBranch={activeBranch}
                    activePath={activePath}
                    onBranchChange={handleBranchChange}
                    onPathChange={handlePathChange}
                  />
                ) : (
                  <WorkModeView
                    subTab={workSubTab}
                    onSubTabChange={setWorkSubTab}
                    deck={deck}
                    onUpdateDeck={setDeck}
                    website={website}
                    onUpdateWebsite={setWebsite}
                    metrics={metrics}
                    brandKit={brandKit}
                    onUpdateBrandKit={setBrandKit}
                    collaborators={collaborators}
                    telemetryLogs={telemetryLogs}
                    onPresentDeck={() => setIsPresentationOpen(true)}
                    onOpenTerminal={handleOpenTerminal}
                    onConnectMachine={handleConnectMachine}
                    localConnectionActive={terminal.localConnectionActive}
                    onDispatchAgentMessage={(msg) => handleSendMessage(msg, selectedModel)}
                    chatMessages={messages}
                    isAgentProcessing={isProcessing}
                    activePath={activePath}
                    activeBranch={activeBranch}
                    workDiffSession={workDiff.session}
                    workDiffLoading={workDiff.loading}
                    workDiffError={workDiff.error}
                    workDiffSource={workDiff.source}
                    onRefreshWorkDiff={workDiff.refresh}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Terminal Drawer: Floating Slide-Up Sheet with Bottom Mini Dock */}
      <TerminalDrawer
        isOpen={isTerminalOpen}
        onClose={() => setIsTerminalOpen(false)}
        onOpen={handleOpenTerminal}
        activeBranch={activeBranch}
        activePath={activePath}
        customLogs={terminalLogs}
        seedCommand={terminalSeedCommand}
        terminalConnected={terminal.connected}
        authRequired={terminal.authRequired || git.authRequired}
        onExecCommand={(cmd) => void terminal.execCommand(cmd)}
        workspaceId={platform.workspaceId}
        terminalTargetType={terminal.targetType}
        activeLane={targetToExecutionLane(terminal.targetType)}
        onChangeLane={handleTerminalLaneChange}
        localConnectionActive={terminal.localConnectionActive}
        onConnectMachine={handleConnectMachine}
      />

      <ConnectMachineSheet
        isOpen={connectMachineOpen}
        onClose={() => setConnectMachineOpen(false)}
        workspaceId={platform.workspaceId}
        currentLane={terminal.targetType}
        localConnectionActive={terminal.localConnectionActive}
        onChangeLane={(lane) => terminal.setLane(lane)}
        onPaired={() => {
          void terminal.refreshLocalLane();
          void terminal.refreshConfig();
        }}
      />

      <CfUnifiedCommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onRunCommand={handleRunPaletteCommand}
      />

      {/* Client Pitch Presentation Fullscreen Modal */}
      <PresentationModal
        isOpen={isPresentationOpen}
        onClose={() => setIsPresentationOpen(false)}
        deck={deck}
      />
    </div>
  );
}

export default function App() {
  return (
    <ConfigurationProvider>
      <PlatformProvider>
        <Sidebar.Provider defaultCollapsed={false}>
          <AppInner />
        </Sidebar.Provider>
      </PlatformProvider>
    </ConfigurationProvider>
  );
}
