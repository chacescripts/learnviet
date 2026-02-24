"use client";

import { useState, useEffect } from "react";
import SentenceDecoder from "@/components/SentenceDecoder";
import DialogueReader from "@/components/DialogueReader";

import stagesData from "@/data/stages_generated.json"; 
import dialoguesData from "@/data/dialogues_generated.json";

type Stage = {
  sentence: string;
  contextHint: string;
  dictionary: Record<string, string | string[]>;
};

const STAGES = stagesData as unknown as Stage[];
const DIALOGUES = dialoguesData as any[];

const saveProgress = (stageIndex: number, dialogueIndex: number, words: Set<string>, phase: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("vncn_stage_index", stageIndex.toString());
    localStorage.setItem("vncn_dialogue_index", dialogueIndex.toString());
    localStorage.setItem("vncn_phase", phase);
    localStorage.setItem("vncn_unlocked_words", JSON.stringify(Array.from(words)));
  }
};

const loadProgress = () => {
  if (typeof window === "undefined") return { 
    stageIndex: 0, 
    dialogueIndex: 0, 
    savedPhase: "stages",
    hasSavedProgress: false,
    words: new Set(["tôi", "không", "là", "anh", "có", "của", "đã", "sẽ", "đó", "gì", "được", "và", "ta", "một", "phải", "cô", "rồi", "người", "cho", "đây", "làm", "em", "ở", "nó", "biết", "cậu", "ông", "với", "con", "nói", "chúng_ta", "lại", "để", "sao", "ra", "cái", "đang", "muốn", "trong", "nhưng", "những", "có_thể", "đến", "khi", "đâu", "về", "họ", "chỉ", "còn", "thì", "như", "cũng", "vào", "các", "thấy", "ai", "chuyện", "nghĩ", "nếu", "rất", "mình", "nữa", "bị", "cần", "chúng_tôi", "tới", "cả", "thật", "chưa", "lên", "thứ", "đúng", "chúng", "mọi", "hơn", "điều", "nghe", "bạn", "vì", "từ", "mẹ", "nên", "tìm", "tốt", "nhà", "nhiều", "việc", "không_thể", "trước", "giờ", "quá", "trên", "tên"]) 
  };
  
  const savedStage = localStorage.getItem("vncn_stage_index");
  const savedDialogue = localStorage.getItem("vncn_dialogue_index");
  const savedPhase = localStorage.getItem("vncn_phase");
  const savedWords = localStorage.getItem("vncn_unlocked_words");
  
  return {
    stageIndex: savedStage ? parseInt(savedStage, 10) : 0,
    dialogueIndex: savedDialogue ? parseInt(savedDialogue, 10) : 0,
    savedPhase: (savedPhase || "stages") as string,
    hasSavedProgress: !!savedStage || !!savedDialogue || !!savedWords,
    words: savedWords ? new Set<string>(JSON.parse(savedWords)) : new Set(["tôi", "không", "là", "anh", "có", "của", "đã", "sẽ", "đó", "gì", "được", "và", "ta", "một", "phải", "cô", "rồi", "người", "cho", "đây", "làm", "em", "ở", "nó", "biết", "cậu", "ông", "với", "con", "nói", "chúng_ta", "lại", "để", "sao", "ra", "cái", "đang", "muốn", "trong", "nhưng", "những", "có_thể", "đến", "khi", "đâu", "về", "họ", "chỉ", "còn", "thì", "như", "cũng", "vào", "các", "thấy", "ai", "chuyện", "nghĩ", "nếu", "rất", "mình", "nữa", "bị", "cần", "chúng_tôi", "tới", "cả", "thật", "chưa", "lên", "thứ", "đúng", "chúng", "mọi", "hơn", "điều", "nghe", "bạn", "vì", "từ", "mẹ", "nên", "tìm", "tốt", "nhà", "nhiều", "việc", "không_thể", "trước", "giờ", "quá", "trên", "tên"])
  };
};

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [phase, setPhase] = useState("landing"); // "landing" | "stages" | "dialogues" | "completed"
  const [savedPhase, setSavedPhase] = useState("stages");
  const [hasProgress, setHasProgress] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [unlockedWords, setUnlockedWords] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  // Load progress on initial client-side mount
  useEffect(() => {
    const { stageIndex, dialogueIndex, savedPhase, hasSavedProgress, words } = loadProgress();
    setCurrentStageIndex(stageIndex);
    setCurrentDialogueIndex(dialogueIndex);
    setSavedPhase(savedPhase);
    setHasProgress(hasSavedProgress);
    setUnlockedWords(words);
    setIsLoaded(true);
  }, []);

  const handleUnlock = (word: string) => {
    setUnlockedWords(prev => {
      const next = new Set(prev);
      next.add(word);
      saveProgress(currentStageIndex, currentDialogueIndex, next, phase);
      return next;
    });
  };

  const handleUnlockManyAndSkip = (wordsToUnlock: string[]) => {
    setUnlockedWords(prev => {
      const next = new Set(prev);
      wordsToUnlock.forEach(w => next.add(w));
      
      if (currentStageIndex < STAGES.length - 1) {
        const nextIndex = currentStageIndex + 1;
        saveProgress(nextIndex, currentDialogueIndex, next, phase);
        setCurrentStageIndex(nextIndex);
      } else {
        saveProgress(currentStageIndex, currentDialogueIndex, next, "dialogues");
        setPhase("dialogues");
      }
      
      return next;
    });
  };

  const handleNextStage = () => {
    if (currentStageIndex < STAGES.length - 1) {
      const nextIndex = currentStageIndex + 1;
      setCurrentStageIndex(nextIndex);
      saveProgress(nextIndex, currentDialogueIndex, unlockedWords, phase);
    } else {
      // Transition to reading comprehension phase
      setPhase("dialogues");
      saveProgress(currentStageIndex, currentDialogueIndex, unlockedWords, "dialogues");
    }
  };

  const handleNextDialogue = () => {
    if (currentDialogueIndex < DIALOGUES.length - 1) {
      const nextIndex = currentDialogueIndex + 1;
      setCurrentDialogueIndex(nextIndex);
      saveProgress(currentStageIndex, nextIndex, unlockedWords, phase);
    } else {
      setPhase("completed");
      saveProgress(currentStageIndex, currentDialogueIndex, unlockedWords, "completed");
    }
  };

  // Prevent hydration mismatch
  if (!isLoaded) return <main className="min-h-screen bg-slate-900" />;

  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center py-6 px-4 md:px-12 selection:bg-slate-700 selection:text-emerald-400">
      
      {phase === "landing" && (
        <div className="w-full max-w-2xl flex-grow flex flex-col items-center justify-center text-center space-y-8 py-10">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-50 leading-tight">
            Learn <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Vietnamese</span> Contextually
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Crafted by <span className="text-emerald-400 font-semibold">Chace Teo</span>
          </p>
          <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl text-left space-y-4 shadow-lg backdrop-blur-sm">
            <h3 className="text-emerald-400 font-semibold text-lg border-b border-slate-700 pb-2">Methodology</h3>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              Instead of scraping text from Wikipedia which reflects stiff, literature-type Vietnamese, we scraped millions of subtitles from the OPUS OpenSubtitles library. This ensures the 2,000 words you learn here reflect highly practical, spoken, everyday Vietnamese phrases.
            </p>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              Through context deduction (inspired by games like 'Chants of Sennaar' and the 'Assimil' method), you will naturally absorb vocabulary and transition into full reading comprehension.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-8">
            <button 
              onClick={() => {
                // If starting fresh, reset local storage
                if (hasProgress && !window.confirm("Start fresh? This will overwrite your current progress.")) return;
                saveProgress(0, 0, new Set(["tôi", "không", "là", "anh", "có", "của", "đã", "sẽ", "đó", "gì", "được", "và", "ta", "một", "phải", "cô", "rồi", "người", "cho", "đây", "làm", "em", "ở", "nó", "biết", "cậu", "ông", "với", "con", "nói", "chúng_ta", "lại", "để", "sao", "ra", "cái", "đang", "muốn", "trong", "nhưng", "những", "có_thể", "đến", "khi", "đâu", "về", "họ", "chỉ", "còn", "thì", "như", "cũng", "vào", "các", "thấy", "ai", "chuyện", "nghĩ", "nếu", "rất", "mình", "nữa", "bị", "cần", "chúng_tôi", "tới", "cả", "thật", "chưa", "lên", "thứ", "đúng", "chúng", "mọi", "hơn", "điều", "nghe", "bạn", "vì", "từ", "mẹ", "nên", "tìm", "tốt", "nhà", "nhiều", "việc", "không_thể", "trước", "giờ", "quá", "trên", "tên"]), "stages");
                setCurrentStageIndex(0);
                setCurrentDialogueIndex(0);
                setUnlockedWords(new Set(["tôi", "không", "là", "anh", "có", "của", "đã", "sẽ", "đó", "gì", "được", "và", "ta", "một", "phải", "cô", "rồi", "người", "cho", "đây", "làm", "em", "ở", "nó", "biết", "cậu", "ông", "với", "con", "nói", "chúng_ta", "lại", "để", "sao", "ra", "cái", "đang", "muốn", "trong", "nhưng", "những", "có_thể", "đến", "khi", "đâu", "về", "họ", "chỉ", "còn", "thì", "như", "cũng", "vào", "các", "thấy", "ai", "chuyện", "nghĩ", "nếu", "rất", "mình", "nữa", "bị", "cần", "chúng_tôi", "tới", "cả", "thật", "chưa", "lên", "thứ", "đúng", "chúng", "mọi", "hơn", "điều", "nghe", "bạn", "vì", "từ", "mẹ", "nên", "tìm", "tốt", "nhà", "nhiều", "việc", "không_thể", "trước", "giờ", "quá", "trên", "tên"]));
                setPhase("stages");
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-4 px-8 rounded-xl transition-all hover:scale-105 shadow-lg shadow-emerald-500/20"
            >
              Start Game
            </button>
            
            {hasProgress && (
              <button 
                onClick={() => setPhase(savedPhase)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-50 font-bold py-4 px-8 rounded-xl transition-all hover:scale-105 border border-slate-700 shadow-xl"
              >
                Resume Progress
              </button>
            )}
          </div>
          
          <div className="flex flex-col gap-3 pt-6 w-full items-center">
             <div className="text-slate-500 text-sm uppercase tracking-wider font-semibold">Skip to Phase</div>
             <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => {
                    const stageNum = window.prompt(`Enter stage number to skip to (1-${STAGES.length}):`, "1");
                    if (stageNum !== null) {
                      const idx = parseInt(stageNum, 10) - 1;
                      if (!isNaN(idx) && idx >= 0 && idx < STAGES.length) {
                        setCurrentStageIndex(idx);
                        setPhase("stages");
                      } else {
                        alert("Invalid stage number.");
                      }
                    }
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm py-2 px-5 rounded-lg transition-all border border-slate-700 hover:text-emerald-400"
                >
                  Decoding Stages
                </button>
                <button 
                  onClick={() => setPhase("dialogues")}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm py-2 px-5 rounded-lg transition-all border border-slate-700 hover:text-emerald-400"
                >
                  Reading Dialogues
                </button>
             </div>
          </div>
        </div>
      )}

      {phase === "stages" && (
        <div className="w-full max-w-4xl flex flex-col items-center">
          <header className="mb-6 w-full text-center space-y-3">
            <div className="flex items-center justify-between mb-2 text-slate-500 text-xs font-medium uppercase tracking-widest px-2">
              <span>Stage {currentStageIndex + 1} / {STAGES.length}</span>
              <span>Total Vocab: {unlockedWords.size} / 2000</span>
            </div>
            
            <div className="w-full bg-slate-800 rounded-full h-1 mb-4 overflow-hidden">
               <div 
                 className="bg-emerald-500 h-1.5 transition-all duration-500 ease-out" 
                 style={{ width: `${((currentStageIndex + 1) / STAGES.length) * 100}%` }}
               ></div>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-50">
              Decode <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Vietnamese</span>
            </h1>
            <p className="text-slate-400 max-w-lg mx-auto text-lg leading-relaxed">
              Read the context, observe the unknown words, and deduce their English meaning.
            </p>
          </header>

          <SentenceDecoder 
            key={`stage-${currentStageIndex}`} 
            sentence={STAGES[currentStageIndex]?.sentence || ""}
            contextHint={STAGES[currentStageIndex]?.contextHint || ""}
            dictionary={STAGES[currentStageIndex]?.dictionary || {}} 
            unlockedWords={unlockedWords}
            onUnlock={handleUnlock}
            onUnlockMany={handleUnlockManyAndSkip}
            onNextStage={handleNextStage}
            isLastStage={currentStageIndex === STAGES.length - 1}
          />
          
          <div className="mt-6 w-full max-w-3xl bg-slate-800/30 border border-slate-800 rounded-xl p-4">
            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3 flex justify-between items-center">
              <span>Your Vocabulary Database</span>
              <span className="bg-slate-800 text-slate-300 py-1 px-3 rounded-full">{unlockedWords.size} words</span>
            </h3>
            <input 
              type="text" 
              placeholder="Search vocabulary..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {searchTerm.trim() !== "" && (
              <div className="flex flex-wrap gap-2 mt-4 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                {Array.from(unlockedWords)
                  .filter(word => word.replace(/_/g, " ").includes(searchTerm.toLowerCase()))
                  .map(word => {
                  const dictEntry = STAGES.find(s => s.dictionary && s.dictionary[word])?.dictionary[word];
                  const translation = Array.isArray(dictEntry) ? dictEntry[0] : (dictEntry || "known");
                  return (
                    <div key={word} className="bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-all hover:bg-slate-700">
                      <span className="font-medium text-slate-100">{word.replace(/_/g, " ")}</span>
                      <span className="text-slate-500 text-xs">|</span>
                      <span className="text-emerald-400/80">{translation}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {phase === "dialogues" && (
        <div className="w-full max-w-4xl flex flex-col items-center">
          <header className="mb-12 w-full text-center space-y-4">
            <div className="flex items-center justify-between mb-4 text-slate-500 text-sm font-medium uppercase tracking-widest px-4">
              <span>Comprehension Dialogue {currentDialogueIndex + 1} / {DIALOGUES.length}</span>
              <span className="text-emerald-500 font-bold">Vocabulary Mastered</span>
            </div>
            
            <div className="w-full bg-slate-800 rounded-full h-1.5 mb-8 overflow-hidden">
               <div 
                 className="bg-emerald-500 h-1.5 transition-all duration-500 ease-out" 
                 style={{ width: `${((currentDialogueIndex + 1) / DIALOGUES.length) * 100}%` }}
               ></div>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-50">
              Reading <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Comprehension</span>
            </h1>
            <p className="text-slate-400 max-w-lg mx-auto text-lg leading-relaxed">
              Read the scenario using the 2,000 words you've learned. Test your understanding below.
            </p>
          </header>

          {DIALOGUES[currentDialogueIndex] ? (
            <DialogueReader
              key={`dialogue-${currentDialogueIndex}`}
              dialogueData={DIALOGUES[currentDialogueIndex]}
              onNextDialogue={handleNextDialogue}
              isLastDialogue={currentDialogueIndex === DIALOGUES.length - 1}
            />
          ) : (
             <div className="text-slate-400">Loading dialogue data...</div>
          )}
        </div>
      )}

      {phase === "completed" && (
        <div className="w-full max-w-4xl flex flex-col items-center justify-center py-20">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 mb-8">
            Congratulations!
          </h1>
          <p className="text-slate-300 text-xl text-center max-w-2xl leading-relaxed mb-12">
            You have successfully mastered the top 2,000 most common conversational Vietnamese words and completed all reading comprehension scenarios. You are now equipped to navigate most everyday situations and conversations in Vietnam!
          </p>
          <button 
            onClick={() => {
              // Reset game
              saveProgress(0, 0, new Set(["tôi", "không", "là", "anh", "có", "của", "đã", "sẽ", "đó", "gì", "được", "và", "ta", "một", "phải", "cô", "rồi", "người", "cho", "đây", "làm", "em", "ở", "nó", "biết", "cậu", "ông", "với", "con", "nói", "chúng_ta", "lại", "để", "sao", "ra", "cái", "đang", "muốn", "trong", "nhưng", "những", "có_thể", "đến", "khi", "đâu", "về", "họ", "chỉ", "còn", "thì", "như", "cũng", "vào", "các", "thấy", "ai", "chuyện", "nghĩ", "nếu", "rất", "mình", "nữa", "bị", "cần", "chúng_tôi", "tới", "cả", "thật", "chưa", "lên", "thứ", "đúng", "chúng", "mọi", "hơn", "điều", "nghe", "bạn", "vì", "từ", "mẹ", "nên", "tìm", "tốt", "nhà", "nhiều", "việc", "không_thể", "trước", "giờ", "quá", "trên", "tên"]), "stages");
              window.location.reload();
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-50 font-bold py-4 px-8 rounded-xl transition-all hover:scale-105 border border-slate-700 shadow-xl"
          >
            Play Again
          </button>
        </div>
      )}
    </main>
  );
}
