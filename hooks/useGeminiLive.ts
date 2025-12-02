import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { MODEL_NAME, SYSTEM_INSTRUCTION, DEFAULT_VOICE_NAME, FLAGGED_KEYWORDS } from '../constants';
import { ConnectionState, Message, FlaggedEvent } from '../types';
import { createBlob, decode, decodeAudioData } from '../utils/audioUtils';

export const useGeminiLive = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [volume, setVolume] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Initialize voice from localStorage
  const [voiceName, setVoiceName] = useState<string>(() => {
    return localStorage.getItem('maya-voice') || DEFAULT_VOICE_NAME;
  });

  // Initialize state from localStorage if available
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('maya-messages');
      if (saved) {
        return JSON.parse(saved, (key, value) => 
          key === 'timestamp' ? new Date(value) : value
        );
      }
    } catch (e) {
      console.error("Failed to load messages", e);
    }
    return [];
  });

  const [flaggedEvents, setFlaggedEvents] = useState<FlaggedEvent[]>(() => {
    try {
      const saved = localStorage.getItem('maya-events');
      if (saved) {
        return JSON.parse(saved, (key, value) => 
          key === 'timestamp' ? new Date(value) : value
        );
      }
    } catch (e) {
      console.error("Failed to load events", e);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('maya-messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('maya-events', JSON.stringify(flaggedEvents));
  }, [flaggedEvents]);

  useEffect(() => {
    localStorage.setItem('maya-voice', voiceName);
  }, [voiceName]);

  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const currentSessionRef = useRef<any>(null);

  const currentInputTransRef = useRef<string>('');
  const currentOutputTransRef = useRef<string>('');

  const checkForFlags = useCallback((text: string, source: 'user' | 'model') => {
    const lowerText = text.toLowerCase();
    const foundKeyword = FLAGGED_KEYWORDS.find(k => {
      const escapedK = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
      const pattern = new RegExp(`\\b${escapedK}\\b`, 'i');
      return pattern.test(lowerText);
    });
    
    if (foundKeyword) {
      const newEvent: FlaggedEvent = {
        id: Date.now().toString(),
        keyword: foundKeyword,
        context: text,
        timestamp: new Date(),
        severity: ['suicide', 'die', 'kill', 'weapon', 'hurt myself', 'cut myself'].some(k => foundKeyword.includes(k)) 
          ? 'high' 
          : 'medium'
      };
      setFlaggedEvents(prev => [newEvent, ...prev]);
    }
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setFlaggedEvents([]);
    localStorage.removeItem('maya-messages');
    localStorage.removeItem('maya-events');
  }, []);

  const connect = useCallback(async () => {
    console.log("Attempting to connect with voice:", voiceName);
    setError(null);
    let apiKey = '';
    
    // Safety check for API Key access
    try {
      // @ts-ignore - configured via vite define
      apiKey = process.env.API_KEY || '';
    } catch (e) {
      console.error("Environment check failed", e);
      setError("Environment Error: process.env is not defined. Ensure you have a 'vite.config.ts' file and Vercel build configured.");
      return;
    }

    if (!apiKey) {
      console.error("API Key missing");
      setError("API Key is missing. Please check your Vercel Environment Variables.");
      return;
    }

    try {
      setConnectionState(ConnectionState.CONNECTING);
      console.log("Initializing AudioContexts...");
      
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Force resume mainly for mobile browsers
      if (inputAudioContextRef.current.state === 'suspended') {
        await inputAudioContextRef.current.resume();
      }
      if (outputAudioContextRef.current.state === 'suspended') {
        await outputAudioContextRef.current.resume();
      }
      
      const analyser = outputAudioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      outputNodeRef.current = outputAudioContextRef.current.createGain();
      outputNodeRef.current.connect(analyser);
      analyser.connect(outputAudioContextRef.current.destination);

      let stream;
      try {
        console.log("Requesting microphone access...");
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("Microphone access granted.");
      } catch (err) {
        console.error("Microphone error", err);
        setError("Microphone access denied. Please enable microphone permissions in your browser settings.");
        setConnectionState(ConnectionState.DISCONNECTED);
        return;
      }
      
      console.log("Initializing Gemini Client...");
      const ai = new GoogleGenAI({ apiKey });
      
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Connection Opened');
            setConnectionState(ConnectionState.CONNECTED);
            
            if (!inputAudioContextRef.current) return;
            
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            inputSourceRef.current = source;
            
            const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(processor);
            processor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              currentOutputTransRef.current += text;
            } else if (message.serverContent?.inputTranscription) {
               const text = message.serverContent.inputTranscription.text;
               currentInputTransRef.current += text;
            }

            if (message.serverContent?.turnComplete) {
              const userText = currentInputTransRef.current;
              const modelText = currentOutputTransRef.current;

              if (userText.trim()) {
                checkForFlags(userText, 'user');
                setMessages(prev => [...prev, {
                  id: Date.now().toString() + '-user',
                  role: 'user',
                  text: userText,
                  timestamp: new Date()
                }]);
              }
              
              if (modelText.trim()) {
                 setMessages(prev => [...prev, {
                  id: Date.now().toString() + '-model',
                  role: 'model',
                  text: modelText,
                  timestamp: new Date()
                }]);
              }

              currentInputTransRef.current = '';
              currentOutputTransRef.current = '';
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current && outputNodeRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                ctx,
                24000,
                1
              );
              
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNodeRef.current);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(src => {
                src.stop();
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              currentOutputTransRef.current = ''; 
            }
          },
          onclose: (event) => {
            console.log('Gemini Live Connection Closed', event);
            setConnectionState(ConnectionState.DISCONNECTED);
          },
          onerror: (err) => {
            console.error('Gemini Live Error', err);
            setConnectionState(ConnectionState.ERROR);
            setError("Connection error. The service might be temporarily unavailable.");
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } }
          },
          systemInstruction: { parts: [ { text: SYSTEM_INSTRUCTION } ] },
          inputAudioTranscription: { },
          outputAudioTranscription: { },
        }
      });

      sessionPromiseRef.current = sessionPromise;
      sessionPromise.then(session => {
        currentSessionRef.current = session;
      });

    } catch (error: any) {
      console.error("Failed to connect:", error);
      setConnectionState(ConnectionState.ERROR);
      setError(error.message || "An unexpected error occurred.");
    }
  }, [checkForFlags, voiceName]);

  const disconnect = useCallback(() => {
    if (currentSessionRef.current) {
       // Attempt to close session if supported in this SDK version
       try {
         // @ts-ignore
         if (typeof currentSessionRef.current.close === 'function') {
            // @ts-ignore
            currentSessionRef.current.close();
         }
       } catch (e) {
          console.log("Session close method not available");
       }
    }

    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }

    sourcesRef.current.forEach(src => src.stop());
    sourcesRef.current.clear();
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    setConnectionState(ConnectionState.DISCONNECTED);
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    
    const updateVolume = () => {
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const avg = sum / dataArray.length;
        setVolume(avg);
      }
      animationFrameId = requestAnimationFrame(updateVolume);
    };

    if (connectionState === ConnectionState.CONNECTED) {
      updateVolume();
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [connectionState]);

  return {
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
  };
};