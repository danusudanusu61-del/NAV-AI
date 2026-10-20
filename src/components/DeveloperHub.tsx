import React, { useState, useEffect } from "react";
import { 
  Key, Plus, Eye, EyeOff, Copy, Check, Trash2, Calendar, 
  BarChart3, RefreshCw, Terminal, Activity, ShieldCheck, AlertCircle, Clock 
} from "lucide-react";
import { ApiKey, ApiRequestLog } from "../types";

interface DeveloperHubProps {
  apiStatus: 'online' | 'offline';
}

interface StatsData {
  totalRequests: number;
  activeKeysCount: number;
  successRate: number;
  avgResponseTime: number;
  chartData: Array<{
    date: string;
    requests: number;
    success: number;
    failed: number;
  }>;
}

export default function DeveloperHub({ apiStatus }: DeveloperHubProps) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [logs, setLogs] = useState<ApiRequestLog[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingKey, setIsCreatingKey] = useState(false);

  // Form states for new key
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyDesc, setNewKeyDesc] = useState("");
  const [newKeyScope, setNewKeyScope] = useState<'all' | 'chat' | 'read'>('all');
  const [newKeyExpiresDays, setNewKeyExpiresDays] = useState<number>(30);

  // Security toggles for keys (showing raw strings)
  const [visibleKeys, setVisibleKeys] = useState<{ [key: string]: boolean }>({});
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copiedCurlId, setCopiedCurlId] = useState<string | null>(null);

  const fetchDeveloperData = async () => {
    setIsLoading(true);
    try {
      const [keysRes, logsRes, statsRes] = await Promise.all([
        fetch("/api/developer/keys"),
        fetch("/api/developer/logs"),
        fetch("/api/developer/stats")
      ]);

      if (keysRes.ok) setKeys(await keysRes.json());
      if (logsRes.ok) setLogs(await logsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error("Failed to fetch developer metrics", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeveloperData();
    // Poll stats every 10 seconds for real-time live traffic logging
    const interval = setInterval(fetchDeveloperData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      const response = await fetch("/api/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName,
          description: newKeyDesc,
          scope: newKeyScope,
          expiresDays: Number(newKeyExpiresDays)
        })
      });

      if (response.ok) {
        const newlyCreated = await response.json();
        // Insert into keys locally
        setKeys(prev => [newlyCreated, ...prev]);
        setIsCreatingKey(false);
        setNewKeyName("");
        setNewKeyDesc("");
        setNewKeyScope("all");
        // Automatically make it visible
        setVisibleKeys(prev => ({ ...prev, [newlyCreated.id]: true }));
        // Refresh statistics
        fetchDeveloperData();
      }
    } catch (error) {
      console.error("Failed to generate key", error);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API Key? Any application using this key will immediately be blocked from completing requests.")) return;

    try {
      const response = await fetch("/api/developer/keys/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });

      if (response.ok) {
        const updatedKey = await response.json();
        setKeys(prev => prev.map(k => k.id === id ? updatedKey : k));
        fetchDeveloperData();
      }
    } catch (error) {
      console.error("Failed to revoke key", error);
    }
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string, type: 'key' | 'curl') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 2000);
    } else {
      setCopiedCurlId(id);
      setTimeout(() => setCopiedCurlId(null), 2000);
    }
  };

  // ⚡ Bolt Optimization: Compute maxVal once outside render JSX map loop
  const maxVal = stats?.chartData ? Math.max(...stats.chartData.map(cd => cd.requests), 1) : 1;

  const activeKey = keys.find(k => k.status === 'active')?.key || "nv_live_yourActiveKeyHere";

  const getCurlSnippet = (apiKey: string) => {
    const url = window.location.origin || "https://your-nav-ai.com";
    return `curl -X POST "${url}/api/v1/chat" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Write a python script to reverse a linked list.",
    "model": "gemini-3.5-flash",
    "temperature": 0.7
  }'`;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-black text-zinc-100" style={{ height: "calc(100vh - 73px)" }}>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Banner with Bold Typography style */}
        <div className="border-b border-white/10 pb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-2">DEVELOPER ACCESS PORTAL</p>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase leading-none">
                ENGINES &amp; KEYS
              </h1>
              <p className="text-sm text-white/40 mt-2 max-w-xl">
                Generate production-ready API keys, inspect global integration latency, and connect NAV AI's raw neural computing to your backend services.
              </p>
            </div>
            <button
              onClick={fetchDeveloperData}
              className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-lg hover:border-white/30 text-xs font-mono font-medium transition-colors"
              disabled={isLoading}
              id="refresh-metrics-btn"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              Sync Telemetry
            </button>
          </div>
        </div>

        {/* Real-time Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-neutral-900 border border-white/10 rounded-xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-mono">Total API Requests</span>
              <Activity className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{stats?.totalRequests ?? 0}</span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">LIVE</span>
            </div>
            <p className="text-[10px] text-white/30 mt-2 font-mono">Aggregation since server start</p>
          </div>

          <div className="bg-neutral-900 border border-white/10 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-mono">Active Keypairs</span>
              <Key className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-4">
              <span className="text-3xl font-black text-white">{stats?.activeKeysCount ?? 0}</span>
            </div>
            <p className="text-[10px] text-white/30 mt-2 font-mono">Authorized for client pipelines</p>
          </div>

          <div className="bg-neutral-900 border border-white/10 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-teal-500" />
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-mono">Successful Calls</span>
              <ShieldCheck className="h-4 w-4 text-teal-400" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{stats?.successRate ?? 100}%</span>
            </div>
            <p className="text-[10px] text-white/30 mt-2 font-mono">Operational reliability index</p>
          </div>

          <div className="bg-neutral-900 border border-white/10 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-pink-500" />
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-mono">Avg Latency</span>
              <Clock className="h-4 w-4 text-pink-400" />
            </div>
            <div className="mt-4">
              <span className="text-3xl font-black text-white">{stats?.avgResponseTime ?? 0} <span className="text-xs font-mono font-medium">ms</span></span>
            </div>
            <p className="text-[10px] text-white/30 mt-2 font-mono">Model generation roundtrip</p>
          </div>

        </div>

        {/* Dynamic Traffic Chart Simulation */}
        <div className="bg-neutral-900 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
            <div>
              <h3 className="font-sans font-bold text-sm text-white uppercase tracking-wider">NETWORK ACTIVITY VOLUMES</h3>
              <p className="text-[11px] text-white/30 font-mono mt-0.5">Rolling 7-day request distribution logs</p>
            </div>
            <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
              SYSTEM DIAGNOSTICS ACTIVE
            </span>
          </div>

          <div className="h-32 flex items-end justify-between gap-2.5 pt-4">
            {stats?.chartData && stats.chartData.map((d, i) => {
              const heightPct = (d.requests / maxVal) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="w-full bg-white/5 group-hover:bg-white/10 h-24 rounded-lg flex flex-col justify-end overflow-hidden relative">
                    <div 
                      className="bg-gradient-to-t from-indigo-600 via-purple-600 to-teal-400 rounded-t-sm transition-all duration-500"
                      style={{ height: `${Math.max(heightPct, d.requests > 0 ? 10 : 0)}%` }}
                    />
                    <div className="absolute top-1 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-950 border border-white/10 py-0.5 rounded text-[9px] font-mono text-zinc-300 z-10 mx-1">
                      {d.requests} Req
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-white/40">{d.date}</span>
                </div>
              );
            })}
            {(!stats?.chartData || stats.chartData.length === 0) && (
              <div className="w-full text-center text-zinc-500 font-mono text-xs py-8">
                Waiting for incoming request traffic data logs...
              </div>
            )}
          </div>
        </div>

        {/* Main interactive split of API management and integration guide */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: API Keys Generation and Management */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-neutral-900 border border-white/10 rounded-xl p-6">
              
              <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
                <div>
                  <h3 className="font-sans font-bold text-sm text-white uppercase tracking-wider">KEY AUTHORIZATIONS</h3>
                  <p className="text-[11px] text-white/30 font-mono mt-0.5">Manage authentication protocols</p>
                </div>

                {!isCreatingKey && (
                  <button
                    onClick={() => setIsCreatingKey(true)}
                    className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-xs font-black tracking-widest hover:bg-zinc-200 transition-all cursor-pointer"
                    id="add-api-key-btn"
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[3]" />
                    GENERATE KEY
                  </button>
                )}
              </div>

              {/* Form to create key */}
              {isCreatingKey && (
                <div className="bg-black border border-white/10 rounded-xl p-5 mb-6 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">Provision New Credentials</span>
                    <button 
                      onClick={() => setIsCreatingKey(false)} 
                      className="text-[10px] font-mono text-white/40 hover:text-white"
                      id="cancel-key-creation-btn"
                    >
                      [CANCEL]
                    </button>
                  </div>

                  <form onSubmit={handleCreateKey} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold uppercase text-white/40 tracking-wider">Key Label (Identifier)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Server Production Bot"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        className="w-full bg-neutral-950 border border-white/10 rounded-lg p-2.5 text-xs font-mono outline-none focus:border-indigo-500 text-white"
                        id="key-name-input"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold uppercase text-white/40 tracking-wider">Description</label>
                      <input 
                        type="text" 
                        placeholder="Brief purpose (e.g. mobile app integration pipeline)"
                        value={newKeyDesc}
                        onChange={(e) => setNewKeyDesc(e.target.value)}
                        className="w-full bg-neutral-950 border border-white/10 rounded-lg p-2.5 text-xs font-mono outline-none focus:border-indigo-500 text-white"
                        id="key-desc-input"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold uppercase text-white/40 tracking-wider">Permissions (Scope)</label>
                        <select
                          value={newKeyScope}
                          onChange={(e) => setNewKeyScope(e.target.value as any)}
                          className="w-full bg-neutral-950 border border-white/10 rounded-lg p-2.5 text-xs font-mono outline-none text-white focus:border-indigo-500"
                          id="key-scope-select"
                        >
                          <option value="all">Full Access (all)</option>
                          <option value="chat">Chat Completion (chat)</option>
                          <option value="read">Read Only (read)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold uppercase text-white/40 tracking-wider">Validity Expiration</label>
                        <select
                          value={newKeyExpiresDays}
                          onChange={(e) => setNewKeyExpiresDays(Number(e.target.value))}
                          className="w-full bg-neutral-950 border border-white/10 rounded-lg p-2.5 text-xs font-mono outline-none text-white focus:border-indigo-500"
                          id="key-expiration-select"
                        >
                          <option value="7">7 Days</option>
                          <option value="30">30 Days</option>
                          <option value="90">90 Days</option>
                          <option value="0">Never Expires (Permanent)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-xs font-bold tracking-widest hover:from-indigo-500 hover:to-purple-500 transition-colors cursor-pointer"
                      id="submit-generate-key-btn"
                    >
                      SECURELY AUTHORIZE CREDENTIALS
                    </button>
                  </form>
                </div>
              )}

              {/* Keys list */}
              <div className="space-y-4">
                {keys.map((k) => {
                  const isVisible = visibleKeys[k.id];
                  const isRevoked = k.status === 'revoked';
                  const keyDisplay = isVisible ? k.key : `${k.key.substring(0, 12)}••••••••••••••••`;

                  return (
                    <div 
                      key={k.id} 
                      className={`border rounded-xl p-4 transition-all ${
                        isRevoked 
                          ? "bg-zinc-950/40 border-white/5 opacity-50" 
                          : "bg-black border-white/10 hover:border-white/20"
                      }`}
                      id={`key-card-${k.id}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-sans font-bold text-sm text-white tracking-tight">{k.name}</h4>
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold uppercase ${
                              k.scope === 'all' 
                                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                                : k.scope === 'chat'
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                            }`}>
                              {k.scope} scope
                            </span>

                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold uppercase ${
                              isRevoked 
                                ? "bg-red-500/15 text-red-400 border border-red-500/10" 
                                : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/10"
                            }`}>
                              {k.status}
                            </span>
                          </div>
                          
                          {k.description && (
                            <p className="text-xs text-white/40 mt-1">{k.description}</p>
                          )}

                          <div className="mt-3.5 flex items-center gap-2">
                            <code className="text-xs font-mono text-zinc-300 bg-neutral-900 border border-white/5 px-2.5 py-1.5 rounded-lg flex-1 select-all break-all min-w-0">
                              {keyDisplay}
                            </code>
                            
                            {!isRevoked && (
                              <>
                                <button
                                  onClick={() => toggleKeyVisibility(k.id)}
                                  className="p-1.5 border border-white/10 hover:border-white/25 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all shrink-0"
                                  title={isVisible ? "Hide Private Key" : "Show Private Key"}
                                  id={`key-visibility-btn-${k.id}`}
                                >
                                  {isVisible ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                                </button>
                                
                                <button
                                  onClick={() => copyToClipboard(k.key, k.id, 'key')}
                                  className="p-1.5 border border-white/10 hover:border-white/25 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all shrink-0"
                                  title="Copy Key String"
                                  id={`copy-key-btn-${k.id}`}
                                >
                                  {copiedKeyId === k.id ? (
                                    <Check className="h-4.5 w-4.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="h-4.5 w-4.5" />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {!isRevoked && (
                          <button
                            onClick={() => handleRevokeKey(k.id)}
                            className="text-zinc-500 hover:text-red-400 border border-transparent hover:border-red-950 p-2 rounded-lg transition-colors flex items-center gap-1 shrink-0 text-xs font-mono font-bold"
                            title="Revoke Credentials permanently"
                            id={`revoke-key-btn-${k.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>REVOKE</span>
                          </button>
                        )}
                      </div>

                      <div className="mt-3.5 pt-3.5 border-t border-white/5 flex flex-wrap items-center justify-between text-[10px] font-mono text-white/30 gap-2">
                        <div className="flex gap-4">
                          <span>CREATED: {new Date(k.createdAt).toLocaleDateString()}</span>
                          <span>LAST USED: {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleTimeString() : "Never"}</span>
                        </div>
                        {k.expiresAt ? (
                          <span className="flex items-center gap-1 text-amber-500/80">
                            <Calendar className="h-3 w-3" />
                            EXPIRES: {new Date(k.expiresAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-emerald-500/80">PERMANENT AUTHORIZATION</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {keys.length === 0 && (
                  <div className="text-center py-12 border border-dashed border-white/10 rounded-xl space-y-3">
                    <Key className="h-8 w-8 text-white/25 mx-auto" />
                    <p className="text-sm font-sans font-bold text-white/50">No API keys created yet</p>
                    <p className="text-xs text-white/30 max-w-sm mx-auto">
                      Generate your first secure credentials token to integrate custom language completions with outside programs.
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Right Column: Code Implementation Guide */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-neutral-900 border border-white/10 rounded-xl p-6">
              <div className="pb-4 border-b border-white/5 mb-6">
                <h3 className="font-sans font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  REST INTEGRATION GUIDE
                </h3>
                <p className="text-[11px] text-white/30 font-mono mt-0.5">Integrate NAV AI via cURL or custom scripts</p>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-white/60 leading-relaxed">
                  Connect to your dynamic model endpoint securely. The server implements standard bearer authorization.
                </p>

                {/* Curl Box */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase">Interactive Command Snippet</span>
                    <button
                      onClick={() => copyToClipboard(getCurlSnippet(activeKey), "curl", "curl")}
                      className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                      id="copy-curl-btn"
                    >
                      {copiedCurlId === "curl" ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied cURL!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy Shell</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="bg-black border border-white/10 rounded-xl p-4 overflow-x-auto">
                    <pre className="text-[11px] font-mono text-zinc-300 leading-relaxed max-w-full">
                      <code>{getCurlSnippet(activeKey)}</code>
                    </pre>
                  </div>
                </div>

                {/* API Request Logs */}
                <div className="pt-4 border-t border-white/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">LIVE TRAFFIC STREAM</span>
                    <span className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      LISTENING ON PORT 3000
                    </span>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {logs.map((log) => {
                      const isSuccess = log.status >= 200 && log.status < 300;
                      return (
                        <div 
                          key={log.id} 
                          className="bg-black/60 border border-white/5 rounded-lg p-2.5 flex items-center justify-between text-[11px] font-mono"
                          id={`log-row-${log.id}`}
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${isSuccess ? "text-emerald-400" : "text-red-400"}`}>
                                {log.status}
                              </span>
                              <span className="text-white/80 font-semibold">{log.method}</span>
                              <span className="text-white/40 truncate text-[10px]">{log.endpoint}</span>
                            </div>
                            <div className="text-[10px] text-white/30 flex items-center gap-1.5">
                              <span>{log.apiKeyName}</span>
                              <span>•</span>
                              <span>{log.durationMs}ms</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-white/20 shrink-0">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      );
                    })}

                    {logs.length === 0 && (
                      <div className="text-center py-8 text-zinc-600 text-[11px] font-mono italic">
                        No transactions recorded. Generate a key and issue a cURL command to see streaming server logs.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
