import React, { useState, useEffect } from "react";
import {
  Bot, Play, Plus, RefreshCw, Cpu, Terminal, Zap, ShieldCheck,
  Settings, Clock, Sparkles, Database, Layers, CheckCircle, AlertTriangle,
  Trash2, ChevronRight, Activity, Wrench, ArrowRight, CornerDownRight, Bell, CheckSquare, Square
} from "lucide-react";
import { AIAgent, AgentTaskRun, AgentTool, Reminder } from "../types";

const AVAILABLE_MODELS = [
  { id: "gemini-3.5-flash", name: "NAV Flash (Standard)" },
  { id: "gemini-3.1-pro-preview", name: "NAV Pro (Advanced Reasoning)" },
  { id: "gemini-3.1-flash-lite", name: "NAV Lite (Ultra Latency)" },
];

export default function AgentStudio() {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [runs, setRuns] = useState<AgentTaskRun[]>([]);
  const [activeRun, setActiveRun] = useState<AgentTaskRun | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // Reminders state from localStorage
  const [reminders, setReminders] = useState<Reminder[]>(() => {
    try {
      const stored = localStorage.getItem("nav_ai_reminders");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });
  const [activeMainTab, setActiveMainTab] = useState<'agent_details' | 'reminders'>('agent_details');
  const [newReminderInput, setNewReminderInput] = useState("");

  // Save reminders to localStorage on update
  useEffect(() => {
    localStorage.setItem("nav_ai_reminders", JSON.stringify(reminders));
  }, [reminders]);

  // Modal / Form state for creating an agent
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [agentRole, setAgentRole] = useState("");
  const [agentGoal, setAgentGoal] = useState("");
  const [agentDesc, setAgentDesc] = useState("");
  const [agentModel, setAgentModel] = useState("gemini-3.5-flash");
  const [agentTemp, setAgentTemp] = useState(0.5);
  const [agentInstruction, setAgentInstruction] = useState("You are an autonomous AI Agent. Execute step-by-step reasoning (Thought -> Action -> Result).");

  // Custom execution prompt modal/input
  const [customTaskPrompt, setCustomTaskPrompt] = useState("");

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || null;

  const fetchAgents = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/agents");
      if (res.ok) {
        const data: AIAgent[] = await res.json();
        setAgents(data);
        if (data.length > 0 && !selectedAgentId) {
          setSelectedAgentId(data[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load agents", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRuns = async (agentId?: string) => {
    try {
      const url = agentId ? `/api/agents/runs?agentId=${agentId}` : "/api/agents/runs";
      const res = await fetch(url);
      if (res.ok) {
        const data: AgentTaskRun[] = await res.json();
        setRuns(data);
        if (data.length > 0) {
          setActiveRun(data[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load runs", e);
    }
  };

  useEffect(() => {
    fetchAgents();
    fetchRuns();
  }, []);

  useEffect(() => {
    if (selectedAgentId) {
      fetchRuns(selectedAgentId);
    }
  }, [selectedAgentId]);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim() || !agentGoal.trim()) return;

    try {
      const defaultTools: AgentTool[] = [
        { id: "tool_web_search", name: "Web Search Synthesizer", description: "Queries live web search index for current information", type: "web_search", enabled: true },
        { id: "tool_code_exec", name: "Code Execution Sandbox", description: "Validates code syntax and unit tests", type: "code_execution", enabled: true },
        { id: "tool_api_fetch", name: "REST Endpoint Fetcher", description: "Dispatches HTTP requests to remote APIs", type: "api_call", enabled: false }
      ];

      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agentName,
          role: agentRole || "Autonomous AI Agent",
          goal: agentGoal,
          description: agentDesc,
          model: agentModel,
          temperature: agentTemp,
          systemInstruction: agentInstruction,
          tools: defaultTools,
          triggerType: "manual",
          autonomousLoop: true,
          maxIterations: 3
        })
      });

      if (res.ok) {
        const newAgent: AIAgent = await res.json();
        setAgents(prev => [...prev, newAgent]);
        setSelectedAgentId(newAgent.id);
        setIsCreatingAgent(false);
        // Reset form
        setAgentName("");
        setAgentRole("");
        setAgentGoal("");
        setAgentDesc("");
      }
    } catch (e) {
      console.error("Error creating agent", e);
    }
  };

  const handleAddReminder = (desc: string) => {
    if (!desc.trim()) return;
    const item: Reminder = {
      id: "rem_" + Date.now(),
      taskDescription: desc.trim(),
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
      completed: false
    };
    setReminders(prev => [item, ...prev]);
  };

  const handleToggleReminder = (id: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, completed: !r.completed } : r));
  };

  const handleDeleteReminder = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const handleRunAgent = async () => {
    if (!selectedAgent) return;

    setIsExecuting(true);
    const promptToRun = customTaskPrompt.trim() || selectedAgent.goal;

    try {
      const res = await fetch(`/api/agents/${selectedAgent.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskPrompt: promptToRun })
      });

      const runResult: AgentTaskRun = await res.json();
      setRuns(prev => [runResult, ...prev]);
      setActiveRun(runResult);

      // Check if run triggered a reminder tool or tool_needed === "reminder"
      const hasReminder = runResult.toolCalls.some(tc =>
        tc.toolName.toLowerCase().includes("reminder") ||
        tc.input?.tool_needed === "reminder"
      ) || promptToRun.toLowerCase().includes("reminder");

      if (hasReminder) {
        handleAddReminder(promptToRun);
      }

      fetchAgents(); // Refresh total runs count and memory
    } catch (e) {
      console.error("Agent execution failed", e);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDeleteAgent = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this AI Agent?")) return;

    try {
      const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
      if (res.ok) {
        const filtered = agents.filter(a => a.id !== id);
        setAgents(filtered);
        if (selectedAgentId === id) {
          setSelectedAgentId(filtered.length > 0 ? filtered[0].id : null);
        }
      }
    } catch (e) {
      console.error("Failed to delete agent", e);
    }
  };

  const toggleToolEnabled = async (toolId: string) => {
    if (!selectedAgent) return;
    const updatedTools = selectedAgent.tools.map(t => {
      if (t.id === toolId) return { ...t, enabled: !t.enabled };
      return t;
    });

    try {
      const res = await fetch(`/api/agents/${selectedAgent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tools: updatedTools })
      });

      if (res.ok) {
        const updated = await res.json();
        setAgents(prev => prev.map(a => a.id === updated.id ? updated : a));
      }
    } catch (e) {
      console.error("Failed to toggle tool", e);
    }
  };

  return (
    <div className="flex-1 flex bg-[#030303] text-zinc-100 overflow-hidden" style={{ height: "calc(100vh - 73px)" }}>
      {/* Sidebar - Agents Selector */}
      <div className="w-80 border-r border-zinc-900 bg-zinc-950/80 flex flex-col shrink-0">
        <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">AUTONOMOUS REGISTRY</span>
            <h2 className="text-sm font-bold text-zinc-100">AI Agents ({agents.length})</h2>
          </div>
          <button
            onClick={() => setIsCreatingAgent(true)}
            className="p-2 bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-zinc-950 font-bold rounded-lg transition-all shadow-md cursor-pointer"
            title="Deploy New Agent"
            id="create-agent-sidebar-btn"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
          </button>
        </div>

        {/* Agents List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {agents.map((agent) => {
            const isSelected = agent.id === selectedAgentId;
            return (
              <div
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer group ${
                  isSelected
                    ? "bg-zinc-900/90 border-emerald-500/50 shadow-md"
                    : "bg-zinc-950/40 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/30"
                }`}
                id={`agent-card-${agent.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-900 text-zinc-400'}`}>
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className={`text-xs font-bold transition-colors ${isSelected ? 'text-emerald-400' : 'text-zinc-200 group-hover:text-zinc-100'}`}>
                        {agent.name}
                      </h3>
                      <p className="text-[10px] font-mono text-zinc-500 mt-0.5">{agent.role}</p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteAgent(agent.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 transition-opacity"
                    title="Delete Agent"
                    id={`delete-agent-btn-${agent.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <p className="text-[11px] text-zinc-400 line-clamp-2 mt-2 leading-relaxed">
                  {agent.description || agent.goal}
                </p>

                <div className="mt-3 pt-2.5 border-t border-zinc-900/80 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-amber-400" />
                    {agent.totalRuns} runs
                  </span>
                  <span className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 uppercase text-[9px] text-zinc-400">
                    {agent.model.replace('gemini-', '')}
                  </span>
                </div>
              </div>
            );
          })}

          {agents.length === 0 && (
            <div className="text-center py-12 text-zinc-600 text-xs font-mono">
              No agents deployed yet.
            </div>
          )}
        </div>
      </div>

      {/* Main Agent Details & Orchestration Panel */}
      {selectedAgent ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">

          {/* Header Bar */}
          <div className="border-b border-zinc-900 px-6 py-4 bg-zinc-950/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-2xl">
                <Bot className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-zinc-100">{selectedAgent.name}</h1>
                  <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">
                    AUTONOMOUS
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">{selectedAgent.role}</p>
              </div>
            </div>

            {/* Navigation Tabs (Agent Workspace vs Reminders) */}
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                <button
                  onClick={() => setActiveMainTab('agent_details')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeMainTab === 'agent_details'
                      ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  id="tab-agent-workspace-btn"
                >
                  <Cpu className="h-3.5 w-3.5" />
                  Workspace
                </button>
                <button
                  onClick={() => setActiveMainTab('reminders')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeMainTab === 'reminders'
                      ? 'bg-zinc-800 text-amber-400 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  id="tab-reminders-btn"
                >
                  <Bell className="h-3.5 w-3.5 text-amber-400" />
                  <span>Reminders</span>
                  {reminders.length > 0 && (
                    <span className="bg-amber-500/20 text-amber-400 text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold">
                      {reminders.filter(r => !r.completed).length}
                    </span>
                  )}
                </button>
              </div>

              <button
                onClick={() => fetchRuns(selectedAgent.id)}
                className="p-2 border border-zinc-800 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Sync Agent Runs"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={handleRunAgent}
                disabled={isExecuting}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-xs tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
                id="execute-agent-task-btn"
              >
                <Play className={`h-4 w-4 fill-current ${isExecuting ? 'animate-spin' : ''}`} />
                {isExecuting ? 'EXECUTING TASK...' : 'RUN AGENT NOW'}
              </button>
            </div>
          </div>

          {/* Body Content Layout */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {activeMainTab === 'reminders' ? (
              /* Reminders Tab Content */
              <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-850">
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-amber-400" />
                    <div>
                      <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                        PERSISTENT IN-BROWSER REMINDERS
                      </h3>
                      <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                        Tasks generated when steps specify <code className="text-amber-400">tool_needed = "reminder"</code> or manually added.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setReminders([])}
                    className="text-xs text-zinc-500 hover:text-red-400 font-mono flex items-center gap-1 border border-zinc-800 hover:border-red-950 px-3 py-1.5 rounded-lg transition-colors"
                    id="clear-all-reminders-btn"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear All
                  </button>
                </div>

                {/* Add new manual reminder input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddReminder(newReminderInput);
                    setNewReminderInput("");
                  }}
                  className="flex gap-3"
                >
                  <input
                    type="text"
                    value={newReminderInput}
                    onChange={(e) => setNewReminderInput(e.target.value)}
                    placeholder="Add a new custom task reminder..."
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 font-mono outline-none focus:border-amber-500"
                    id="manual-reminder-input"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    id="add-manual-reminder-btn"
                  >
                    Save Reminder
                  </button>
                </form>

                {/* Reminders List */}
                <div className="space-y-3">
                  {reminders.map((rem) => (
                    <div
                      key={rem.id}
                      className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        rem.completed
                          ? "bg-zinc-950/40 border-zinc-900 opacity-50"
                          : "bg-zinc-950 border-amber-500/20 hover:border-amber-500/40 shadow-sm"
                      }`}
                      id={`reminder-item-${rem.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          onClick={() => handleToggleReminder(rem.id)}
                          className="text-amber-400 hover:text-amber-300 shrink-0 cursor-pointer"
                          title={rem.completed ? "Mark incomplete" : "Mark complete"}
                        >
                          {rem.completed ? (
                            <CheckSquare className="h-5 w-5 text-emerald-400" />
                          ) : (
                            <Square className="h-5 w-5 text-zinc-600 hover:text-amber-400" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-mono leading-relaxed ${rem.completed ? 'line-through text-zinc-500' : 'text-zinc-200 font-medium'}`}>
                            {rem.taskDescription}
                          </p>
                          <span className="text-[10px] text-zinc-500 font-mono block mt-1">
                            Recorded: {rem.createdAt}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteReminder(rem.id)}
                        className="text-zinc-600 hover:text-red-400 p-1.5 rounded-lg border border-transparent hover:border-zinc-800 transition-colors shrink-0"
                        title="Delete reminder"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {reminders.length === 0 && (
                    <div className="text-center py-12 border border-dashed border-zinc-850 rounded-2xl space-y-2">
                      <Bell className="h-8 w-8 text-zinc-600 mx-auto" />
                      <p className="text-xs font-mono text-zinc-400 font-bold">No saved reminders</p>
                      <p className="text-[11px] text-zinc-600 max-w-sm mx-auto font-mono">
                        Run an AI Agent task that includes reminder planning or add reminders manually using the field above.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              /* Agent Details & Workspace Content */
              <>
            {/* Execution Task Input Form */}
            <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  Target Objective / Task Prompt
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Default Goal: {selectedAgent.goal.length > 60 ? selectedAgent.goal.substring(0, 60) + '...' : selectedAgent.goal}
                </span>
              </div>

              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  value={customTaskPrompt}
                  onChange={(e) => setCustomTaskPrompt(e.target.value)}
                  placeholder={`Override goal prompt (Leave empty to execute default goal)...`}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 font-mono outline-none focus:border-emerald-500"
                  id="custom-agent-prompt-input"
                />
                <button
                  onClick={handleRunAgent}
                  disabled={isExecuting}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-emerald-400 font-mono font-bold text-xs rounded-xl border border-zinc-700 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                >
                  Trigger Run
                </button>
              </div>
            </div>

            {/* Grid for Tools & Memory + Agent Parameters */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Tools Integration Column */}
              <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
                  <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-teal-400" />
                    ENABLED TOOL MODULES
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {selectedAgent.tools.filter(t => t.enabled).length}/{selectedAgent.tools.length} ACTIVE
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedAgent.tools.map((tool) => (
                    <div
                      key={tool.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                        tool.enabled
                          ? 'bg-zinc-900 border-teal-500/30'
                          : 'bg-zinc-950/40 border-zinc-900 opacity-60'
                      }`}
                    >
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-200">{tool.name}</h4>
                        <p className="text-[10px] text-zinc-500">{tool.description}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={tool.enabled}
                        onChange={() => toggleToolEnabled(tool.id)}
                        className="accent-teal-500 h-4 w-4 cursor-pointer"
                      />
                    </div>
                  ))}
                  {selectedAgent.tools.length === 0 && (
                    <p className="text-xs text-zinc-600 font-mono italic text-center py-4">No tools registered</p>
                  )}
                </div>
              </div>

              {/* Memory Storage Column */}
              <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
                  <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                    <Database className="h-4 w-4 text-emerald-400" />
                    PERSISTENT MEMORY
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-500">{selectedAgent.memory.length} items</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedAgent.memory.map((mem, idx) => (
                    <div key={idx} className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-[11px] font-mono space-y-1">
                      <div className="text-emerald-400 font-semibold">{mem.key}</div>
                      <div className="text-zinc-400 line-clamp-2">{mem.value}</div>
                    </div>
                  ))}
                  {selectedAgent.memory.length === 0 && (
                    <p className="text-xs text-zinc-600 font-mono italic text-center py-4">Memory state is clean</p>
                  )}
                </div>
              </div>

              {/* System Instruction / Persona Column */}
              <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
                  <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-indigo-400" />
                    AGENT DIRECTIVES
                  </h3>
                  <span className="text-[10px] font-mono text-indigo-400 font-semibold uppercase">{selectedAgent.model}</span>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-zinc-400 bg-zinc-950 p-3 rounded-xl border border-zinc-850 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {selectedAgent.systemInstruction}
                  </div>
                </div>
              </div>

            </div>

            {/* Execution Runs / Reasoning Thought Process Log */}
            <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-850">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-emerald-400" />
                    AUTONOMOUS REASONING &amp; TOOL LOGS
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-mono mt-0.5">Thought process and synthesized agent execution outputs</p>
                </div>

                <span className="text-xs font-mono font-bold text-zinc-400">
                  Total Runs: {runs.length}
                </span>
              </div>

              {activeRun ? (
                <div className="space-y-6">

                  {/* Run Metadata Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950 p-3.5 rounded-xl border border-zinc-850 text-xs font-mono">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase ${activeRun.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400'}`}>
                        {activeRun.status}
                      </span>
                      <span className="text-zinc-300 font-semibold">{activeRun.taskPrompt}</span>
                    </div>

                    <div className="flex items-center gap-4 text-zinc-500">
                      <span>Latency: {activeRun.durationMs}ms</span>
                      <span>Tokens: {activeRun.tokensUsed}</span>
                      <span>{new Date(activeRun.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  {/* Step-by-Step Thought Process */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">Thought Process (Reasoning Steps)</h4>
                    <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-4 space-y-2 font-mono text-xs">
                      {activeRun.thoughtProcess.map((tp, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-emerald-400/90 leading-relaxed">
                          <CornerDownRight className="h-3.5 w-3.5 shrink-0 mt-0.5 text-zinc-600" />
                          <span>{tp}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tool Calls Details */}
                  {activeRun.toolCalls.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">Tool Execution Intercepts</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {activeRun.toolCalls.map((tc, idx) => (
                          <div key={idx} className="bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs font-mono space-y-1">
                            <div className="flex justify-between text-teal-400 font-bold">
                              <span>{tc.toolName}</span>
                              <span className="text-[10px] text-zinc-500">{new Date(tc.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <div className="text-[10px] text-zinc-400">Input: {JSON.stringify(tc.input)}</div>
                            <div className="text-[10px] text-emerald-400 bg-zinc-900 p-1.5 rounded border border-zinc-800">
                              Output: {JSON.stringify(tc.output)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Synthesized Output */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">Final Output Response</h4>
                    <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 font-mono text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap overflow-x-auto">
                      {activeRun.output}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-center py-12 text-zinc-600 font-mono text-xs">
                  No execution runs recorded for this agent yet. Click "RUN AGENT NOW" to start task orchestration.
                </div>
              )}

            </div>
            </>
            )}

          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-zinc-600 font-mono text-sm">
          Select or deploy an AI agent to view details.
        </div>
      )}

      {/* Modal for Creating New Agent */}
      {isCreatingAgent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Bot className="h-5 w-5 text-emerald-400" />
                Deploy Autonomous AI Agent
              </h3>
              <button onClick={() => setIsCreatingAgent(false)} className="text-zinc-500 hover:text-zinc-200 text-xs font-mono">
                [CLOSE]
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase">Agent Identifier Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Autonomous DevOps & Refactor Bot"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
                  id="agent-name-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase">Specialized Role</label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Security Architect"
                    value={agentRole}
                    onChange={(e) => setAgentRole(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
                    id="agent-role-input"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase">Model Instance</label>
                  <select
                    value={agentModel}
                    onChange={(e) => setAgentModel(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
                    id="agent-model-select"
                  >
                    {AVAILABLE_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase">Primary Goal / Mission Statement</label>
                <textarea
                  required
                  placeholder="Describe the agent's core goal..."
                  value={agentGoal}
                  onChange={(e) => setAgentGoal(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
                  id="agent-goal-textarea"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase">System Directives &amp; Reasoning Instructions</label>
                <textarea
                  value={agentInstruction}
                  onChange={(e) => setAgentInstruction(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
                  id="agent-instruction-textarea"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg"
                id="submit-deploy-agent-btn"
              >
                DEPLOY AUTONOMOUS AGENT
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
