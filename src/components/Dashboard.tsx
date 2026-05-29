/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Brain, Calendar, FileText, Flame, Plus, Play, Trash2, ArrowRight, BookOpen, Layers } from "lucide-react";
import { motion } from "motion/react";
import { User, Deck, UserStats } from "../types";

interface DashboardProps {
  user: User;
  stats: UserStats;
  decks: Deck[];
  onNavigate: (page: string, extra?: any) => void;
  onDeleteDeck: (deckId: string) => void;
}

export default function Dashboard({ user, stats, decks, onNavigate, onDeleteDeck }: DashboardProps) {
  const recentDecks = [...decks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3);

  // Map category distribution percentages safely
  const categories = Object.entries(stats.categoryDistribution);
  const maxVolume = categories.length > 0 ? Math.max(...categories.map(([_, v]) => v)) : 1;

  return (
    <div className="w-full min-h-screen bg-[#0A0A0B] text-slate-300 p-6 md:p-12 relative flex justify-center">
      {/* Immersive radial glow background */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 left-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full filter blur-3xl pointer-events-none" />

      <div className="w-full max-w-5xl flex flex-col relative z-10">
        
        {/* Welcome Banner */}
        <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xs font-mono text-indigo-400 uppercase tracking-widest">Active Workspace</h2>
            <h1 className="font-sans font-extrabold text-2xl sm:text-3xl text-white tracking-tight mt-1">
              Welcome, <span className="text-transparent bg-gradient-to-r from-indigo-200 to-slate-200 bg-clip-text font-medium">{user.email}</span>
            </h1>
          </div>
          
          <button
            onClick={() => onNavigate("upload")}
            id="create-deck-btn"
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-sans font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/15 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create New Deck
          </button>
        </section>

        {/* Bento Grid Stats Panel */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Streak block */}
          <div className="p-5 bg-[#161618] border border-[#262626] rounded-2xl flex items-center justify-between shadow-xl">
            <div>
              <span className="text-xs font-mono text-slate-500">Daily Streak</span>
              <div className="text-3xl font-extrabold font-sans text-white mt-1.5 flex items-baseline gap-1">
                {stats.studyStreak} <span className="text-xs text-slate-500 font-medium font-sans">days</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Keep studying to grow daily target!</p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${stats.studyStreak > 0 ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-white/5 border-[#262626] text-slate-500"}`}>
              <Flame className="w-6 h-6 fill-current" />
            </div>
          </div>

          {/* Cards Due block */}
          <div className="p-5 bg-[#161618] border border-[#262626] rounded-2xl flex items-center justify-between shadow-xl">
            <div>
              <span className="text-xs font-mono text-slate-500">Due Reviews</span>
              <div className="text-3xl font-extrabold font-sans text-white mt-1.5 flex items-baseline gap-1">
                {stats.cardsDueToday} <span className="text-xs text-slate-500 font-medium font-sans">cards</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Pending SM-2 schedules</p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${stats.cardsDueToday > 0 ? "bg-indigo-505/10 border-indigo-500/20 text-indigo-400" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"}`}>
              {stats.cardsDueToday > 0 ? <Brain className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
            </div>
          </div>

          {/* Total Cards Studied block */}
          <div className="p-5 bg-[#161618] border border-[#262626] rounded-2xl flex items-center justify-between shadow-xl">
            <div>
              <span className="text-xs font-mono text-slate-500">Studied Count</span>
              <div className="text-3xl font-extrabold font-sans text-white mt-1.5">
                {stats.totalCardsStudied} <span className="text-xs text-slate-500 font-medium">reviews</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Total database log triggers</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-650/20 flex items-center justify-center text-indigo-400 font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>

          {/* Total Library Volume */}
          <div className="p-5 bg-[#161618] border border-[#262626] rounded-2xl flex items-center justify-between shadow-xl">
            <div>
              <span className="text-xs font-mono text-slate-500">Library Volume</span>
              <div className="text-3xl font-extrabold font-sans text-white mt-1.5">
                {stats.totalCards} <span className="text-xs text-slate-500 font-medium">cards</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Across {stats.totalDecks} custom decks</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </section>

        {/* Dashboard Core Row - Decks & Categories */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Large Column: Recent Decks */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-sans font-bold text-lg text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" /> Recent Decks
              </h3>
              <button
                onClick={() => onNavigate("library")}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-sans font-medium flex items-center gap-1 cursor-pointer"
              >
                View Full Library <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentDecks.length === 0 ? (
              <div className="p-8 rounded-2xl border border-[#262626] bg-[#161618] flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-xl bg-[#262626] flex items-center justify-center text-slate-650 mb-4">
                  <Layers className="w-6 h-6 text-slate-500" />
                </div>
                <h4 className="font-sans font-semibold text-white">No custom decks active</h4>
                <p className="text-slate-500 text-xs max-w-sm mt-1 leading-relaxed">
                  Start studying by uploading your technical PDF materials to automatically generate spaced flashcard structures.
                </p>
                <button
                  onClick={() => onNavigate("upload")}
                  className="mt-4 text-xs bg-indigo-650/10 border border-indigo-500/20 text-indigo-400 hover:bg-[#262626] px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Upload your first PDF
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {recentDecks.map((deck) => (
                  <div
                    key={deck.id}
                    className="p-5 rounded-2xl bg-[#161618] border border-[#262626] hover:border-indigo-500/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-[10px] font-mono font-bold tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/10 uppercase">
                          {deck.category}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {deck.cardCount} Cards
                        </span>
                      </div>
                      <h4 className="font-sans font-bold text-white text-base group-hover:text-indigo-400 transition-colors truncate">
                        {deck.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-md line-clamp-1">
                        {deck.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                      <button
                        onClick={() => onNavigate("study", deck.id)}
                        id={`study-deck-btn-${deck.id}`}
                        className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Study Deck
                      </button>
                      <button
                        onClick={() => onDeleteDeck(deck.id)}
                        title="Delete Deck"
                        className="p-1.5 border border-[#262626] hover:border-red-500/30 text-slate-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Bento Column: Distribution chart */}
          <div className="flex flex-col gap-4">
            <h3 className="font-sans font-bold text-lg text-white flex items-center gap-2">
              📊 Subject Focus Area
            </h3>
            <div className="p-5 rounded-2xl bg-[#161618] border border-[#262626] shadow-xl flex flex-col h-full min-h-[300px]">
              {categories.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <div className="w-10 h-10 rounded-full bg-[#262626] flex items-center justify-center text-slate-500 text-lg mb-3">
                    %
                  </div>
                  <span className="text-xs text-slate-500">
                    Extract cards to map subject learning distributions.
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-4 justify-start">
                  <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wide border-b border-[#262626] pb-2">
                    Card allocation by general study theme
                  </span>
                  
                  {categories.map(([name, count]) => {
                    const pct = Math.round((count / stats.totalCards) * 100);
                    return (
                      <div key={name} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-200">{name}</span>
                          <span className="text-slate-500 font-mono font-medium">{count} cards ({pct}%)</span>
                        </div>
                        {/* Custom animated progress tracks */}
                        <div className="w-full h-1.5 rounded-full bg-[#0A0A0B] overflow-hidden border border-[#262626]/40">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${(count / maxVolume) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
