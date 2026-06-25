export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  model: string;
  temperature: number;
  systemInstruction: string;
}

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  description: string;
  scope: 'all' | 'chat' | 'read';
  expiresAt: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  status: 'active' | 'revoked';
}

export interface ApiRequestLog {
  id: string;
  apiKeyName: string;
  endpoint: string;
  timestamp: string;
  durationMs: number;
  status: number;
  method: string;
  ipAddress?: string;
}
