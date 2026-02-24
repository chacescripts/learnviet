"use client";

import React, { useState } from "react";
import { Check, X, ArrowRight } from "lucide-react";

interface SentenceDecoderProps {
  sentence: string;
  contextHint: string;
  dictionary: Record<string, string | string[]>;
  unlockedWords: Set<string>;
  onUnlock: (word: string) => void;
  onNextStage: () => void;
  isLastStage: boolean;
}

export default function SentenceDecoder({ 
  sentence, 
  contextHint, 
  dictionary, 
  unlockedWords, 
  onUnlock,
  onNextStage,
  isLastStage
}: SentenceDecoderProps) {
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);
  const [justUnlocked, setJustUnlocked] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const tokens = sentence.split(" ");

  const handleWordClick = (word: string) => {
    if (unlockedWords.has(word) || !dictionary[word]) return;
    setActiveWord(word);
    setGuess("");
    setFeedback(null);
    setFailedAttempts(0);
  };

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWord) return;

    const dictEntry = dictionary[activeWord];
    const correctTranslations = Array.isArray(dictEntry) 
      ? dictEntry.map(t => t.toLowerCase()) 
      : [dictEntry.toLowerCase()];
    
    if (correctTranslations.includes(guess.trim().toLowerCase())) {
      setFeedback("success");
      
      setTimeout(() => {
        onUnlock(activeWord);
        setJustUnlocked(activeWord);
        setActiveWord(null);
        setFeedback(null);
        
        setTimeout(() => setJustUnlocked(null), 2000);
      }, 600);
    } else {
      setFeedback("error");
      setFailedAttempts(prev => prev + 1);
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  const isSentenceFullyUnlocked = tokens.every(token => 
    /^[.,?!]+$/.test(token) || !dictionary[token] || unlockedWords.has(token)
  );

  const renderModal = () => {
    if (!activeWord) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl transform transition-all scale-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-medium text-slate-50">Decode Concept</h3>
            <button 
              onClick={() => setActiveWord(null)}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="mb-8 p-4 bg-slate-900 rounded-xl border border-slate-800 text-center text-lg leading-relaxed flex flex-wrap justify-center gap-2">
            {tokens.map((token, idx) => {
              const isPunctuation = /^[.,?!]+$/.test(token);
              const displayToken = token.replace(/_/g, " ");
              
              if (token === activeWord) {
                 return <span key={idx} className="font-bold text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded-md">{displayToken}</span>;
              }
              
              if (unlockedWords.has(token) || !dictionary[token] || isPunctuation) {
                return <span key={idx} className="text-slate-300">{displayToken}</span>;
              }
              
              return <span key={idx} className="text-slate-500 underline decoration-slate-600 underline-offset-4">{displayToken}</span>;
            })}
          </div>

          <form onSubmit={handleGuessSubmit} className="space-y-4">
            <div>
              <label htmlFor="guess" className="block text-sm text-slate-400 mb-2">
                What does <span className="text-emerald-400 font-semibold">{activeWord.replace(/_/g, " ")}</span> mean in English?
              </label>
              <input
                id="guess"
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Type your guess..."
                className={`w-full bg-slate-900 border ${feedback === 'error' ? 'border-red-500 focus:ring-red-500/50' : feedback === 'success' ? 'border-emerald-500 focus:ring-emerald-500/50' : 'border-slate-600 focus:border-slate-400'} rounded-xl px-4 py-3 text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/50 transition-all`}
                autoFocus
                autoComplete="off"
              />
            </div>
            
            <button
              type="submit"
              className={`w-full py-3 rounded-xl font-medium flex items-center justify-center transition-all ${
                feedback === 'success' 
                  ? 'bg-emerald-500 text-slate-900' 
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-50 hover:scale-[1.02]'
              }`}
            >
              {feedback === 'success' ? (
                <><Check className="mr-2" size={20} /> Correct!</>
              ) : (
                'Verify'
              )}
            </button>
            
            {feedback !== 'success' && (
              <button
                type="button"
                onClick={() => {
                  setFeedback("success");
                  setTimeout(() => {
                    onUnlock(activeWord);
                    setJustUnlocked(activeWord);
                    setActiveWord(null);
                    setFeedback(null);
                    setTimeout(() => setJustUnlocked(null), 2000);
                  }, 400);
                }}
                className="w-full py-2 mt-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
              >
                Skip word (I already know this)
              </button>
            )}
          </form>

          {failedAttempts >= 3 && (
            <div className="mt-6 p-4 bg-slate-900/50 border border-slate-700 rounded-xl text-center animate-in fade-in slide-in-from-bottom-2">
              <p className="text-sm text-slate-400 mb-3">Stuck? The answer is:</p>
              <button
                type="button"
                onClick={() => {
                  const dictEntry = dictionary[activeWord];
                  const firstTranslation = Array.isArray(dictEntry) ? dictEntry[0] : dictEntry;
                  setGuess(firstTranslation);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-emerald-400 font-medium py-2 px-4 rounded-lg transition-colors border border-slate-700 shadow-sm"
              >
                Reveal Answer
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
      <div className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-8 md:p-12 shadow-lg backdrop-blur-sm">
        <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-4 text-2xl md:text-4xl leading-loose font-medium">
          {tokens.map((token, index) => {
            const isPunctuation = /^[.,?!]+$/.test(token);
            const displayToken = token.replace(/_/g, " ");

            if (isPunctuation || !dictionary[token]) {
              return (
                <span key={index} className="text-slate-300">
                  {displayToken}
                </span>
              );
            }

            const isUnlocked = unlockedWords.has(token);
            const isJustUnlocked = justUnlocked === token;

            if (isUnlocked) {
              const dictEntry = dictionary[token];
              const tooltipText = Array.isArray(dictEntry) ? dictEntry[0] : dictEntry;

              return (
                <div key={index} className="relative group cursor-default">
                  <span className={`transition-colors duration-700 ${isJustUnlocked ? 'text-emerald-400' : 'text-slate-50'}`}>
                    {displayToken}
                  </span>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-emerald-400 text-sm px-2 py-1 rounded border border-slate-700 whitespace-nowrap pointer-events-none z-10">
                    {tooltipText}
                  </div>
                </div>
              );
            }

            return (
              <button
                key={index}
                onClick={() => handleWordClick(token)}
                className="bg-slate-900 text-emerald-500/80 rounded-xl px-4 py-2 cursor-pointer transition-all hover:scale-105 hover:bg-slate-800 hover:text-emerald-400 border border-emerald-500/30 shadow-sm"
              >
                {displayToken}
              </button>
            );
          })}
        </div>
        
        <div className="mt-10 pt-8 border-t border-slate-700/50 text-center">
          <p className="text-sm text-slate-500 uppercase tracking-widest mb-2 font-semibold">Context Clue</p>
          <p className="text-xl text-slate-300 italic font-light">
            "{contextHint}"
          </p>
        </div>
      </div>
      
      {isSentenceFullyUnlocked && (
        <button 
          onClick={onNextStage}
          className="mt-8 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-3 px-6 rounded-xl flex items-center transition-all hover:scale-105 shadow-lg shadow-emerald-500/20"
        >
          {isLastStage ? 'Next Phase (Reading Comprehension)' : 'Next Scenario'} <ArrowRight className="ml-2" size={20} />
        </button>
      )}

      {renderModal()}
    </div>
  );
}
