"use client";

import React, { useState } from "react";
import { Check, X, ArrowRight } from "lucide-react";

interface DialogueLine {
  speaker: string;
  vietnamese_sentence: string;
  english_translation: string;
}

interface ComprehensionQuestion {
  question: string;
  options: string[];
  correct_answer_index: number;
}

interface DialogueData {
  theme: string;
  scene_setting_english: string;
  dialogue: DialogueLine[];
  comprehension_questions: ComprehensionQuestion[];
}

interface DialogueReaderProps {
  dialogueData: DialogueData;
  onNextDialogue: () => void;
  isLastDialogue: boolean;
}

export default function DialogueReader({ dialogueData, onNextDialogue, isLastDialogue }: DialogueReaderProps) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  const handleSelectOption = (qIndex: number, optIndex: number) => {
    if (showResults) return;
    setAnswers({ ...answers, [qIndex]: optIndex });
  };

  const allAnswered = dialogueData.comprehension_questions.every((_, i) => answers[i] !== undefined);
  
  const allCorrect = allAnswered && dialogueData.comprehension_questions.every((q, i) => answers[i] === q.correct_answer_index);

  const handleSubmit = () => {
    if (allAnswered) {
      setShowResults(true);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-8">
      {/* Dialogue Section */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 shadow-lg backdrop-blur-sm">
        <div className="mb-6 border-b border-slate-700 pb-4">
          <span className="text-emerald-500 font-semibold text-sm uppercase tracking-wider">{dialogueData.theme}</span>
          <p className="text-xl text-slate-300 italic font-light mt-2">"{dialogueData.scene_setting_english}"</p>
        </div>
        
        <div className="space-y-4">
          {dialogueData.dialogue.map((line, idx) => (
            <div key={idx} className="flex flex-col">
              <span className="font-bold text-slate-400 text-sm mb-1">{line.speaker}</span>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <p className="text-lg text-slate-50 mb-2">{line.vietnamese_sentence}</p>
                <p className="text-sm text-slate-500 italic opacity-0 hover:opacity-100 transition-opacity">
                  Hover to reveal translation: {line.english_translation}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Questions Section */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 shadow-lg backdrop-blur-sm">
        <h3 className="text-2xl font-bold text-slate-50 mb-6">Comprehension Check</h3>
        <div className="space-y-8">
          {dialogueData.comprehension_questions.map((q, qIndex) => {
            const isCorrect = showResults && answers[qIndex] === q.correct_answer_index;
            const isWrong = showResults && answers[qIndex] !== q.correct_answer_index;
            return (
              <div key={qIndex} className="space-y-3">
                <p className="text-lg text-slate-200">{qIndex + 1}. {q.question}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {q.options.map((opt, optIndex) => {
                    const isSelected = answers[qIndex] === optIndex;
                    let btnClass = "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800";
                    if (isSelected && !showResults) btnClass = "bg-emerald-900/30 border-emerald-500 text-emerald-400";
                    if (showResults) {
                      if (optIndex === q.correct_answer_index) btnClass = "bg-emerald-500/20 border-emerald-500 text-emerald-400";
                      else if (isSelected && isWrong) btnClass = "bg-red-500/20 border-red-500 text-red-400";
                      else btnClass = "bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed";
                    }
                    
                    return (
                      <button
                        key={optIndex}
                        onClick={() => handleSelectOption(qIndex, optIndex)}
                        disabled={showResults}
                        className={`text-left px-4 py-3 rounded-xl border transition-all ${btnClass}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-700 flex justify-between items-center">
          {!showResults ? (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered}
              className={`py-3 px-6 rounded-xl font-medium transition-all ${
                allAnswered ? 'bg-emerald-500 text-slate-900 hover:bg-emerald-400 hover:scale-105' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              Check Answers
            </button>
          ) : (
            <div className="w-full flex justify-between items-center">
              <div className="flex items-center text-lg font-bold">
                {allCorrect ? (
                  <span className="text-emerald-400 flex items-center"><Check className="mr-2" /> Perfect Score!</span>
                ) : (
                  <span className="text-red-400 flex items-center"><X className="mr-2" /> You missed some. Review and try the next one.</span>
                )}
              </div>
              
              {!isLastDialogue ? (
                <button
                  onClick={() => {
                    setAnswers({});
                    setShowResults(false);
                    onNextDialogue();
                  }}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-3 px-6 rounded-xl flex items-center transition-all hover:scale-105"
                >
                  Next Dialogue <ArrowRight className="ml-2" size={20} />
                </button>
              ) : (
                <button
                  onClick={() => {
                    onNextDialogue();
                  }}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-3 px-6 rounded-xl flex items-center transition-all hover:scale-105"
                >
                  Finish Game <ArrowRight className="ml-2" size={20} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}