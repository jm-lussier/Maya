export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
}

export interface FlaggedEvent {
  id: string;
  keyword: string;
  context: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export interface LiveConfig {
  voiceName: string;
}
