import React from 'react';
import { FlaggedEvent } from '../types';
import { ShieldAlert, CheckCircle, Clock } from 'lucide-react';

interface ParentDashboardProps {
  events: FlaggedEvent[];
  onClose: () => void;
}

const ParentDashboard: React.FC<ParentDashboardProps> = ({ events, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-700 max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-rose-500" />
            <div>
              <h2 className="text-2xl font-bold text-white">Jean-Michel & Typhanie's Dashboard</h2>
              <p className="text-slate-400 text-sm">Real-time keyword monitoring for Elsa</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <CheckCircle className="w-16 h-16 mb-4 text-emerald-500 opacity-50" />
              <p className="text-lg">No flagged events detected.</p>
              <p className="text-sm">Elsa's conversations appear normal.</p>
            </div>
          ) : (
            events.map((event) => (
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
            ))
          )}
        </div>
        
        <div className="p-4 bg-slate-900/50 border-t border-slate-700 rounded-b-2xl text-xs text-slate-500 flex gap-2">
           <Clock className="w-4 h-4" />
           <span>Monitoring active. Logs are stored locally for this session only.</span>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;