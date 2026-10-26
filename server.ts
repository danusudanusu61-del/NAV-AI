import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { ApiKey, ApiRequestLog, ChatMessage } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

// Ensure local persistence directories exist
const DATA_DIR = path.join(process.cwd(), "data");
const KEYS_FILE = path.join(DATA_DIR, "keys.json");
const LOGS_FILE = path.join(DATA_DIR, "logs.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory caches to avoid blocking synchronous disk I/O on every API call/polling request
let keysCache: ApiKey[] | null = null;
let logsCache: ApiRequestLog[] | null = null;

function loadKeysFromDisk(): ApiKey[] {
  try {
    if (fs && fs.existsSync && fs.existsSync(KEYS_FILE)) {
      const data = fs.readFileSync(KEYS_FILE, "utf-8");
      return JSON.parse(data) as ApiKey[];
    }
  } catch (error) {
    console.error("Error reading keys file, resetting to empty", error);
  }
  return [];
}

function loadLogsFromDisk(): ApiRequestLog[] {
  try {
    if (fs && fs.existsSync && fs.existsSync(LOGS_FILE)) {
      const data = fs.readFileSync(LOGS_FILE, "utf-8");
      return JSON.parse(data) as ApiRequestLog[];
    }
  } catch (error) {
    console.error("Error reading logs file, resetting to empty", error);
  }
  return [];
}

function readKeys(): ApiKey[] {
  if (!keysCache) {
    keysCache = loadKeysFromDisk();
  }
  return keysCache;
}

function writeKeys(keys: ApiKey[]) {
  keysCache = keys;
  // Non-blocking asynchronous persistence to disk
  try {
    if (fs && fs.writeFile) {
      fs.writeFile(KEYS_FILE, JSON.stringify(keys, null, 2), "utf-8", (error) => {
        if (error) {
          console.error("Error writing keys file asynchronously", error);
        }
      });
    }
  } catch (error) {
    console.error("Error writing keys file", error);
  }
}

function readLogs(): ApiRequestLog[] {
  if (!logsCache) {
    logsCache = loadLogsFromDisk();
  }
  return logsCache;
}

function writeLogs(logs: ApiRequestLog[]) {
  logsCache = logs;
  // Non-blocking asynchronous persistence to disk
  try {
    if (fs && fs.writeFile) {
      fs.writeFile(LOGS_FILE, JSON.stringify(logs, null, 2), "utf-8", (error) => {
        if (error) {
          console.error("Error writing logs file asynchronously", error);
        }
      });
    }
  } catch (error) {
    console.error("Error writing logs file", error);
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
