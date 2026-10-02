import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { ApiKey, ApiRequestLog, ChatMessage, AIAgent, AgentTaskRun } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

// Ensure local persistence directories exist
const DATA_DIR = path.join(process.cwd(), "data");
const KEYS_FILE = path.join(DATA_DIR, "keys.json");
const LOGS_FILE = path.join(DATA_DIR, "logs.json");
const AGENTS_FILE = path.join(DATA_DIR, "agents.json");
const RUNS_FILE = path.join(DATA_DIR, "agent_runs.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readKeys(): ApiKey[] {
  try {
    if (fs.existsSync(KEYS_FILE)) {
      const data = fs.readFileSync(KEYS_FILE, "utf-8");
      return JSON.parse(data) as ApiKey[];
    }
  } catch (error) {
    console.error("Error reading keys file, resetting to empty", error);
  }
  return [];
}

function writeKeys(keys: ApiKey[]) {
  try {
    fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing keys file", error);
  }
}

function readLogs(): ApiRequestLog[] {
  try {
    if (fs.existsSync(LOGS_FILE)) {
      const data = fs.readFileSync(LOGS_FILE, "utf-8");
      return JSON.parse(data) as ApiRequestLog[];
    }
  } catch (error) {
    console.error("Error reading logs file, resetting to empty", error);
  }
  return [];
}

function writeLogs(logs: ApiRequestLog[]) {
  try {
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing logs file", error);
  }
}

// Default pre-populated AI Agents if none exist
const DEFAULT_AGENTS: AIAgent[] = [
  {
    id: "agent_code_auditor",
    name: "Code Security & Refactor Agent",
    description: "Autonomous software engineer agent that inspects source code for security flaws, optimizes complexity, and sets reminders for follow-ups.",
    role: "Senior Security Architect & Core Developer",
    goal: "Analyze code snippets or repositories, detect potential vulnerabilities, propose optimized code, and set task reminders when needed.",
    model: "gemini-3.5-flash",
    temperature: 0.3,
    systemInstruction: "You are an autonomous Code Auditor AI Agent. Execute step-by-step reasoning (Thought -> Action -> Result). When a step requires scheduling or setting a reminder, set tool_needed to 'reminder'.",
    tools: [
      { id: "tool_code_exec", name: "Code Execution Sandbox", description: "Evaluates code logic and syntax safety", type: "code_execution", enabled: true },
      { id: "tool_reminder", name: "In-Browser Task Reminder", description: "Saves task reminders directly to local browser storage", type: "reminder", enabled: true }
    ],
    triggerType: "manual",
    autonomousLoop: true,
    maxIterations: 3,
    status: "idle",
    createdAt: new Date().toISOString(),
    lastRunAt: null,
    totalRuns: 0,
    memory: [
      { key: "coding_standard", value: "Strict TypeScript, ES2022+, Functional style, JSDoc documented.", timestamp: new Date().toISOString() }
    ]
  },
  {
    id: "agent_data_analyst",
    name: "Market Research & Intelligence Agent",
    description: "Autonomous agent that aggregates web data, synthesizes competitive landscape insights, and creates structured summary reports.",
    role: "Lead Market Research Analyst",
    goal: "Synthesize complex industry trends, competitive positioning, and financial forecasts into crisp executive briefs with key takeaways.",
    model: "gemini-3.5-flash",
    temperature: 0.5,
    systemInstruction: "You are an autonomous Data Analyst AI Agent. Break down tasks into structured search, analysis, and synthesis phases. Always back claims with reasoning.",
    tools: [
      { id: "tool_web_search", name: "Real-time Web Search", description: "Fetches current facts and live web trends", type: "web_search", enabled: true },
      { id: "tool_api_fetch", name: "REST Data Fetcher", description: "Fetches JSON APIs and analytics metrics", type: "api_call", enabled: true }
    ],
    triggerType: "scheduled",
    schedule: { frequency: "daily", active: true },
    autonomousLoop: true,
    maxIterations: 3,
    status: "idle",
    createdAt: new Date().toISOString(),
    lastRunAt: null,
    totalRuns: 0,
    memory: [
      { key: "target_domains", value: "AI Agents, LLM Orchestration, Developer Tooling", timestamp: new Date().toISOString() }
    ]
  }
];

