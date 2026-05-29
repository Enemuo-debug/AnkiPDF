/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Brain, ArrowLeft, RotateCw, AlertTriangle, CheckCircle2, ChevronRight, Award, Zap, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Card, Deck } from "../types";

interface StudyViewProps {
  deckId: string;
  token: string;
  onNavigate: (page: string, extra?: any) => void;
}

export default function StudyView({ deckId, token, onNavigate }: StudyViewProps) {
  const [deck, setDeck] = React.useState<Deck | null>(null);
  const [cards, setCards] = React.useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isFlipped, setIsFlipped] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  
  // Track study results in current session
  const [studyHistory, setStudyHistory] = React.useState<{ cardId: string; rating: number }[]>([]);
  const [sessionCompleted, setSessionCompleted] = React.useState(false);

  // Fetch deck and cards due today (or all cards if none are strictly scheduled, so the user can study any time)
  React.useEffect(() => {
    const fetchStudyData = async () => {
      setLoading(true);
      setError("");
      try {
        // 1. Fetch Deck details
        const deckRes = await fetch(`/api/decks/${deckId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!deckRes.ok) throw new Error("Could not load deck details.");
        const deckData = await deckRes.json();
        setDeck(deckData);

        // 2. Try fetching due cards
        const dueRes = await fetch(`/api/decks/${deckId}/due`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!dueRes.ok) throw new Error("Failed to load due cards queue.");
        let dueCards = await dueRes.json();

        // Fallback: If no cards are due today, load ALL cards in deck for practice!
        // This ensures a great user experience so that decks are never locked.
        if (dueCards.length === 0) {
          const allRes = await fetch(`/api/decks/${deckId}/cards`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (allRes.ok) {
            dueCards = await allRes.json();
          }
        }

        setCards(dueCards);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Load crashed.");
      } finally {
        setLoading(false);
      }
    };

    fetchStudyData();
  }, [deckId, token]);

  const currentCard = cards[currentIndex];

  // SM-2 rating click handler
  const handleRate = async (rating: number) => {
    if (!currentCard) return;

    try {
      // Record session history
      setStudyHistory(prev => [...prev, { cardId: currentCard.id, rating }]);

      // Post rating log to Express SM-2 schedule API
      const response = await fetch("/api/cards/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          cardId: currentCard.id,
          rating: rating
        })
      });

      if (!response.ok) {
        console.error("Failed to commit study review log.");
      }

      // Step forward
      if (currentIndex + 1 < cards.length) {
        setIsFlipped(false);
        // Stagger indexing for smooth reset animation
        setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
        }, 150);
      } else {
        setSessionCompleted(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Keyboard navigation shortcuts setup
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading || sessionCompleted || cards.length === 0) return;

      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (isFlipped) {
        if (e.key === "1") {
          e.preventDefault();
          handleRate(1); // Again
        } else if (e.key === "2") {
          e.preventDefault();
          handleRate(3); // Hard
        } else if (e.key === "3") {
          e.preventDefault();
          handleRate(4); // Good
        } else if (e.key === "4") {
          e.preventDefault();
          handleRate(5); // Easy
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, sessionCompleted, cards, isFlipped, currentIndex]);

  /**
   * Intelligently parses Cloze deletions (e.g. {{c1::membrane}})
   */
  const renderFrontContent = (card: Card) => {
    if (card.type === "cloze") {
      // Regex to search double brackets text
      const regex = /\{\{c\d+::(.*?)\}\}/gi;
      const frontString = card.front.replace(regex, " [ . . . ] ");
      return (
        <div className="flex flex-col gap-3.5 text-center">
          <span className="text-[10px] font-mono tracking-widest text-indigo-400 font-bold uppercase bg-indigo-500/5 px-2.5 py-1 rounded border border-indigo-500/10 w-fit mx-auto select-none">
            CLOZE DELETION
          </span>
          <p className="text-lg sm:text-xl font-sans font-medium text-slate-100 leading-relaxed max-w-lg">
            {frontString}
          </p>
        </div>
      );
    }

    if (card.type === "definition") {
      return (
        <div className="flex flex-col gap-3.5 text-center">
          <span className="text-[10px] font-mono tracking-widest text-[rgb(124,58,237)] font-bold uppercase bg-violet-500/5 px-2.5 py-1 rounded border border-violet-500/10 w-fit mx-auto select-none">
            CONCEPT TERM
          </span>
          <h3 className="text-2xl font-sans font-bold text-white tracking-tight leading-snug">
            {card.front}
          </h3>
        </div>
      );
    }

    // Default: Q&A Question formatting
    return (
      <div className="flex flex-col gap-3.5 text-center px-4">
        <span className="text-[10px] font-mono tracking-widest text-emerald-400 font-bold uppercase bg-emerald-500/5 px-2.5 py-1 rounded border border-emerald-500/10 w-fit mx-auto select-none">
          ACTIVE RECALL QUESTION
        </span>
        <p className="text-lg sm:text-xl font-sans font-medium text-slate-100 leading-relaxed max-w-lg">
          {card.front}
        </p>
      </div>
    );
  };

  const renderBackContent = (card: Card) => {
    if (card.type === "cloze") {
      // Highlight cloze deletions in the front context
      const regex = /\{\{c\d+::(.*?)\}\}/gi;
      const parts = card.front.split(regex);
      const matches = [...card.front.matchAll(regex)].map(m => m[1]);
      
      let matchIdx = 0;
      return (
        <div className="flex flex-col gap-4 text-center px-4">
          <span className="text-[10px] font-mono tracking-wider text-indigo-300 font-medium">ANSWER REVEAL</span>
          <p className="text-base sm:text-lg text-slate-300 font-sans leading-relaxed max-w-lg">
            {parts.map((p, i) => {
              if (i % 2 !== 0) {
                const ans = matches[matchIdx++];
                return (
                  <span key={i} className="text-indigo-400 font-bold border-b border-indigo-500/30 px-1 select-all bg-indigo-500/10 rounded pb-0.5">
                    {ans}
                  </span>
                );
              }
              return p;
            })}
          </p>
          <div className="border-t border-slate-800/60 pt-3.5 mt-2.5 text-xs text-slate-400 leading-relaxed">
            {card.back}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 text-center px-4">
        <span className="text-[10px] font-mono tracking-wider text-slate-400">ANSWER / EXPLANATION</span>
        <p className="text-base sm:text-lg text-white font-sans font-medium leading-relaxed max-w-lg">
          {card.back}
        </p>
      </div>
    );
  };

  /**
   * Visual loading or error grids
   */
  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center text-slate-350">
        <div className="flex flex-col items-center gap-3">
          <BookOpen className="w-8 h-8 text-indigo-500 animate-pulse" />
          <p className="text-xs font-mono text-slate-500">Syncing database review states...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen bg-[#0A0A0B] p-6 flex flex-col items-center justify-center text-slate-350">
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 max-w-md text-center flex flex-col items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-red-500" />
          <h3 className="font-bold text-white text-base">Study load error</h3>
          <p className="text-xs text-red-400 leading-relaxed">{error}</p>
          <button
            onClick={() => onNavigate("dashboard")}
            className="mt-4 px-4 py-2 bg-[#161618] border border-[#262626] rounded-xl text-xs font-semibold cursor-pointer text-slate-200 hover:bg-[#262626]"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Handle deck empty case
  if (cards.length === 0) {
    return (
      <div className="w-full min-h-screen bg-[#0A0A0B] p-6 flex flex-col items-center justify-center text-slate-350">
        <div className="p-8 rounded-2xl bg-[#161618] border border-[#262626] max-w-md text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="font-sans font-extrabold text-white text-lg">Inbox Zero achieved!</h2>
          <p className="text-xs text-slate-550 leading-relaxed">
            There are active cards scheduled for review in this deck right now. Check back tomorrow, or explore additional decks in your library.
          </p>
          <div className="flex gap-2.5 mt-2">
            <button
               onClick={() => onNavigate("library")}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-505 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Explore Deck Library
            </button>
            <button
              onClick={() => onNavigate("dashboard")}
              className="px-4 py-2 bg-[#0A0A0B] hover:bg-[#161618] border border-[#262626] text-xs font-semibold rounded-xl text-slate-300 transition-all cursor-pointer"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Post Session view screen
  if (sessionCompleted) {
    const totalCount = studyHistory.length;
    const recalledSuccess = studyHistory.filter(h => h.rating >= 3).length;
    const recalledPct = totalCount > 0 ? Math.round((recalledSuccess / totalCount) * 100) : 100;

    return (
      <div className="w-full min-h-screen bg-[#0A0A0B] text-slate-350 p-6 md:p-12 relative flex justify-center items-center">
        <div className="absolute top-1/4 h-72 w-72 bg-emerald-500/5 rounded-full filter blur-3xl pointer-events-none" />
        
        <div className="w-full max-w-lg p-6 sm:p-8 rounded-2xl bg-[#161618] border border-[#262626] shadow-2xl relative z-10 text-center flex flex-col items-center">
          <div className="relative flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Award className="w-8 h-8" />
            </div>
          </div>

          <h2 className="font-sans font-extrabold text-2xl text-white tracking-tight">
            Session Complete!
          </h2>
          <p className="text-slate-500 text-xs mt-1.5 font-mono">
            Awesome progress with {deck?.name || "the deck"}
          </p>

          {/* Stats details card */}
          <div className="grid grid-cols-2 gap-4 w-full mt-8 bg-[#0A0A0B]/85 p-5 rounded-2xl border border-[#262626]">
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Cards Reviewed</span>
              <span className="text-2xl font-bold font-sans text-white mt-1 block">
                {totalCount} <span className="text-xs text-slate-550 font-medium">cards</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Acquisition Level</span>
              <span className="text-2xl font-bold font-sans text-emerald-400 mt-1 block flex items-center justify-center gap-1">
                <Zap className="w-4 h-4 fill-current text-emerald-400 shrink-0" /> {recalledPct}%
              </span>
            </div>
          </div>

          <p className="text-slate-500 text-xs mt-6 leading-relaxed max-w-sm">
            SM-2 algorithm has dynamically integrated your memory feedback logs to reschedule due-points recursively.
          </p>

          <div className="flex gap-3 w-full mt-8 flex-col sm:flex-row">
            <button
              onClick={() => onNavigate("dashboard")}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-505 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Dashboard Metrics
            </button>
            <button
              onClick={() => onNavigate("library")}
              className="flex-1 py-2.5 bg-[#0A0A0B] hover:bg-[#161618] border border-[#262626] rounded-xl text-xs font-semibold text-slate-350 cursor-pointer"
            >
              Browse other Decks
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex) / cards.length) * 100);

  return (
    <div className="w-full min-h-screen bg-[#0A0A0B] text-slate-300 p-4 sm:p-6 md:p-12 relative flex flex-col items-center justify-start">
      {/* Visual neon spots */}
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl flex flex-col relative z-10 h-full">
        {/* Navigation back and header labels */}
        <section className="flex items-center justify-between gap-4 mb-6 sm:mb-8 select-none">
          <button
            onClick={() => onNavigate("dashboard")}
            className="text-xs font-mono text-slate-500 hover:text-slate-300 font-medium transition-colors flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </button>
          <div>
            <span className="text-xs text-slate-400 font-mono font-medium">
              Card {currentIndex + 1} of {cards.length}
            </span>
          </div>
        </section>

        {/* Dynamic overall progress meter */}
        <div className="w-full h-1 bg-[#0A0A0B] border border-[#262626]/40 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Card Stage with Perspective */}
        <div className="flex-1 max-w-xl w-full mx-auto" style={{ perspective: "1000px" }}>
          
          <div
            onClick={() => !isFlipped && setIsFlipped(true)}
            className={`cursor-pointer relative w-full h-[320px] transition-transform duration-500 preserve-3d select-none ${
              isFlipped ? "rotate-y-180" : ""
            }`}
            style={{
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)"
            }}
          >
            {/* Front Card Panel */}
            <div
              className="absolute inset-0 p-6 bg-[#161618] border border-[#262626] rounded-2xl shadow-2xl flex flex-col justify-center items-center outline-none select-none"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden"
              }}
            >
              {renderFrontContent(currentCard)}
              
              {!isFlipped && (
                <div className="absolute bottom-5 text-[10px] font-mono text-slate-550 flex items-center gap-1 uppercase select-none">
                  <RotateCw className="w-3.5 h-3.5" /> Press Space or Click Card to Flip
                </div>
              )}
            </div>

            {/* Back Card Panel */}
            <div
              className="absolute inset-0 p-6 bg-[#161618] border border-[#262626] rounded-2xl shadow-2xl flex flex-col justify-center items-center outline-none select-none"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg)"
              }}
            >
              {renderBackContent(currentCard)}

              {currentCard.sourcePage && (
                <div className="absolute bottom-4 left-6 text-[9px] font-mono text-slate-500 select-none">
                  SOURCE PG. {currentCard.sourcePage}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Dynamic Buttons Sub-dock */}
        <div className="mt-8 flex flex-col gap-4 max-w-xl w-full mx-auto min-h-[90px]">
          <AnimatePresence mode="wait">
            {!isFlipped ? (
              <motion.button
                key="flip-btn"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                onClick={() => setIsFlipped(true)}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-sans font-bold text-sm tracking-wide shadow-lg shadow-indigo-600/15 cursor-pointer text-center select-none"
              >
                Reveal Answer (Spacebar)
              </motion.button>
            ) : (
              <motion.div
                key="rating-grid"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="grid grid-cols-4 gap-2.5 w-full"
              >
                {/* AGAIN BUTTON */}
                <button
                  onClick={() => handleRate(1)}
                  className="flex flex-col items-center justify-center p-2.5 bg-red-650/10 hover:bg-red-650/20 active:bg-red-600/30 border border-red-500/25 rounded-xl transition-all h-[75px] group cursor-pointer text-center"
                >
                  <span className="text-[10px] font-mono font-bold text-red-400 group-hover:scale-105 transition-transform block">AGAIN</span>
                  <span className="text-[10px] text-red-500 font-mono mt-1 select-none font-medium text-center">1 day [Key 1]</span>
                </button>

                {/* HARD BUTTON */}
                <button
                  onClick={() => handleRate(3)}
                  className="flex flex-col items-center justify-center p-2.5 bg-amber-650/10 hover:bg-amber-650/20 active:bg-amber-600/30 border border-amber-500/25 rounded-xl transition-all h-[75px] group cursor-pointer text-center"
                >
                  <span className="text-[10px] font-mono font-bold text-amber-400 group-hover:scale-105 transition-transform block">HARD</span>
                  <span className="text-[10px] text-amber-500 font-mono mt-1 select-none font-medium text-center">Practice [Key 2]</span>
                </button>

                {/* GOOD BUTTON */}
                <button
                  onClick={() => handleRate(4)}
                  className="flex flex-col items-center justify-center p-2.5 bg-indigo-650/10 hover:bg-indigo-650/20 active:bg-indigo-650/30 border border-indigo-500/25 rounded-xl transition-all h-[75px] group cursor-pointer text-center"
                >
                  <span className="text-[10px] font-mono font-bold text-indigo-400 group-hover:scale-105 transition-transform block">GOOD</span>
                  <span className="text-[10px] text-indigo-400 font-mono mt-1 select-none font-medium text-center">Active [Key 3]</span>
                </button>

                {/* EASY BUTTON */}
                <button
                  onClick={() => handleRate(5)}
                  className="flex flex-col items-center justify-center p-2.5 bg-emerald-650/10 hover:bg-emerald-650/20 active:bg-emerald-650/30 border border-emerald-500/25 rounded-xl transition-all h-[75px] group cursor-pointer text-center"
                >
                  <span className="text-[10px] font-mono font-bold text-emerald-400 group-hover:scale-105 transition-transform block">EASY</span>
                  <span className="text-[10px] text-emerald-500 font-mono mt-1 select-none font-medium text-center">Locked [Key 4]</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
