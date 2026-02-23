# Language Game Architecture: The "Deduction" Method

This document outlines the pipeline and architecture used to build a "Chants of Sennaar" / "Assimil" inspired language learning game. The core loop relies on the user deducing the meaning of unknown words from context.

This guide serves as a blueprint for replicating the process for other languages (e.g., Thai, Japanese, Mandarin).

## Phase 1: The Data Pipeline & The "Multi-Word" Problem

The foundation of the game is teaching the **2,000 most frequent conversational words**. However, calculating this frequency correctly is the hardest part.

### 1. Data Source: Why OPUS OpenSubtitles?
We did not use Wikipedia or formal literature corpora. We specifically downloaded the raw monolingual text corpus from **OPUS OpenSubtitles**. 
* **Reason:** Movies and TV shows contain colloquial, everyday dialogue (e.g., "I'm dead tired", "Don't trust him"). This ensures the 2,000 words we extract are actually useful for daily communication, heavy on pronouns, common verbs, and slang, rather than formal or academic vocabulary.

### 2. The Tokenization Challenge (Compound Words)
If you simply split a text file by spaces to calculate word frequency, you will fail in many languages. 
* **The Vietnamese Example:** The concept for "thank you" is `cảm ơn`. "Motorbike" is `xe máy`. "Police" is `cảnh sát`. If you just split by space, you get the frequencies for "cảm", "ơn", "xe", "máy" separately. These individual syllables often have entirely different meanings or no meaning at all on their own. The frequency list becomes garbage.
* **The Goal:** We need the frequency of the *concept*, not the typographic word. 

### 3. The NLP Solution (`pyvi` / `underthesea`)
Instead of a simple split, we passed the entire 5-million-line OpenSubtitles corpus through a dedicated NLP Tokenizer (in our case, `pyvi.ViTokenizer` for Vietnamese). 
* These libraries are trained to recognize multi-syllable compound words (từ ghép) and join them with underscores.
* "xin lỗi, nhà vệ sinh ở đâu" becomes `["xin_lỗi", ",", "nhà_vệ_sinh", "ở", "đâu"]`.
* **Result:** We could accurately tally the frequency of `nhà_vệ_sinh` (toilet) as a single, learnable vocabulary item, resulting in a highly accurate `top_2000_words.json` sorted by conversational frequency. When adapting this to other languages (like Chinese or Japanese, which don't use spaces at all), a language-specific tokenizer (like `jieba` for Chinese or `MeCab` for Japanese) is absolutely mandatory here.

## Phase 2: The Curriculum Generator (LLM Pipeline)

Generating 800+ stages manually is impossible. We wrote a Python script (`generate_curriculum.py`) to batch the 2,000 words and prompt an LLM (Gemini 3.0 Flash) to generate the levels.

### Key LLM Constraints for Success:
Getting an LLM to generate good learning stages requires extremely strict prompt engineering.

1.  **The "Known Vocabulary" Rule:** The LLM must be given the specific list of `TARGET NEW WORDS` and a growing set of `PREVIOUSLY LEARNED WORDS`. It is instructed to write a sentence using *only* those words. This ensures the puzzle is fair and stacks knowledge progressively.
2.  **The "Abstract Glue" Problem:** The top 50 words in any language are usually abstract grammar glue (I, you, is, not, and, of). If you force the LLM to write a sentence using only these early words, it will output bizarre, philosophical sentences like "You and I, we are one."
3.  **The "Anchor Noun" Fix:** To fix this, we gave the player the top ~90 most common words "for free" as a starting base. Furthermore, the prompt explicitly instructs the LLM: *"To prevent weird abstract sentences, YOU MUST USE 1 or 2 UNLISTED, COMMON NOUNS OR VERBS (e.g., 'coffee', 'money', 'eat') to anchor the sentence in a realistic everyday scenario."*
4.  **Synonym Arrays:** The LLM must output a dictionary mapping the target word to an *array* of English synonyms (e.g., `["toilet", "bathroom", "restroom"]`). This prevents the player from getting frustrated if they guess the right concept but the wrong exact English synonym.

## Phase 3: The Frontend & Game Mechanics

Built with **Next.js** and **Tailwind CSS**.

1.  **State Management:** The game tracks `currentStageIndex` and `unlockedWords` (Set) in `localStorage`.
2.  **The UI Loop:**
    *   The `SentenceDecoder` component receives the Vietnamese sentence and the English `contextHint`.
    *   It iterates through the tokens.
    *   If a token is in the `unlockedWords` set, it renders as plain text.
    *   If a token is unknown, it renders as an interactive, highlighted button (the "glyph" to decode).
    *   Clicking the unknown word opens a modal asking the user to deduce its meaning based on the context and the surrounding known words.
3.  **Anti-Frustration Mechanics:** If the user guesses incorrectly 3 times on the same word, a "Reveal Answer" button fades in to prevent them from being permanently stuck on a stage.

## Summary of the Workflow for a New Language
1.  Download the language's `OpenSubtitles` raw `.txt` corpus.
2.  Write a Python script using a language-specific NLP Tokenizer to extract the top 2,000 concepts/compounds.
3.  Run the `generate_curriculum.py` LLM script, feeding it the sorted frequency list to generate `stages.json` in batches of 3-5 words. Ensure the prompt is localized for the target language's grammar nuances.
4.  Load `stages.json` into the Next.js frontend.