import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import Playground from "./components/Playground";
import DeveloperHub from "./components/DeveloperHub";
import AgentStudio from "./components/AgentStudio";
import { ChatSession } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<'playground' | 'developer' | 'agents'>('agents');
  const [apiStatus, setApiStatus] = useState<'online' | 'offline'>('online');
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const stored = localStorage.getItem("nav_ai_sessions");
      if (stored) {
        const parsed = JSON.parse(stored) as ChatSession[];
        if (parsed.length > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.error("Failed to restore cached chat sessions", error);
    }
    return [{
      id: "session_default",
      title: "NAV Intelligence Pipeline",
      messages: [],
      model: "gemini-3.5-flash",
      temperature: 0.7,
      systemInstruction: "You are NAV AI, an advanced, ultra-helpful AI assistant designed to provide direct, clean, and highly professional coding, reasoning, and written solutions. Ensure any code returned has full explanations."
    }];
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem("nav_ai_sessions");
      if (stored) {
        const parsed = JSON.parse(stored) as ChatSession[];
        if (parsed.length > 0) {
          return parsed[0].id;
        }
      }
    } catch (error) {
      console.error("Failed to restore cached chat sessions for ID", error);
    }
    return "session_default";
  });

  // Save sessions to localStorage on update
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem("nav_ai_sessions", JSON.stringify(sessions));
    } else {
      localStorage.removeItem("nav_ai_sessions");
    }
  }, [sessions]);

  // Safeguard: Ensure there is always at least one session
  useEffect(() => {
    if (sessions.length === 0) {
      const defaultSession: ChatSession = {
        id: "session_default",
        title: "NAV Intelligence Pipeline",
        messages: [],
        model: "gemini-3.5-flash",
        temperature: 0.7,
        systemInstruction: "You are NAV AI, an advanced, ultra-helpful AI assistant designed to provide direct, clean, and highly professional coding, reasoning, and written solutions. Ensure any code returned has full explanations."
      };
      setSessions([defaultSession]);
      setActiveSessionId(defaultSession.id);
    }
  }, [sessions]);

  // Perform lightweight server ping to determine status
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const res = await fetch("/api/developer/keys");
        if (res.ok) {
          setApiStatus('online');
        } else {
          setApiStatus('offline');
        }
      } catch (e) {
        setApiStatus('offline');
      }
    };
    checkApiStatus();
    const timer = setInterval(checkApiStatus, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-[#e5e5e5] font-sans antialiased overflow-hidden">
      {/* Dynamic Header Component */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        apiStatus={apiStatus} 
      />

      {/* Main Panel Router */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'agents' ? (
          <AgentStudio />
        ) : activeTab === 'playground' ? (
          <Playground 
            sessions={sessions}
            setSessions={setSessions}
            activeSessionId={activeSessionId}
            setActiveSessionId={setActiveSessionId}
          />
        ) : (
          <DeveloperHub 
            apiStatus={apiStatus}
          />
        )}
      </main>
    </div>
  );
}
