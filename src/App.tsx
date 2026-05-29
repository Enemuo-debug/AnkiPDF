/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Brain, Flame, Layers, LayoutDashboard, LogOut, UploadCloud, User as UserIcon } from "lucide-react";
import WelcomePage from "./components/WelcomePage";
import Dashboard from "./components/Dashboard";
import UploadPage from "./components/UploadPage";
import StudyView from "./components/StudyView";
import DeckLibrary from "./components/DeckLibrary";
import { User, Deck, UserStats } from "./types";

const INITIAL_STATS: UserStats = {
  studyStreak: 0,
  cardsDueToday: 0,
  totalCardsStudied: 0,
  totalDecks: 0,
  totalCards: 0,
  categoryDistribution: {},
};

export default function App() {
  const [view, setView] = React.useState<"welcome" | "dashboard" | "upload" | "library" | "study">("welcome");
  const [token, setToken] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [decks, setDecks] = React.useState<Deck[]>([]);
  const [stats, setStats] = React.useState<UserStats>(INITIAL_STATS);
  const [activeDeckId, setActiveDeckId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Sync active states with authentication context
  const fetchDecksAndStats = React.useCallback(async (authToken: string) => {
    try {
      // 1. Get statistics dashboard
      const statsRes = await fetch("/api/stats", {
        headers: { "Authorization": `Bearer ${authToken}` },
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 2. Get decks list
      const decksRes = await fetch("/api/decks", {
        headers: { "Authorization": `Bearer ${authToken}` },
      });
      if (decksRes.ok) {
        const decksData = await decksRes.json();
        setDecks(decksData);
      }
    } catch (err) {
      console.error("Failed to fetch statistics and decks library.", err);
    }
  }, []);

  // Initialize and check local storage
  React.useEffect(() => {
    const initializeSession = async () => {
      const cachedToken = localStorage.getItem("ankipdf_token");
      const cachedUser = localStorage.getItem("ankipdf_user");

      if (cachedToken && cachedUser) {
        try {
          const parsedUser = JSON.parse(cachedUser) as User;
          setToken(cachedToken);
          setUser(parsedUser);
          await fetchDecksAndStats(cachedToken);
          setView("dashboard");
        } catch (err) {
          console.error("Session restoration error.", err);
          localStorage.removeItem("ankipdf_token");
          localStorage.removeItem("ankipdf_user");
        }
      }
      setLoading(false);
    };

    initializeSession();
  }, [fetchDecksAndStats]);

  // Auth: Log in as guest
  const handleLoginAsGuest = async () => {
    try {
      const response = await fetch("/api/auth/guest", { method: "POST" });
      if (!response.ok) throw new Error("Guest verification offline.");
      const data = await response.json();

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("ankipdf_token", data.token);
      localStorage.setItem("ankipdf_user", JSON.stringify(data.user));

      await fetchDecksAndStats(data.token);
      setView("dashboard");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Guest connection failure.");
    }
  };

  // Auth: Email Registration / Login
  const handleEnterCustomEmail = async (emailInput: string) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput }),
      });
      
      let data = await response.json();

      if (!response.ok) {
        // Fallback: If account already exists, log them right in
        const loginResponse = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailInput }),
        });
        if (!loginResponse.ok) {
          const errData = await loginResponse.json();
          throw new Error(errData.error || "Authentication error.");
        }
        data = await loginResponse.json();
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("ankipdf_token", data.token);
      localStorage.setItem("ankipdf_user", JSON.stringify(data.user));

      await fetchDecksAndStats(data.token);
      setView("dashboard");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Connection failed.");
    }
  };

  // Auth: Logout
  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setDecks([]);
    setStats(INITIAL_STATS);
    localStorage.removeItem("ankipdf_token");
    localStorage.removeItem("ankipdf_user");
    setView("welcome");
  };

  // Core Delete action
  const handleDeleteDeck = async (deckId: string) => {
    if (!token) return;
    if (!confirm("Are you sure you want to permanently delete this study deck and all generated flashcards?")) return;

    try {
      const response = await fetch(`/api/decks/${deckId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Deletion request failed.");
      }

      // Re-fetch statistics
      await fetchDecksAndStats(token);
    } catch (err) {
      console.error(err);
      alert("Failed to delete selected study deck.");
    }
  };

  // Central Navigation Handler
  const handleNavigate = (targetPage: string, extraData?: any) => {
    switch (targetPage) {
      case "dashboard":
        if (token) fetchDecksAndStats(token); // refresh statistics
        setView("dashboard");
        break;
      case "upload":
        setView("upload");
        break;
      case "library":
        if (token) fetchDecksAndStats(token); // refresh list
        setView("library");
        break;
      case "study":
        if (extraData) {
          setActiveDeckId(extraData);
          setView("study");
        }
        break;
      default:
        setView("dashboard");
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-mono">
        <div className="flex flex-col items-center gap-3">
          <Brain className="w-8 h-8 text-indigo-500 animate-pulse animate-duration-1000" />
          <span className="text-xs text-slate-400">Restoring study session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden antialiased">
      
      {/* Floating Header when logged in */}
      {token && user && view !== "study" && (
        <nav className="w-full h-16 bg-slate-950/80 backdrop-blur border-b border-slate-900 px-6 flex items-center justify-between sticky top-0 z-50">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleNavigate("dashboard")}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center">
              <Brain className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-sans font-bold text-base tracking-tight text-white hidden sm:block">AnkiPDF</span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-1 sm:gap-4 text-xs font-mono select-none">
            {/* Dashboard Link */}
            <button
              onClick={() => handleNavigate("dashboard")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                view === "dashboard" ? "text-indigo-400 bg-indigo-500/5 font-semibold" : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> <span className="hidden md:inline">Dashboard</span>
            </button>

            {/* Library Link */}
            <button
              onClick={() => handleNavigate("library")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                view === "library" ? "text-indigo-400 bg-indigo-500/5 font-semibold" : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers className="w-4 h-4" /> <span className="hidden md:inline">Library</span>
            </button>

            {/* Upload Link */}
            <button
              onClick={() => handleNavigate("upload")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                view === "upload" ? "text-indigo-400 bg-indigo-500/5 font-semibold" : "text-slate-400 hover:text-white"
              }`}
            >
              <UploadCloud className="w-4 h-4" /> <span className="hidden md:inline">PDF Upload</span>
            </button>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {/* Streak Badge */}
            <div className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-500">
              <Flame className="w-3.5 h-3.5 fill-current" /> {stats.studyStreak}d
            </div>

            {/* User Dropdown Profile mock */}
            <div className="flex items-center gap-2 border-l border-slate-900 pl-3">
              <span className="text-[10px] font-mono text-slate-500 max-w-[100px] truncate hidden lg:block">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                title="Log Out Session"
                className="p-1.5 border border-slate-800 hover:border-red-500/40 text-slate-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* Render Main Area */}
      <div className="flex-1 w-full flex flex-col">
        {view === "welcome" && (
          <WelcomePage
            onStart={() => console.log("Started")}
            onLoginAsGuest={handleLoginAsGuest}
            onEnterCustomEmail={handleEnterCustomEmail}
          />
        )}

        {view === "dashboard" && token && user && (
          <Dashboard
            user={user}
            stats={stats}
            decks={decks}
            onNavigate={handleNavigate}
            onDeleteDeck={handleDeleteDeck}
          />
        )}

        {view === "upload" && token && (
          <UploadPage
            token={token}
            onNavigate={handleNavigate}
          />
        )}

        {view === "library" && token && (
          <DeckLibrary
            decks={decks}
            onNavigate={handleNavigate}
            onDeleteDeck={handleDeleteDeck}
          />
        )}

        {view === "study" && token && activeDeckId && (
          <StudyView
            deckId={activeDeckId}
            token={token}
            onNavigate={handleNavigate}
          />
        )}
      </div>

    </div>
  );
}
