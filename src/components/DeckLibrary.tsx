/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Search, Filter, Play, Trash2, Layers, Archive, Calendar, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { Deck } from "../types";

interface DeckLibraryProps {
  decks: Deck[];
  onNavigate: (page: string, extra?: any) => void;
  onDeleteDeck: (deckId: string) => void;
}

export default function DeckLibrary({ decks, onNavigate, onDeleteDeck }: DeckLibraryProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("All");

  // Get unique categories list dynamically
  const categories = ["All", ...Array.from(new Set(decks.map(d => d.category)))];

  // Filter lists based on search matches and selected categories
  const filteredDecks = decks.filter(deck => {
    const matchesSearch = deck.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          deck.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || deck.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-full min-h-screen bg-[#0A0A0B] text-slate-300 p-6 md:p-12 relative flex justify-center">
      {/* Immersive radial glow background */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none" />

      <div className="w-full max-w-5xl flex flex-col relative z-10">

        {/* Library header */}
        <section className="mb-8 select-none">
          <button
            onClick={() => onNavigate("dashboard")}
            className="text-xs font-mono text-slate-550 hover:text-slate-350 font-medium transition-colors flex items-center gap-1 cursor-pointer"
          >
            ← Back to Dashboard
          </button>
          <h1 className="font-sans font-extrabold text-2xl sm:text-3xl tracking-tight text-white mt-1">
            Study Deck Library
          </h1>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
            Manage your AI-ingested technical knowledge bases and review outstanding cards.
          </p>
        </section>

        {/* Search and filter controls dock */}
        <section className="flex flex-col sm:flex-row gap-3.5 mb-8 w-full">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across decks..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#161618] border border-[#262626] focus:border-indigo-500 focus:outline-none text-sm text-slate-100 transition-colors"
            />
          </div>

          {/* Category Dropdown */}
          <div className="relative shrink-0 flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-2.5 pl-3 pr-8 rounded-xl bg-[#161618] border border-[#262626] text-slate-100 text-xs focus:border-indigo-500 focus:outline-none transition-colors appearance-none cursor-pointer leading-tight w-[140px]"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Decks Grid List Area */}
        {filteredDecks.length === 0 ? (
          <div className="p-16 border border-[#262626] bg-[#161618] rounded-2xl flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-[#262626] border border-slate-800 text-slate-500 rounded-xl flex items-center justify-center mb-4">
              <Archive className="w-6 h-6" />
            </div>
            <h4 className="font-sans font-bold text-white text-base">No active decks found</h4>
            <p className="text-slate-500 text-xs max-w-sm mt-1 leading-relaxed mx-auto">
              We couldn't find any generated decks matches. Create a new deck by dragging in a technical study PDF.
            </p>
            <button
              onClick={() => onNavigate("upload")}
              className="mt-6 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/15"
            >
              Upload study PDF
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDecks.map((deck) => (
              <div
                key={deck.id}
                className="p-5 bg-[#161618] border border-[#262626] hover:border-indigo-550/30 rounded-2xl flex flex-col justify-between hover:shadow-xl shadow-md transition-all group h-[220px]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2.5 flex-wrap">
                    <span className="text-[9px] font-mono font-bold tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded uppercase border border-indigo-500/10">
                      {deck.category}
                    </span>
                    <span className="text-xs text-slate-500 font-mono font-medium flex items-center gap-1 bg-[#0A0A0B] px-2 py-0.5 rounded border border-[#262626]">
                      <Layers className="w-3 h-3 text-slate-500" /> {deck.cardCount} Cards
                    </span>
                  </div>

                  <h3 className="font-sans font-bold text-white text-base mt-4 group-hover:text-indigo-400 transition-colors line-clamp-1 leading-snug">
                    {deck.name}
                  </h3>
                  
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {deck.description}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-[#262626]/80 pt-4 mt-4 select-none">
                  <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 uppercase">
                    <Calendar className="w-3.5 h-3.5" /> {new Date(deck.createdAt).toLocaleDateString(undefined, {month: "short", day: "numeric"})}
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onDeleteDeck(deck.id)}
                      title="Delete study deck"
                      className="p-1.5 border border-[#262626] hover:border-red-500/30 hover:text-red-400 text-slate-500 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    
                    <button
                      onClick={() => onNavigate("study", deck.id)}
                      id={`study-now-deck-${deck.id}`}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow shadow-indigo-600/10"
                    >
                      Study <ArrowRight className="w-3 h-3 bg-indigo-600 rounded-full" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
