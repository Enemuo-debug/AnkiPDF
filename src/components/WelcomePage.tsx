/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BookOpen, Brain, Sparkles, UploadCloud, ChevronRight, Check } from "lucide-react";
import { motion } from "motion/react";

interface WelcomePageProps {
  onStart: () => void;
  onLoginAsGuest: () => void;
  onEnterCustomEmail: (email: string) => void;
}

export default function WelcomePage({ onStart, onLoginAsGuest, onEnterCustomEmail }: WelcomePageProps) {
  const [emailInput, setEmailInput] = React.useState("");

  const handleSubmitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      onEnterCustomEmail(emailInput.trim());
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#0A0A0B] text-slate-300 flex flex-col items-center justify-start overflow-x-hidden pb-16">
      {/* Background visual graphics */}
      <div className="absolute top-0 left-12 w-96 h-96 bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-12 w-96 h-96 bg-violet-600/5 rounded-full filter blur-3xl pointer-events-none" />

      {/* Hero Header Area */}
      <header className="w-full max-w-7xl px-6 h-20 flex items-center justify-between border-b border-[#262626] relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/25">
            <span className="font-bold text-white text-lg">F</span>
          </div>
          <div>
            <span className="font-sans font-bold text-xl tracking-tight text-white">
              FlashPDF
            </span>
            <span className="ml-1.5 text-[10px] font-mono uppercase bg-indigo-600/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-600/20">
              AI-Engine
            </span>
          </div>
        </div>
        
        <div>
          <button
            onClick={onLoginAsGuest}
            id="guest-login-btn"
            className="text-xs font-sans font-medium text-slate-300 hover:text-white px-4 py-2 rounded-xl border border-[#262626] hover:bg-white/5 transition-all cursor-pointer"
          >
            Skip to Guest Account
          </button>
        </div>
      </header>

      {/* Hero Visual Section */}
      <main className="w-full max-w-3xl px-6 flex flex-col items-center justify-center text-center mt-12 sm:mt-24 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-6 rounded-full bg-[#161618] border border-[#262626] text-slate-400 text-xs shadow-inner">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Generate flashcards instantly from complex PDFs</span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-sans font-extrabold text-4xl sm:text-6xl tracking-tight leading-tight text-white text-center"
        >
          Transform Your PDFs into Intelligent <span className="text-transparent bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text">Spaced Flashcards</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-slate-500 mt-6 text-base sm:text-lg max-w-xl leading-relaxed"
        >
          An active recall study companion designed exclusively for developers. Upload technical textbooks, research drafts, or code repositories and master them in hours.
        </motion.p>

        {/* Dynamic Join CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full max-w-md mt-10 p-6 rounded-2xl bg-[#161618] border border-[#262626] backdrop-blur shadow-xl"
        >
          <form onSubmit={handleSubmitEmail} className="flex gap-2 w-full">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Enter your email to study"
              required
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#0A0A0B] border border-[#262626] focus:border-indigo-600 focus:outline-none text-sm text-slate-100 transition-colors"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-sans font-medium text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              Start Free <ChevronRight className="w-4 h-4" />
            </button>
          </form>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#262626] text-xs text-slate-500">
            <span>⚡ Zero config required</span>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              onClick={onLoginAsGuest}
              className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 hover:decoration-solid cursor-pointer"
            >
              Instant Guest Mode
            </button>
          </div>
        </motion.div>
      </main>

      {/* Feature Bento Section */}
      <section className="w-full max-w-6xl px-6 grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 sm:mt-32 relative z-10">
        <div className="p-6 rounded-2xl bg-[#161618] border border-[#262626] flex flex-col items-start hover:border-indigo-500/30 transition-colors">
          <div className="w-11 h-11 rounded-lg bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-400 mb-5">
            <UploadCloud className="w-5 h-5" />
          </div>
          <h3 className="font-sans font-bold text-white text-lg">Instant Ingestion Pipeline</h3>
          <p className="text-slate-500 text-sm mt-2 leading-relaxed">
            Drag and drop technical files or API documentations. Our parser segments visual columns instantly and submits formatted segments directly to LLMs.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#161618] border border-[#262626] flex flex-col items-start hover:border-indigo-500/30 transition-colors">
          <div className="w-11 h-11 rounded-lg bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-400 mb-5">
            <Brain className="w-5 h-5" />
          </div>
          <h3 className="font-sans font-bold text-white text-lg">Intelligent Gemini Analysis</h3>
          <p className="text-slate-500 text-sm mt-2 leading-relaxed">
            Generates high-fidelity Q&A decks, interactive definition blocks, and native Anki brackets cloze cards, complete with estimated source page metadata.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#161618] border border-[#262626] flex flex-col items-start hover:border-indigo-500/30 transition-colors">
          <div className="w-11 h-11 rounded-lg bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-400 mb-5">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="font-sans font-bold text-white text-lg">Optimized SM-2 Intervals</h3>
          <p className="text-slate-500 text-sm mt-2 leading-relaxed">
            Utilizes custom mathematical spacing mechanics that factor in study streak memory logs to serve dues only as they approach expiration.
          </p>
        </div>
      </section>

      {/* Social Verification Reviews */}
      <section className="w-full max-w-5xl px-6 mt-20 sm:mt-28 flex flex-col items-center">
        <h2 className="text-slate-500 text-xs font-mono tracking-widest uppercase mb-10">TRUSTED BY LEADING WORKSPACES</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <div className="p-5 rounded-2xl bg-[#161618] border border-[#262626] text-slate-400 italic text-sm relative">
            <p className="leading-relaxed">
              "Being able to drop dynamic framework PDF docs and automatically receive a high-level active-recall deck is an absolute game-changer. I mastered a new systems stack in a weekend."
            </p>
            <div className="mt-4 text-xs font-sans not-italic font-semibold text-slate-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              DevOnsite Senior Architect
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-[#161618] border border-[#262626] text-slate-400 italic text-sm relative">
            <p className="leading-relaxed">
              "The SM-2 spaced repetition integration makes absolute sure information hits daily recall right at the sweet spot. It's essentially SuperMemo built perfectly for web materials."
            </p>
            <div className="mt-4 text-xs font-sans not-italic font-semibold text-slate-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              Full Stack Engineering Lead
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer copyright */}
      <footer className="mt-28 text-slate-600 text-xs">
        © 2026 FlashPDF. Powered by @google/genai & SM-2.
      </footer>
    </div>
  );
}
