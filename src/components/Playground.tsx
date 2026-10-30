import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, Sparkles, Terminal, Copy, Check, Info, Settings, 
  Trash2, Plus, MessageSquare, Code2, PenTool, Lightbulb, Bot, User 
} from "lucide-react";
import { ChatMessage, ChatSession } from "../types";

interface PlaygroundProps {
  sessions: ChatSession[];
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
}

const MODELS = [
  { id: "gemini-3.5-flash", name: "NAV Flash (Standard)", desc: "Hyper-fast, balanced intelligence for general tasks" },
  { id: "gemini-3.1-pro-preview", name: "NAV Pro (Advanced)", desc: "Deeper reasoning, best for complex logic & programming" },
  { id: "gemini-3.1-flash-lite", name: "NAV Lite (Fast)", desc: "Ultra low-latency, perfect for simple responses" },
];

const PROMPT_SUGGESTIONS = [
  { 
    title: "Code a React Hook", 
    prompt: "Write a complete, professional React custom hook in TypeScript called 'useDebounce' with full JSDoc explanations.",
    icon: Code2,
    color: "from-blue-500 to-indigo-500"
  },
  { 
    title: "API Design Plan", 
    prompt: "Design a RESTful API specification for a full-stack task manager app, showing request/response structures in JSON.",
    icon: Terminal,
    color: "from-emerald-500 to-teal-500"
  },
  { 
    title: "Draft an Email", 
    prompt: "Draft an elegant email to clients explaining a critical database server migration, emphasizing security and zero downtime.",
    icon: PenTool,
    color: "from-amber-500 to-orange-500"
  },
  { 
    title: "Explain Quantum Logic", 
    prompt: "Explain quantum superposition and quantum entanglement in 3 simple paragraphs using simple physical analogies.",
    icon: Lightbulb,
    color: "from-purple-500 to-pink-500"
  },
];

// Helper to parse inline formatting (`code` and **bold**)
const parseInlineFormatting = (text: string) => {
  const inlineParts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return inlineParts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="bg-zinc-800 text-teal-300 px-1.5 py-0.5 rounded font-mono text-xs border border-zinc-700">
          {part.slice(1, -1)}
        </code>
      );
    } else if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="text-zinc-100 font-bold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

// High-fidelity text renderer to handle code fences with copy buttons
const renderFormattedText = (
  messageId: string,
  text: string,
  copiedCodeId: string | null,
  copyCodeToClipboard: (code: string, id: string) => void
) => {
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith("```")) {
      // Extract language and code body
      const match = part.match(/```(\w*)\n([\s\S]*?)```/);
      const language = match ? match[1] || "code" : "code";
      const code = match ? match[2].trim() : part.slice(3, -3).trim();
      const codeBlockId = `${messageId}_code_${index}`;

      return (
        <div key={index} className="my-4 border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 shadow-md">
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-[11px] font-mono text-zinc-400">
            <span className="flex items-center gap-1.5 font-semibold uppercase text-emerald-400 tracking-wider">
              <Terminal className="h-3 w-3" />
              {language}
            </span>
            <button
              onClick={() => copyCodeToClipboard(code, codeBlockId)}
              className="flex items-center gap-1 hover:text-zinc-200 transition-colors bg-zinc-800/60 px-2 py-1 rounded border border-zinc-700/50"
            >
              {copiedCodeId === codeBlockId ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-4 overflow-x-auto text-xs font-mono text-zinc-300 leading-relaxed max-w-full">
            <code>{code}</code>
          </pre>
        </div>
      );
    } else {
      // Inline formatting of bold (**text**), line breaks, list items
      return (
        <div key={index} className="space-y-2 whitespace-pre-wrap leading-relaxed text-[14px]">
          {part.split("\n").map((line, lIdx) => {
            // List formatting (e.g., "- item" or "* item")
            const listMatch = line.match(/^[\s]*[-*+]\s+(.*)/);
            if (listMatch) {
              return (
                <ul key={lIdx} className="list-disc pl-5 my-1 text-zinc-300">
                  <li>{parseInlineFormatting(listMatch[1])}</li>
                </ul>
              );
            }
            return <p key={lIdx} className="text-zinc-300">{parseInlineFormatting(line)}</p>;
          })}
        </div>
      );
    }
  });
};

/**
 * ⚡ Bolt Optimization:
 * Memoized chat message item component.
 * Prevents re-rendering existing messages and re-parsing markdown regex
 * on every character typed in the parent `inputText` state.
 */
