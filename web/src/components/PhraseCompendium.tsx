"use client";

import React, { useState } from "react";
import { Search, BookOpen, ArrowLeft } from "lucide-react";
import dailyPhrases from "@/data/daily_phrases.json";

interface Phrase {
  vietnamese: string;
  english: string;
  category?: string;
  context: string;
  nuance: string;
}

const PHRASES = dailyPhrases as Phrase[];
const CATEGORIES = ["All", ...Array.from(new Set(PHRASES.map(p => p.category).filter(Boolean)))].sort() as string[];

export default function PhraseCompendium({ onBack }: { onBack: () => void }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredPhrases = PHRASES.filter(
    (p) =>
      (selectedCategory === "All" || p.category === selectedCategory) &&
      (p.vietnamese.toLowerCase().includes(searchTerm.toLowerCase()) ||
       p.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
       p.context.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="w-full max-w-4xl flex flex-col items-center animate-in fade-in duration-500">
      <header className="mb-8 w-full text-center space-y-4 relative">
        <button 
          onClick={onBack}
          className="absolute left-0 top-2 text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={20} /> <span className="hidden sm:inline">Back</span>
        </button>
        <div className="flex justify-center mb-4 text-emerald-500">
          <BookOpen size={48} />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-50">
          Daily Phrase <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Compendium</span>
        </h1>
        <p className="text-slate-400 max-w-lg mx-auto text-lg leading-relaxed">
          The most commonly spoken phrases in Northern Vietnamese daily life and workplaces.
        </p>
      </header>

      <div className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === category 
                  ? 'bg-emerald-500 text-slate-900 shadow-md shadow-emerald-500/20' 
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="relative mb-8">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={20} className="text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Search by Vietnamese, English, or Context..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-12 pr-4 py-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner"
          />
        </div>

        {filteredPhrases.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No phrases found matching "{searchTerm}" {selectedCategory !== "All" && `in ${selectedCategory}`}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredPhrases.map((phrase, idx) => (
              <div 
                key={idx} 
                className="bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl p-5 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10 group flex flex-col h-full"
              >
                <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-500/80 bg-emerald-900/30 px-2 py-1 rounded-md">
                    {phrase.context}
                  </span>
                  {phrase.category && (
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 bg-slate-800 border border-slate-700 px-2 py-1 rounded-md">
                      {phrase.category}
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-slate-50 mb-1 group-hover:text-emerald-400 transition-colors">
                  {phrase.vietnamese}
                </h3>
                <p className="text-lg text-slate-300 mb-4 font-medium">
                  {phrase.english}
                </p>
                <div className="mt-auto pt-4 border-t border-slate-800">
                  <p className="text-sm text-slate-500 italic flex items-start gap-2 leading-relaxed">
                    <span className="text-slate-600 font-serif">"</span>
                    {phrase.nuance}
                    <span className="text-slate-600 font-serif">"</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
