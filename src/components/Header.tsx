import React from "react";
import { Cpu, Code2, MessageSquareCode, Terminal, Bot, Sparkles } from "lucide-react";

interface HeaderProps {
  activeTab: 'playground' | 'developer' | 'agents';
  setActiveTab: (tab: 'playground' | 'developer' | 'agents') => void;
  apiStatus: 'online' | 'offline';
}

export default function Header({ activeTab, setActiveTab, apiStatus }: HeaderProps) {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 p-2 rounded-xl shadow-lg shadow-emerald-950/40">
          <Cpu className="h-6 w-6 text-zinc-950 stroke-[2.5]" id="header-logo-icon" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-sans font-bold tracking-tight text-xl text-zinc-50" id="header-title">
              NAV AI
            </h1>
            <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full font-mono font-medium">
              v1.0.0
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 font-mono">NEXT-GEN AI ENGINE</p>
        </div>
      </div>

      {/* Tab navigation */}
      <nav className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800" id="header-navigation">
        <button
          onClick={() => setActiveTab('agents')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'agents'
              ? 'bg-zinc-800 text-emerald-400 shadow-md shadow-zinc-950/50'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
          id="tab-agents-btn"
        >
          <Bot className="h-4 w-4 text-emerald-400" />
          <span>AI Agent Studio</span>
          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-mono">NEW</span>
        </button>
        <button
          onClick={() => setActiveTab('playground')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'playground'
              ? 'bg-zinc-800 text-teal-400 shadow-md shadow-zinc-950/50'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
          id="tab-playground-btn"
        >
          <MessageSquareCode className="h-4 w-4" />
          Playground
        </button>
        <button
          onClick={() => setActiveTab('developer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'developer'
              ? 'bg-zinc-800 text-teal-400 shadow-md shadow-zinc-950/50'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
          id="tab-developer-btn"
        >
          <Code2 className="h-4 w-4" />
          Developer Hub
        </button>
      </nav>

      {/* Server Status Indicators */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs font-mono">
          <Terminal className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-zinc-400">Endpoint:</span>
          <span className="text-emerald-400 font-medium">/api/v1/chat</span>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
          <span className={`h-2 w-2 rounded-full ${apiStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500 animate-pulse'}`} />
          <span className="text-xs font-medium text-zinc-300 capitalize">{apiStatus === 'online' ? 'Active' : 'Offline'}</span>
        </div>
      </div>
    </header>
  );
}