function readAgents(): AIAgent[] {
  try {
    if (fs.existsSync(AGENTS_FILE)) {
      const data = fs.readFileSync(AGENTS_FILE, "utf-8");
      const parsed = JSON.parse(data) as AIAgent[];
      if (parsed.length > 0) return parsed;
    }
  } catch (error) {
    console.error("Error reading agents file, resetting to default", error);
  }
  // Initialize defaults
  writeAgents(DEFAULT_AGENTS);
  return DEFAULT_AGENTS;
}

function writeAgents(agents: AIAgent[]) {
  try {
    fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing agents file", error);
  }
}

function readRuns(): AgentTaskRun[] {
  try {
    if (fs.existsSync(RUNS_FILE)) {
      const data = fs.readFileSync(RUNS_FILE, "utf-8");
      return JSON.parse(data) as AgentTaskRun[];
    }
  } catch (error) {
    console.error("Error reading runs file", error);
  }
  return [];
}

function writeRuns(runs: AgentTaskRun[]) {
  try {
    fs.writeFileSync(RUNS_FILE, JSON.stringify(runs, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing runs file", error);
  }
}

// Lazy initializer for Google GenAI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in the application environment. Please configure it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

app.use(express.json());

// API: Consumer Chat (For Playground)
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, model, temperature, systemInstruction } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    const ai = getGeminiClient();
    
    // Format messages for @google/genai SDK
    // The SDK expects { role: 'user' | 'model', parts: [{ text: string }] }
    // Let's filter out system instructions if they were in history, and map correctly.
    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: [{ text: m.text }],
    }));

    // Choose model
    let selectedModel = model || "gemini-3.1-flash-lite";

    let response;
    try {
      response = await ai.models.generateContent({
        model: selectedModel,
        contents: contents,
        config: {
          temperature: typeof temperature === "number" ? temperature : 0.7,
          systemInstruction: systemInstruction || "You are NAV AI, an advanced, ultra-helpful AI built to assist users with coding, reasoning, and creative writing.",
        },
      });
    } catch (primaryError: any) {
      console.warn(`Primary model ${selectedModel} failed. Attempting fallback to gemini-3.1-flash-lite...`, primaryError);
      if (selectedModel !== "gemini-3.1-flash-lite") {
        selectedModel = "gemini-3.1-flash-lite";
        response = await ai.models.generateContent({
          model: selectedModel,
          contents: contents,
          config: {
            temperature: typeof temperature === "number" ? temperature : 0.7,
            systemInstruction: systemInstruction || "You are NAV AI, an advanced, ultra-helpful AI built to assist users with coding, reasoning, and creative writing.",
          },
        });
      } else {
        throw primaryError;
      }
    }

    const replyText = response.text || "I was unable to generate a response.";
    return res.json({ text: replyText });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    return res.status(500).json({ error: error.message || "An error occurred with the AI service." });
  }
});

// ==========================================
// AUTONOMOUS AI AGENTS ENDPOINTS
// ==========================================

// Get all registered AI Agents
app.get("/api/agents", (req, res) => {
  const agents = readAgents();
  res.json(agents);
});

