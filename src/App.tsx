import React, { useState, useEffect } from 'react';
import { 
  AppMode, 
  FlexLayoutMode,
  ModelChoice, 
  WorkSubTab,
  ChatMessageItem, 
  PresentationDeck, 
  ClientWebsiteData, 
  DashboardMetric, 
  BrandKitData, 
  CollaboratorAgent 
} from './types';
import { 
  getDynamicMessages, 
  getDynamicPresentation, 
  getDynamicClientWebsite, 
  getDynamicDashboardMetrics, 
  getDynamicBrandKit, 
  getDynamicCollaborators 
} from './data/mockWorkspace';
import { executeAgentSamTask } from './services/agentEngine';

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
import { cn } from './lib/utils';
import { Smartphone, Columns } from 'lucide-react';

function AppInner() {
  const { config, setActiveBranch: setConfigBranch, setActivePath: setConfigPath } = useConfiguration();

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

  // Model & Context (Initialized dynamically from environment-aware config)
  const [selectedModel, setSelectedModel] = useState<ModelChoice>(config.defaultModel);
  const [activeBranch, setActiveBranchState] = useState<string>(config.defaultBranch);
  const [activePath, setActivePathState] = useState<string>(config.defaultPath);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Synchronize branch/path changes with context
  const handleBranchChange = (newBranch: string) => {
    setActiveBranchState(newBranch);
    setConfigBranch(newBranch);
  };

  const handlePathChange = (newPath: string) => {
    setActivePathState(newPath);
    setConfigPath(newPath);
  };

  // Workspace Data State (Initialized dynamically from environment config)
  const [messages, setMessages] = useState<ChatMessageItem[]>(() => getDynamicMessages(config));
  const [deck, setDeck] = useState<PresentationDeck>(() => getDynamicPresentation(config));
  const [website, setWebsite] = useState<ClientWebsiteData>(() => getDynamicClientWebsite(config));
  const [metrics, setMetrics] = useState<DashboardMetric[]>(() => getDynamicDashboardMetrics(config));
  const [brandKit, setBrandKit] = useState<BrandKitData>(() => getDynamicBrandKit(config));
  const [collaborators, setCollaborators] = useState<CollaboratorAgent[]>(() => getDynamicCollaborators(config));
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [telemetryLogs, setTelemetryLogs] = useState<any[]>([]);

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
      const result = await executeAgentSamTask(text, model, {
        currentSlides: deck.slides,
        currentWebsite: website,
        activeBranch
      });

      // Update workspace artifacts if generated
      if (result.newSlides) {
        setDeck((prev) => ({
          ...prev,
          slides: [...prev.slides, ...result.newSlides!]
        }));
      }

      if (result.websiteUpdates) {
        setWebsite((prev) => ({
          ...prev,
          ...result.websiteUpdates
        }));
      }

      if (result.newImage) {
        setBrandKit((prev) => ({
          ...prev,
          generatedImages: [result.newImage!, ...prev.generatedImages]
        }));
      }

      if (result.newVideo) {
        setBrandKit((prev) => ({
          ...prev,
          generatedVideos: [result.newVideo!, ...prev.generatedVideos]
        }));
      }

      if (result.terminalLogs && result.terminalLogs.length > 0) {
        setTerminalLogs(result.terminalLogs);
      }
      
      if (result.telemetry) {
        setTelemetryLogs((prev) => [...prev, result.telemetry!]);
      }

      const agentMsg: ChatMessageItem = {
        id: 'msg-' + (Date.now() + 1),
        role: 'agent',
        authorName: config.agentName,
        authorInitials: config.agentInitials,
        authorAvatarBg: 'bg-zinc-900 dark:bg-emerald-600 text-white',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: result.text,
        taskTrace: result.trace,
        reactions: ['thumbs-up', 'smile', 'clipboard']
      };

      setMessages((prev) => [...prev, agentMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessageItem = {
        id: 'msg-' + (Date.now() + 1),
        role: 'agent',
        authorName: config.agentName,
        authorInitials: config.agentInitials,
        authorAvatarBg: 'bg-zinc-900 dark:bg-emerald-600 text-white',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: `Encountered an execution exception: ${err?.message || 'Unknown error'}. Retrying with local test suite sandbox.`
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunTestAgain = () => {
    handleSendMessage('npm test -- auth', selectedModel);
  };

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
          onOpenTerminal={() => setIsTerminalOpen(true)}
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
            onOpenTerminal={() => setIsTerminalOpen(true)}
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
                    onOpenTerminal={() => setIsTerminalOpen(true)}
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
                    onOpenTerminal={() => setIsTerminalOpen(true)}
                    onDispatchAgentMessage={(msg) => handleSendMessage(msg, selectedModel)}
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
                    onOpenTerminal={() => setIsTerminalOpen(true)}
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
                    onOpenTerminal={() => setIsTerminalOpen(true)}
                    onDispatchAgentMessage={(msg) => handleSendMessage(msg, selectedModel)}
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
        onOpen={() => setIsTerminalOpen(true)}
        onRunTestAgain={handleRunTestAgain}
        activeBranch={activeBranch}
        activePath={activePath}
        customLogs={terminalLogs}
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
      <Sidebar.Provider defaultCollapsed={false}>
        <AppInner />
      </Sidebar.Provider>
    </ConfigurationProvider>
  );
}
