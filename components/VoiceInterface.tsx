import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, MessageSquare, AlertCircle } from 'lucide-react';
import { ConnectionState, Message } from '../types';
import AudioVisualizer from './AudioVisualizer';

interface VoiceInterfaceProps {
  connectionState: ConnectionState;
  onConnect: () => void;
  onDisconnect: () => void;
  volume: number;
  messages: Message[];
  error: string | null;
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ 
  connectionState, 
  onConnect, 
  onDisconnect, 
  volume,
  messages,
  error 
}) => {
  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isConnecting = connectionState === ConnectionState.CONNECTING;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col items-center justify-between h-full w-full max-w-md mx-auto relative pt-6 pb-6">
      
      {/* Header Info */}
      <div className="text-center space-y-1 z-10 shrink-0">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
          Maya
        </h1>
        <p className="text-slate-400 text-sm">Elsa's Virtual Big Sister</p>
      </div>

      {/* Visualizer Area (Fixed height) */}
      <div className="h-64 shrink-0 flex items-center justify-center w-full relative my-4">
        <AudioVisualizer isActive={isConnected} volume={volume} />
        
        {!isConnected && !isConnecting && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={onConnect}
              className="bg-slate-800/80 backdrop-blur border border-slate-700 p-4 rounded-full text-slate-300 hover:text-white hover:bg-slate-700 transition-all shadow-xl"
            >
              <Mic className="w-8 h-8" />
            </button>
          </div>
        )}

        {isConnecting && (
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
             </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="w-full max-w-[85%] bg-rose-500/10 border border-rose-500/50 rounded-lg p-3 mb-2 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-sm text-rose-200">{error}</p>
        </div>
      )}

      {/* Full Transcript (Flexible height) */}
      <div className="flex-1 w-full px-4 mb-6 overflow-hidden relative min-h-0 bg-slate-900/20 rounded-xl border border-slate-800/50 backdrop-blur-sm">
        <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-[#0f172a] to-transparent z-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-full h-4 bg-gradient-to-t from-[#0f172a] to-transparent z-10 pointer-events-none"></div>
        
        <div className="h-full overflow-y-auto scrollbar-hide space-y-4 p-4">
           {messages.length === 0 && (
             <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
               {isConnected ? "Listening..." : "Start a conversation with Maya"}
             </div>
           )}
           {messages.map((msg) => (
             <div 
                key={msg.id} 
                className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
             >
               <div className={`max-w-[85%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                 <div className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${
                   msg.role === 'user' 
                     ? 'bg-purple-600 text-white rounded-br-none' 
                     : 'bg-slate-700 text-slate-100 rounded-bl-none'
                 }`}>
                   {msg.text}
                 </div>
                 <span className="text-[10px] text-slate-500 mt-1 px-1">
                   {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                 </span>
               </div>
             </div>
           ))}
           <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-6 items-center z-10 shrink-0 h-20">
        {isConnected ? (
          <button
            onClick={onDisconnect}
            className="group flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 bg-rose-500 rounded-full flex items-center justify-center shadow-lg shadow-rose-900/20 group-hover:bg-rose-600 transition-all transform group-hover:scale-105">
              <PhoneOff className="w-8 h-8 text-white" />
            </div>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">End Call</span>
          </button>
        ) : (
          <button
            onClick={onConnect}
            className="group flex flex-col items-center gap-2"
          >
             <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-900/20 group-hover:bg-emerald-600 transition-all transform group-hover:scale-105">
               <Mic className="w-8 h-8 text-white" />
             </div>
             <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Start Chat</span>
          </button>
        )}
      </div>

    </div>
  );
};

export default VoiceInterface;