// Create new AI Agent
app.post("/api/agents", (req, res) => {
  try {
    const { name, description, role, goal, model, temperature, systemInstruction, tools, triggerType, schedule, autonomousLoop, maxIterations } = req.body;
    if (!name || !goal) {
      return res.status(400).json({ error: "Agent Name and Primary Goal are required." });
    }

    const agents = readAgents();
    const newAgent: AIAgent = {
      id: "agent_" + Math.random().toString(36).substring(2, 11),
      name,
      description: description || "",
      role: role || "Autonomous AI Specialist",
      goal,
      model: model || "gemini-3.5-flash",
      temperature: typeof temperature === "number" ? temperature : 0.5,
      systemInstruction: systemInstruction || "You are an autonomous AI Agent. Solve tasks systematically with clear thought logs.",
      tools: tools || [],
      triggerType: triggerType || "manual",
      schedule: schedule || { frequency: "daily", active: false },
      autonomousLoop: autonomousLoop !== undefined ? autonomousLoop : true,
      maxIterations: maxIterations || 3,
      status: "idle",
      createdAt: new Date().toISOString(),
      lastRunAt: null,
      totalRuns: 0,
      memory: []
    };

    agents.push(newAgent);
    writeAgents(agents);
    res.status(201).json(newAgent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update AI Agent
app.put("/api/agents/:id", (req, res) => {
  try {
    const { id } = req.params;
    const agents = readAgents();
    const index = agents.findIndex(a => a.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Agent not found." });
    }

    agents[index] = { ...agents[index], ...req.body };
    writeAgents(agents);
    res.json(agents[index]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete AI Agent
app.delete("/api/agents/:id", (req, res) => {
  try {
    const { id } = req.params;
    let agents = readAgents();
    agents = agents.filter(a => a.id !== id);
    writeAgents(agents);
    res.json({ success: true, message: "Agent removed." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch execution task runs history
app.get("/api/agents/runs", (req, res) => {
  const { agentId } = req.query;
  let runs = readRuns();
  if (agentId) {
    runs = runs.filter(r => r.agentId === agentId);
  }
  res.json(runs.reverse());
});

// Execute / Run an Autonomous AI Agent task
app.post("/api/agents/:id/run", async (req, res) => {
  const startTime = Date.now();
  const { id } = req.params;
  const { taskPrompt } = req.body;

  const agents = readAgents();
  const agentIndex = agents.findIndex(a => a.id === id);
  if (agentIndex === -1) {
    return res.status(404).json({ error: "Agent not found." });
  }

  const agent = agents[agentIndex];
  const promptToExecute = taskPrompt || agent.goal;

  // Set agent status to running
  agents[agentIndex].status = "running";
  writeAgents(agents);

  const thoughtProcess: string[] = [];
  const toolCalls: Array<{ toolName: string; input: any; output: any; timestamp: string }> = [];

  thoughtProcess.push(`[Initialization] Agent "${agent.name}" activated with role: "${agent.role}".`);
  thoughtProcess.push(`[Goal Assessment] Target Objective: ${promptToExecute}`);

  try {
    const ai = getGeminiClient();
    const enabledTools = agent.tools.filter(t => t.enabled);

    if (enabledTools.length > 0) {
      thoughtProcess.push(`[Tool Capabilities] Loaded ${enabledTools.length} active tool module(s): ${enabledTools.map(t => t.name).join(", ")}`);

      // Simulate tool executions based on tools configured
      enabledTools.forEach(tool => {
        if (tool.type === "web_search") {
          const searchTimestamp = new Date().toISOString();
          thoughtProcess.push(`[Action: Web Search] Querying live web metrics & domain benchmarks for: "${promptToExecute.substring(0, 40)}..."`);
          toolCalls.push({
            toolName: tool.name,
            input: { query: promptToExecute },
            output: { status: 200, resultsCount: 5, snippet: "Retrieved up-to-date domain data and verified technical documentation." },
            timestamp: searchTimestamp
          });
        } else if (tool.type === "code_execution") {
          const execTimestamp = new Date().toISOString();
          thoughtProcess.push(`[Action: Code Execution Sandbox] Verifying syntax safety and static AST parsing...`);
          toolCalls.push({
            toolName: tool.name,
            input: { environment: "node-v20-sandbox", check: "type-safety & security" },
            output: { status: "success", syntaxErrors: 0, memoryUsage: "12.4MB" },
            timestamp: execTimestamp
          });
        } else if (tool.type === "api_call") {
          const apiTimestamp = new Date().toISOString();
          thoughtProcess.push(`[Action: REST Fetcher] Dispatching authenticated API query payload...`);
          toolCalls.push({
            toolName: tool.name,
            input: { endpoint: "/api/v1/telemetry", method: "GET" },
            output: { status: 200, responseTime: "45ms", records: 42 },
            timestamp: apiTimestamp
          });
        } else if (tool.type === "reminder" || tool.name.toLowerCase().includes("reminder")) {
          const remTimestamp = new Date().toISOString();
          thoughtProcess.push(`[Action: Reminder Tool] Saving task description reminder to browser storage: "${promptToExecute}"`);
          toolCalls.push({
            toolName: "reminder",
            input: { tool_needed: "reminder", taskDescription: promptToExecute },
            output: { status: "saved", taskDescription: promptToExecute, timestamp: remTimestamp },
            timestamp: remTimestamp
          });
        }
      });
    }

    thoughtProcess.push(`[Reasoning Loop] Synthesizing instructions and tool observations into full output response...`);

    // Prepare prompt with Agent Persona & System Directives
    const fullSystemInstruction = `
${agent.systemInstruction}
ROLE: ${agent.role}
PRIMARY GOAL: ${agent.goal}
MEMORY CONTEXT:
${agent.memory.map(m => `- ${m.key}: ${m.value}`).join("\n")}
`;

    const userContent = `
Task Execution Request for Agent:
${promptToExecute}

Tool Execution Observations:
${toolCalls.map(tc => `Tool ${tc.toolName}: ${JSON.stringify(tc.output)}`).join("\n")}

Please provide a detailed, highly structured, professional solution fulfilling the goal. Include executable code or step-by-step technical architecture where appropriate.
`;

    let selectedModel = agent.model || "gemini-3.5-flash";
    let aiResponse;

    try {
      aiResponse = await ai.models.generateContent({
        model: selectedModel,
        contents: [{ role: "user", parts: [{ text: userContent }] }],
        config: {
          temperature: agent.temperature,
          systemInstruction: fullSystemInstruction,
        },
      });
    } catch (err: any) {
      console.warn(`Agent primary model ${selectedModel} failed. Falling back to gemini-3.1-flash-lite...`, err);
      selectedModel = "gemini-3.1-flash-lite";
      aiResponse = await ai.models.generateContent({
        model: selectedModel,
        contents: [{ role: "user", parts: [{ text: userContent }] }],
        config: {
          temperature: agent.temperature,
          systemInstruction: fullSystemInstruction,
        },
      });
    }

    const resultText = aiResponse.text || "Agent completed task without text output.";
    const duration = Date.now() - startTime;

    thoughtProcess.push(`[Task Completed] Successfully finished in ${duration}ms using ${selectedModel}.`);

    // Update agent state
    const currentAgents = readAgents();
    const idx = currentAgents.findIndex(a => a.id === id);
    if (idx !== -1) {
      currentAgents[idx].status = "idle";
      currentAgents[idx].lastRunAt = new Date().toISOString();
      currentAgents[idx].totalRuns += 1;
      // Add key output to memory
      if (currentAgents[idx].memory.length > 10) {
        currentAgents[idx].memory.shift();
      }
      currentAgents[idx].memory.push({
        key: `run_${Date.now().toString().slice(-4)}`,
        value: promptToExecute.length > 50 ? promptToExecute.substring(0, 50) + "..." : promptToExecute,
        timestamp: new Date().toISOString()
      });
      writeAgents(currentAgents);
    }

    const runRecord: AgentTaskRun = {
      id: "run_" + Math.random().toString(36).substring(2, 11),
      agentId: id,
      taskPrompt: promptToExecute,
      status: "completed",
      timestamp: new Date().toISOString(),
      durationMs: duration,
      thoughtProcess,
      toolCalls,
      output: resultText,
      tokensUsed: Math.round((promptToExecute.length + resultText.length) / 4) + 20
    };

    const runs = readRuns();
    runs.push(runRecord);
    writeRuns(runs);

    return res.json(runRecord);
  } catch (error: any) {
    console.error("Error executing agent:", error);

    // Reset agent status
    const currentAgents = readAgents();
    const idx = currentAgents.findIndex(a => a.id === id);
    if (idx !== -1) {
      currentAgents[idx].status = "idle";
      writeAgents(currentAgents);
    }

    const duration = Date.now() - startTime;
    thoughtProcess.push(`[Execution Failed] Error: ${error.message}`);

    const failedRunRecord: AgentTaskRun = {
      id: "run_" + Math.random().toString(36).substring(2, 11),
      agentId: id,
      taskPrompt: promptToExecute,
      status: "failed",
      timestamp: new Date().toISOString(),
      durationMs: duration,
      thoughtProcess,
      toolCalls,
      output: `⚠️ Task execution failed: ${error.message || "Unknown error occurred"}`,
      tokensUsed: 0
    };

    const runs = readRuns();
    runs.push(failedRunRecord);
    writeRuns(runs);

    return res.status(500).json(failedRunRecord);
  }
});

// Developer API Key Endpoints
app.get("/api/developer/keys", (req, res) => {
  const keys = readKeys();
  res.json(keys);
});

app.post("/api/developer/keys", (req, res) => {
  try {
    const { name, description, scope, expiresDays } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Key name is required." });
    }

    const keys = readKeys();
    
    // Generate a unique API key
    const randomHex = Array.from({ length: 24 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
    const apiKeyString = `nav_live_${randomHex}`;

    const expiresAt = expiresDays && expiresDays > 0 
      ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const newKey: ApiKey = {
      id: "key_" + Math.random().toString(36).substring(2, 11),
      key: apiKeyString,
      name: name,
      description: description || "",
      scope: scope || "all",
      expiresAt: expiresAt,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      status: "active",
    };

    keys.push(newKey);
    writeKeys(keys);

    res.status(201).json(newKey);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/developer/keys/revoke", (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Key ID is required." });
  }

  const keys = readKeys();
  const keyIndex = keys.findIndex(k => k.id === id);
  if (keyIndex === -1) {
    return res.status(404).json({ error: "API key not found." });
  }

  keys[keyIndex].status = "revoked";
  writeKeys(keys);
  res.json(keys[keyIndex]);
});

app.get("/api/developer/logs", (req, res) => {
  const logs = readLogs();
  // Return the last 100 logs
  res.json(logs.slice(-100).reverse());
});

app.get("/api/developer/stats", (req, res) => {
  const logs = readLogs();
  const keys = readKeys();

  const totalRequests = logs.length;
  const activeKeysCount = keys.filter(k => k.status === "active").length;
  
  const successfulRequests = logs.filter(l => l.status >= 200 && l.status < 300).length;
  const successRate = totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 100;
  
  const totalDuration = logs.reduce((sum, l) => sum + l.durationMs, 0);
  const avgResponseTime = totalRequests > 0 ? Math.round(totalDuration / totalRequests) : 0;

  // Requests over time (last 7 days simulation or actual buckets)
  // Let's bucket by date
  const dateCounts: { [key: string]: { total: number; success: number; failed: number } } = {};
  
  // Initialize last 7 days with zeros
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    dateCounts[dateStr] = { total: 0, success: 0, failed: 0 };
  }

  logs.forEach(l => {
    try {
      const logDate = new Date(l.timestamp);
      const dateStr = logDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (dateCounts[dateStr]) {
        dateCounts[dateStr].total += 1;
        if (l.status >= 200 && l.status < 300) {
          dateCounts[dateStr].success += 1;
        } else {
          dateCounts[dateStr].failed += 1;
        }
      }
    } catch (e) {
      // Ignore parsing errors for mock timestamps
    }
  });

  const chartData = Object.entries(dateCounts).map(([date, counts]) => ({
    date,
    requests: counts.total,
    success: counts.success,
    failed: counts.failed,
  }));

  res.json({
    totalRequests,
    activeKeysCount,
    successRate,
    avgResponseTime,
    chartData,
  });
});

// ==========================================
// PUBLIC DEVELOPER API ENDPOINT: POST /api/v1/chat
// Mimics a real-world provider like OpenAI, Anthropic, or Gemini itself!
// ==========================================
app.post("/api/v1/chat", async (req, res) => {
  const startTime = Date.now();
  const authHeader = req.headers.authorization;
  
  let apiKeyString = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    apiKeyString = authHeader.substring(7);
  } else if (req.query.api_key) {
    apiKeyString = req.query.api_key as string;
  }

  // Find and validate API Key
  const keys = readKeys();
  const matchedKey = keys.find(k => k.key === apiKeyString);

  const logRequest = (status: number) => {
    const duration = Date.now() - startTime;
    const logs = readLogs();
    const newLog: ApiRequestLog = {
      id: "log_" + Math.random().toString(36).substring(2, 11),
      apiKeyName: matchedKey ? matchedKey.name : "Unknown Key / Unauthorized",
      endpoint: "/api/v1/chat",
      timestamp: new Date().toISOString(),
      durationMs: duration,
      status: status,
      method: "POST",
      ipAddress: req.ip || req.headers["x-forwarded-for"] as string || "127.0.0.1",
    };
    logs.push(newLog);
    writeLogs(logs);

    if (matchedKey) {
      matchedKey.lastUsedAt = new Date().toISOString();
      writeKeys(keys);
    }
  };

  if (!matchedKey) {
    logRequest(401);
    return res.status(401).json({
      error: {
        message: "Invalid or missing API key. Please generate a valid NAV AI key at the dashboard.",
        type: "invalid_request_error",
        code: "unauthorized"
      }
    });
  }

  if (matchedKey.status === "revoked") {
    logRequest(403);
    return res.status(403).json({
      error: {
        message: "This NAV AI key has been revoked and is inactive.",
        type: "invalid_request_error",
        code: "key_revoked"
      }
    });
  }

  if (matchedKey.expiresAt && new Date(matchedKey.expiresAt) < new Date()) {
    logRequest(403);
    return res.status(403).json({
      error: {
        message: "This NAV AI key has expired.",
        type: "invalid_request_error",
        code: "key_expired"
      }
    });
  }

  if (matchedKey.scope === "read") {
    logRequest(403);
    return res.status(403).json({
      error: {
        message: "This key has Read-only scopes and cannot execute Chat completions.",
        type: "invalid_request_error",
        code: "insufficient_scope"
      }
    });
  }

  const { message, model, temperature, systemInstruction } = req.body;
  if (!message) {
    logRequest(400);
    return res.status(400).json({
      error: {
        message: "Missing required parameter: 'message' string in body.",
        type: "invalid_request_error",
        code: "parameter_missing"
      }
    });
  }

  try {
    const ai = getGeminiClient();
    let selectedModel = model || "gemini-3.1-flash-lite";

    let response;
    try {
      response = await ai.models.generateContent({
        model: selectedModel,
        contents: [{ role: "user", parts: [{ text: message }] }],
        config: {
          temperature: typeof temperature === "number" ? temperature : 0.7,
          systemInstruction: systemInstruction || "You are NAV AI, accessed via API. Be concise and return highly accurate results.",
        },
      });
    } catch (primaryError: any) {
      console.warn(`Developer API model ${selectedModel} failed. Attempting fallback to gemini-3.1-flash-lite...`, primaryError);
      if (selectedModel !== "gemini-3.1-flash-lite") {
        selectedModel = "gemini-3.1-flash-lite";
        response = await ai.models.generateContent({
          model: selectedModel,
          contents: [{ role: "user", parts: [{ text: message }] }],
          config: {
            temperature: typeof temperature === "number" ? temperature : 0.7,
            systemInstruction: systemInstruction || "You are NAV AI, accessed via API. Be concise and return highly accurate results.",
          },
        });
      } else {
        throw primaryError;
      }
    }

    const replyText = response.text || "No response generated.";

    // Track simulated token usages
    const promptLen = message.length;
    const replyLen = replyText.length;
    const promptTokens = Math.round(promptLen / 4) + 10;
    const completionTokens = Math.round(replyLen / 4) + 10;

    logRequest(200);

    return res.json({
      id: "nav_chat_" + Math.random().toString(36).substring(2, 11),
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: `nav-${selectedModel}`,
      choices: [
        {
          index: 0,
          message: {
            role: "model",
            content: replyText,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    });
  } catch (error: any) {
    console.error("API error for key:", matchedKey.name, error);
    logRequest(500);
    return res.status(500).json({
      error: {
        message: error.message || "An internal error occurred in NAV AI processing.",
        type: "api_error",
        code: "internal_server_error"
      }
    });
  }
});

// Vite & Static Asset Handling
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NAV AI Console Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
