import React, { useState } from 'react';
import { FlaggedEvent, Message } from '../types';
import { ShieldAlert, CheckCircle, Clock, Settings, Mic2, Lock, X, Trash2, Download } from 'lucide-react';
import { AVAILABLE_VOICES } from '../constants';

interface ParentDashboardProps {
  events: FlaggedEvent[];
  messages: Message[];
  onClose: () => void;
  voiceName: string;
  onVoiceChange: (voice: string) => void;
  onClearHistory: () => void;
}

const ParentDashboard: React.FC<ParentDashboardProps> = ({ events, messages, onClose, voiceName, onVoiceChange, onClearHistory }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '2025') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect PIN');
      setPassword('');
    }
  };

  const handleExport = () => {
    const timestamp = new Date().toLocaleString();
    let report = `MAYA SAFETY REPORT\nGenerated: ${timestamp}\n\n`;
    
    report += `=== FLAGGED EVENTS (${events.length}) ===\n`;
    if (events.length === 0) {
      report += "No safety flags detected.\n";
    } else {
      events.forEach(e => {
        report += `[${e.severity.toUpperCase()}] ${e.timestamp.toLocaleString()} - Keyword: "${e.keyword}"\nContext: "${e.context}"\n\n`;
      });
    }

    report += `\n=== CONVERSATION HISTORY (${messages.length} messages) ===\n`;
    messages.forEach(m => {
      report += `[${m.timestamp.toLocaleString()}] ${m.role.toUpperCase()}: ${m.text}\n`;
    });

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maya-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-slate-900 bg-opacity-95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-700 p-6 relative animate-in fade-in zoom-in duration-300">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="bg-slate-700 p-4 rounded-full shadow-inner">
              <Lock className="w-8 h-8 text-purple-400" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-white">Parent Access</h2>
              <p className="text-slate-400 text-sm mt-1">
                Enter PIN to view Elsa's safety logs
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Enter 4-digit PIN"
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-center text-white text-xl tracking-[0.5em] placeholder:tracking-normal placeholder:text-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                autoFocus
              />
            </div>
            
            {error && (
              <p className="text-rose-500 text-sm text-center font-medium animate-pulse">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-purple-900/20 active:scale-95"
            >
              Unlock Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-700 max-h-[90vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-rose-500" />
            <div>
              <h2 className="text-2xl font-bold text-white">Jean-Michel & Typhanie's Dashboard</h2>
              <p className="text-slate-400 text-sm">Real-time keyword monitoring & Settings</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Settings Section */}
          <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-2 mb-4 text-purple-400">
              <Settings className="w-5 h-5" />
              <h3 className="font-semibold">App Configuration</h3>
            </div>
            
            <div className="space-y-4">
              {/* Voice Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-500/20 p-2 rounded-lg">
                     <Mic2 className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-slate-200 font-medium">Maya's Voice</div>
                    <div className="text-slate-500 text-xs">Choose the persona that fits best.</div>
                  </div>
                </div>
                
                <select 
                  value={voiceName}
                  onChange={(e) => onVoiceChange(e.target.value)}
                  className="bg-slate-800 text-white border border-slate-600 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  {AVAILABLE_VOICES.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data Management Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/20 p-2 rounded-lg">
                     <Download className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-slate-200 font-medium">Export Report</div>
                    <div className="text-slate-500 text-xs">Download logs to view on another device.</div>
                  </div>
                </div>
                <button 
                  onClick={handleExport}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Save as File
                </button>
              </div>

              {/* Clear History */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="bg-rose-500/20 p-2 rounded-lg">
                     <Trash2 className="w-6 h-6 text-rose-400" />
                  </div>
                  <div>
                    <div className="text-slate-200 font-medium">Clear Activity Data</div>
                    <div className="text-slate-500 text-xs">Deletes all chat history and safety logs.</div>
                  </div>
                </div>
                
                {showClearConfirm ? (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowClearConfirm(false)}
                      className="px-3 py-2 text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        onClearHistory();
                        setShowClearConfirm(false);
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      Confirm Delete
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowClearConfirm(true)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Clear History
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Events Section */}
          <div>
            <h3 className="text-slate-300 font-semibold mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Flagged Events
            </h3>
            
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500 border border-slate-800 rounded-xl bg-slate-900/20">
                <CheckCircle className="w-12 h-12 mb-3 text-emerald-500 opacity-50" />
                <p className="text-base">No flagged events detected.</p>
                <p className="text-xs">Elsa's conversations appear normal.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div 
                    key={event.id}
                    className={`p-4 rounded-xl border ${
                      event.severity === 'high' 
                        ? 'bg-rose-900/20 border-rose-500/50' 
                        : 'bg-amber-900/20 border-amber-500/50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                         <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                           event.severity === 'high' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-black'
                         }`}>
                           {event.severity}
                         </span>
                         <span className="text-slate-300 font-mono text-sm">
                           Timestamp: {event.timestamp.toLocaleTimeString()}
                         </span>
                      </div>
                    </div>
                    <div className="text-white font-medium mb-1">
                      Detected: <span className="text-rose-400">"{event.keyword}"</span>
                    </div>
                    <div className="text-slate-400 text-sm bg-slate-900/50 p-3 rounded-lg italic">
                      "...{event.context}..."
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
        
        <div className="p-4 bg-slate-900/50 border-t border-slate-700 rounded-b-2xl text-xs text-slate-500 flex gap-2 shrink-0">
           <Clock className="w-4 h-4" />
           <span>Monitoring active. Logs are stored locally on this device.</span>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;