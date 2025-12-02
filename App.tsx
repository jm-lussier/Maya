import React, { useState } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive';
import VoiceInterface from './components/VoiceInterface';
import ParentDashboard from './components/ParentDashboard';
import { Lock, Menu } from 'lucide-react';

const App: React.FC = () => {
  const { 
    connectionState, 
    connect, 
    disconnect, 
    messages,
    flaggedEvents, 
    volume,
    error,
    voiceName,
    setVoiceName,
    clearHistory
  } = useGeminiLive();

  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 overflow-hidden relative selection:bg-purple-500 selection:text-white">
      
      {/* Background Gradients */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-900/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Bar */}
      <header className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          {/* Logo or placeholder */}
        </div>
        
        <button 
          onClick={() => setShowDashboard(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-all text-xs text-slate-400 hover:text-slate-200"
        >
          <Lock className="w-3 h-3" />
          <span>Parent Mode</span>
          {flaggedEvents.length > 0 && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          )}
        </button>
      </header>

      {/* Main Interface */}
      <main className="h-screen w-full flex flex-col">
        <VoiceInterface 
          connectionState={connectionState}
          onConnect={connect}
          onDisconnect={disconnect}
          volume={volume}
          messages={messages}
          error={error}
        />
      </main>

      {/* Modals */}
      {showDashboard && (
        <ParentDashboard 
          events={flaggedEvents}
          onClose={() => setShowDashboard(false)}
          voiceName={voiceName}
          onVoiceChange={setVoiceName}
          onClearHistory={clearHistory}
        />
      )}
    </div>
  );
};

export default App;