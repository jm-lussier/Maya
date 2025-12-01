import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { MODEL_NAME, SYSTEM_INSTRUCTION, VOICE_NAME, FLAGGED_KEYWORDS } from '../constants';
import { ConnectionState, Message, FlaggedEvent } from '../types';
import { createBlob, decode, decodeAudioData } from '../utils/audioUtils';

export const useGeminiLive = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [volume, setVolume] = useState<number>(0); // For visualizer

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

  // Persist messages whenever they change
  useEffect(() => {
    localStorage.setItem('maya-messages', JSON.stringify(messages));
  }, [messages]);

  // Persist flagged events whenever they change
  useEffect(() => {
    localStorage.setItem('maya-events', JSON.stringify(flaggedEvents));
  }, [flaggedEvents]);

  // Refs for audio handling to avoid re-renders
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const currentSessionRef = useRef<any>(null); // To track active session for cleanup

  // Transcription accumulation
  const currentInputTransRef = useRef<string>('');
  const currentOutputTransRef = useRef<string>('');

  const checkForFlags = useCallback((text: string, source: 'user' | 'model') => {
    const lowerText = text.toLowerCase();
    
    // Use word boundaries (\b) to ensure we match whole words
    // e.g., "skill" won't trigger "kill", but "kill myself" will trigger "kill"
    const foundKeyword = FLAGGED_KEYWORDS.find(k => {
      // Escape potential regex special characters in keyword (simple implementation)
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
        // Determine severity based on keyword category
        severity: ['suicide', 'die', 'kill', 'weapon', 'hurt myself', 'cut myself'].some(k => foundKeyword.includes(k)) 
          ? 'high' 
          : 'medium'
      };
      setFlaggedEvents(prev => [newEvent, ...prev]);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!process.env.API_KEY) {
      console.error("API Key not found");
      return;
    }

    try {
      setConnectionState(ConnectionState.CONNECTING);
      
      // Initialize Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const analyser = outputAudioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      outputNodeRef.current = outputAudioContextRef.current.createGain();
      outputNodeRef.current.connect(analyser);
      analyser.connect(outputAudioContextRef.current.destination);

      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Connection Opened');
            setConnectionState(ConnectionState.CONNECTED);
            
            // Setup Input Processing
            if (!inputAudioContextRef.current) return;
            
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            inputSourceRef.current = source;
            
            // 4096 buffer size for balance between latency and performance
            const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              
              // Send audio to Gemini
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(processor);
            processor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Transcription
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

            // Handle Audio Output
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

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              console.log("Model interrupted");
              sourcesRef.current.forEach(src => {
                src.stop();
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              currentOutputTransRef.current = ''; // Clear stale transcription
            }
          },
          onclose: () => {
            console.log('Gemini Live Connection Closed');
            setConnectionState(ConnectionState.DISCONNECTED);
          },
          onerror: (err) => {
            console.error('Gemini Live Error', err);
            setConnectionState(ConnectionState.ERROR);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } }
          },
          systemInstruction: SYSTEM_INSTRUCTION,
          inputAudioTranscription: { model: MODEL_NAME },
          outputAudioTranscription: { model: MODEL_NAME },
        }
      });

      sessionPromiseRef.current = sessionPromise;
      sessionPromise.then(session => {
        currentSessionRef.current = session;
      });

    } catch (error) {
      console.error("Failed to connect:", error);
      setConnectionState(ConnectionState.ERROR);
    }
  }, [checkForFlags]);

  const disconnect = useCallback(() => {
    // Stop Microphone
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

    // Stop Output
    sourcesRef.current.forEach(src => src.stop());
    sourcesRef.current.clear();
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    // Close Session
    if (currentSessionRef.current) {
      // Note: SDK session closure is handled by context destruction largely,
      // but explicit close calls can be added if SDK supports it in future versions.
    }
    
    setConnectionState(ConnectionState.DISCONNECTED);
  }, []);

  // Visualizer loop
  useEffect(() => {
    let animationFrameId: number;
    
    const updateVolume = () => {
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume
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
    volume // 0-255 scale
  };
};