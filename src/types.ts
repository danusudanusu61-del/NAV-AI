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

export type AgentTriggerType = 'manual' | 'scheduled' | 'webhook' | 'event';

export interface Reminder {
  id: string;
  taskDescription: string;
  createdAt: string;
  completed: boolean;
}

export interface AgentTool {
  id: string;
  name: string;
  description: string;
  type: 'web_search' | 'code_execution' | 'api_call' | 'data_parser' | 'reminder' | 'custom';
  enabled: boolean;
  config?: Record<string, string>;
}

export interface AgentTaskRun {
  id: string;
  agentId: string;
  taskPrompt: string;
  status: 'running' | 'completed' | 'failed';
  timestamp: string;
  durationMs: number;
  thoughtProcess: string[];
  toolCalls: Array<{
    toolName: string;
    input: any;
    output: any;
    timestamp: string;
  }>;
  output: string;
  tokensUsed: number;
}

export interface AgentSchedule {
  frequency: 'hourly' | 'daily' | 'weekly';
  cronExpression?: string;
  active: boolean;
}

export interface AIAgent {
  id: string;
  name: string;
  description: string;
  role: string;
  goal: string;
  model: string;
  temperature: number;
  systemInstruction: string;
  tools: AgentTool[];
  triggerType: AgentTriggerType;
  schedule?: AgentSchedule;
  autonomousLoop: boolean;
  maxIterations: number;
  status: 'idle' | 'active' | 'running' | 'paused';
  createdAt: string;
  lastRunAt: string | null;
  totalRuns: number;
  memory: Array<{ key: string; value: string; timestamp: string }>;
}