interface ChatMessageItemProps {
  message: ChatMessage;
  copiedCodeId: string | null;
  onCopyCode: (code: string, id: string) => void;
}

const ChatMessageItem = React.memo(function ChatMessageItem({
  message,
  copiedCodeId,
  onCopyCode,
}: ChatMessageItemProps) {
  const isUser = message.role === 'user';

  // Memoize formatted content so regex splitting isn't rerun unless message content or copy state changes
  const formattedContent = useMemo(
    () => renderFormattedText(message.id, message.text, copiedCodeId, onCopyCode),
    [message.id, message.text, copiedCodeId, onCopyCode]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {/* Bot icon on left */}
      {!isUser && (
        <div className="h-9 w-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
          <Bot className="h-5 w-5 text-emerald-400" />
        </div>
      )}

      <div className={`flex flex-col max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
        {/* Name + Time info */}
        <span className="text-[10px] text-zinc-500 font-mono mb-1.5">
          {isUser ? 'YOU' : 'NAV AI'} • {message.timestamp}
        </span>

        {/* Bubble box */}
        <div className={`px-4 py-3 rounded-2xl border ${
          isUser
            ? "bg-zinc-900 border-zinc-800 text-zinc-100 rounded-tr-none"
            : "bg-zinc-900/30 border-zinc-900 text-zinc-200 rounded-tl-none"
        }`}>
          {formattedContent}
        </div>
      </div>

      {/* User icon on right */}
      {isUser && (
        <div className="h-9 w-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
          <User className="h-5 w-5 text-emerald-300" />
        </div>
      )}
    </motion.div>
  );
});

export default function Playground({ 
  sessions, 
  setSessions, 
  activeSessionId, 
  setActiveSessionId 
}: PlaygroundProps) {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, isLoading]);

  // Handle session creation if empty
  const handleCreateSession = () => {
    const newSession: ChatSession = {
      id: "session_" + Date.now(),
      title: "New Chat",
      messages: [],
      model: "gemini-3.5-flash",
      temperature: 0.7,
      systemInstruction: "You are NAV AI, an advanced, ultra-helpful AI assistant designed to provide direct, clean, and highly professional coding, reasoning, and written solutions. Ensure any code returned has full explanations."
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  // Ensure there is always an active session selected if sessions exist but none are active
  useEffect(() => {
    if (sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  const handleUpdateSessionSettings = (key: 'model' | 'temperature' | 'systemInstruction', value: any) => {
    if (!activeSessionId) return;
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return { ...s, [key]: value };
      }
      return s;
    }));
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading || !activeSessionId || !activeSession) return;

    const userMessage: ChatMessage = {
      id: "msg_" + Date.now(),
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Append user message immediately
    const updatedMessages = [...activeSession.messages, userMessage];
    
    // Automatically title the chat based on the first message
    const isFirstMessage = activeSession.messages.length === 0;
    const title = isFirstMessage 
      ? (textToSend.length > 25 ? textToSend.substring(0, 25) + "..." : textToSend)
      : activeSession.title;

    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return { 
          ...s, 
          title: title, 
          messages: updatedMessages 
        };
      }
      return s;
    }));

    setInputText("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          model: activeSession.model,
          temperature: activeSession.temperature,
          systemInstruction: activeSession.systemInstruction
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate AI response.");
      }

      const assistantMessage: ChatMessage = {
        id: "msg_" + (Date.now() + 1),
        role: 'model',
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return { ...s, messages: [...updatedMessages, assistantMessage] };
        }
        return s;
      }));
    } catch (error: any) {
      console.error(error);
      const errorMessage: ChatMessage = {
        id: "msg_" + (Date.now() + 1),
        role: 'model',
        text: `⚠️ **Error**: ${error.message || "Something went wrong. Please check your network and API secrets configurations."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return { ...s, messages: [...updatedMessages, errorMessage] };
        }
        return s;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id) {
      setActiveSessionId(filtered.length > 0 ? filtered[0].id : null);
    }
  };

  // ⚡ Bolt Optimization: Stable callback reference for copy button
  const copyCodeToClipboard = useCallback((code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  }, []);

  const getTemperatureLabel = (temp: number) => {
    if (temp <= 0.2) return "0.2 - Precise & Concise";
    if (temp <= 0.6) return `${temp} - Professional & Clear`;
    if (temp <= 0.9) return `${temp} - Creative & Balanced`;
    return `${temp} - Highly Creative / Brainstorming`;
  };

  return (
    <div className="flex-1 flex bg-zinc-950 text-zinc-100 overflow-hidden" style={{ height: "calc(100vh - 73px)" }}>
      {/* Sessions list sidebar */}
      <div className="w-64 border-r border-zinc-900 bg-zinc-950/80 flex flex-col shrink-0 hidden md:flex">
        <div className="p-4">
          <button
            onClick={handleCreateSession}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-zinc-900 font-bold rounded-xl transition-all duration-300 shadow-lg shadow-emerald-950/20 text-sm"
            id="playground-new-chat-btn"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            New Chat Session
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          {sessions.map((s) => {
            const isActive = s.id === activeSessionId;
            return (
              <div
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 text-sm ${
                  isActive 
                    ? "bg-zinc-900/90 border border-zinc-800 text-emerald-400" 
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
                }`}
                id={`chat-session-${s.id}`}
              >
                <div className="flex items-center gap-2.5 truncate flex-1">
                  <MessageSquare className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-400'}`} />
                  <span className="truncate font-medium">{s.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteSession(s.id, e)}
                  className="text-zinc-600 hover:text-red-400 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete Session"
                  id={`delete-session-${s.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
          {sessions.length === 0 && (
            <div className="text-center py-8 text-zinc-600 text-xs font-mono">
              No sessions active
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Playground Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-zinc-950">
        {/* Active Session settings banner / status bar */}
        <div className="border-b border-zinc-900 px-6 py-3 bg-zinc-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="h-5 w-5 text-emerald-400" />
            <div>
              <span className="text-sm font-semibold text-zinc-100">NAV AI Instance</span>
              <span className="mx-2 text-zinc-700">•</span>
              <span className="text-xs font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800/80 uppercase">
                {activeSession?.model || "gemini-3.5-flash"}
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
              showSettings 
                ? "bg-zinc-900 border-zinc-800 text-zinc-300" 
                : "bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-300"
            }`}
            id="toggle-settings-btn"
          >
            <Settings className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{showSettings ? 'Hide Settings' : 'Show Settings'}</span>
          </button>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-thin scrollbar-track-zinc-950 scrollbar-thumb-zinc-900">
          {activeSession && activeSession.messages.length === 0 ? (
            /* Blank Slate Welcome */
            <div className="max-w-2xl mx-auto py-12 flex flex-col justify-center h-full">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-center space-y-3 mb-10"
              >
                <div className="inline-block bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-3 rounded-2xl mb-2">
                  <Sparkles className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200 bg-clip-text text-transparent">
                  Meet NAV AI
                </h2>
                <p className="text-zinc-400 max-w-lg mx-auto text-sm leading-relaxed">
                  An advanced custom chatbot with robust system-instruction roles. Customize temperature and models in the right panel.
                </p>
              </motion.div>

              {/* Starter suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PROMPT_SUGGESTIONS.map((s, idx) => {
                  const Icon = s.icon;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.08 }}
                      onClick={() => handleSendMessage(s.prompt)}
                      className="group p-4 bg-zinc-900/30 hover:bg-zinc-900/60 border border-zinc-850 hover:border-zinc-750 rounded-xl cursor-pointer transition-all duration-300 flex items-start gap-3"
                    >
                      <div className={`p-2 rounded-lg bg-zinc-800 text-emerald-400 group-hover:scale-110 transition-transform`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                          {s.title}
                        </h4>
                        <p className="text-[11px] text-zinc-500 line-clamp-2 mt-1">
                          {s.prompt}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Chat Messages list */
            <div className="max-w-3xl mx-auto space-y-6">
              {activeSession?.messages.map((m) => (
                <ChatMessageItem
                  key={m.id}
                  message={m}
                  copiedCodeId={copiedCodeId}
                  onCopyCode={copyCodeToClipboard}
                />
              ))}

              {/* Loader */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-4"
                >
                  <div className="h-9 w-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 animate-pulse">
                    <Bot className="h-5 w-5 text-teal-400 animate-bounce" />
                  </div>
                  <div className="flex flex-col items-start max-w-[85%]">
                    <span className="text-[10px] text-zinc-500 font-mono mb-1.5">NAV AI IS THINKING...</span>
                    <div className="bg-zinc-900/30 border border-zinc-900 px-5 py-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce delay-100" />
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce delay-200" />
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce delay-300" />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>


        {/* Floating suggestion warning for key setting */}
        <AnimatePresence>
          {!(typeof process !== "undefined" && process.env?.GEMINI_API_KEY) && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="absolute bottom-24 left-6 right-6 bg-zinc-900 border border-amber-500/30 p-3.5 rounded-xl flex items-start gap-3 shadow-2xl z-10"
            >
              <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-zinc-100">AI Studio API Key Notice</p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Using fallback mode or automatic key. Configure your private Gemini API Key in the **Settings &gt; Secrets** panel on the left/top menu to deploy.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input box */}
        <div className="border-t border-zinc-900 p-4 bg-zinc-950 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputText); }}
            className="max-w-3xl mx-auto flex gap-3 items-end"
          >
            <div className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl focus-within:border-emerald-500/80 transition-all duration-200 px-4 py-2 flex items-end">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(inputText);
                  }
                }}
                placeholder="Ask NAV AI anything... (Press Enter to send, Shift+Enter for new line)"
                className="w-full bg-transparent border-0 outline-0 focus:ring-0 text-sm py-1.5 resize-none text-zinc-100 max-h-36 min-h-[30px] scrollbar-none font-sans"
                rows={1}
                disabled={isLoading}
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="p-3.5 bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-zinc-950 rounded-xl transition-all font-bold disabled:bg-zinc-900 disabled:from-zinc-900 disabled:to-zinc-900 disabled:text-zinc-600 shadow-md shrink-0 cursor-pointer"
              id="playground-send-msg-btn"
            >
              <Send className="h-4.5 w-4.5 stroke-[2.5]" />
            </button>
          </form>
        </div>
      </div>

      {/* Side Settings Control Bar */}
      <AnimatePresence>
        {showSettings && activeSession && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 320 }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.25 }}
            className="border-l border-zinc-900 bg-zinc-950/60 flex flex-col shrink-0 overflow-y-auto"
            id="playground-settings-sidebar"
          >
            <div className="p-6 space-y-6">
              {/* Sidebar Header */}
              <div className="flex items-center gap-2 pb-4 border-b border-zinc-900">
                <Settings className="h-4 w-4 text-emerald-400" />
                <h3 className="font-sans font-bold text-sm tracking-tight text-zinc-200">
                  Engine Parameters
                </h3>
              </div>

              {/* Model Choice */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-zinc-400 block font-semibold uppercase tracking-wider">
                  Model Instance
                </label>
                <div className="space-y-2">
                  {MODELS.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => handleUpdateSessionSettings('model', m.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        activeSession.model === m.id
                          ? "bg-zinc-900 border-emerald-500/50 text-emerald-400"
                          : "bg-zinc-900/20 border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200"
                      }`}
                      id={`model-select-${m.id}`}
                    >
                      <div className="text-xs font-semibold">{m.name}</div>
                      <div className="text-[10px] text-zinc-500 mt-1">{m.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Temperature Selector */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono text-zinc-400 font-semibold uppercase tracking-wider">Temperature</span>
                  <span className="text-teal-400 font-bold font-mono">{activeSession.temperature}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.5"
                  step="0.1"
                  value={activeSession.temperature}
                  onChange={(e) => handleUpdateSessionSettings('temperature', parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-900 rounded-lg appearance-none"
                  id="temperature-slider"
                />
                <div className="text-[11px] text-zinc-500 font-mono italic leading-normal">
                  {getTemperatureLabel(activeSession.temperature)}
                </div>
              </div>

              {/* System Instructions Roles */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-mono text-zinc-400 block font-semibold uppercase tracking-wider">
                  System Instructions (Role)
                </label>
                <textarea
                  value={activeSession.systemInstruction}
                  onChange={(e) => handleUpdateSessionSettings('systemInstruction', e.target.value)}
                  className="w-full text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 p-3 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500"
                  rows={6}
                  placeholder="Tell the AI how to act..."
                  id="system-instruction-textarea"
                />
                <div className="text-[10px] text-zinc-500 flex items-start gap-1.5 leading-relaxed bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-900">
                  <Info className="h-3.5 w-3.5 text-zinc-500 shrink-0 mt-0.5" />
                  <span>These system directives tell NAV AI how to act globally, what persona to embrace, and response templates to prioritize.</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
