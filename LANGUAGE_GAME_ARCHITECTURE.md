# Language Game Architecture: The "Deduction" Method

This document outlines the complete pipeline and architecture used to build a "Chants of Sennaar" / "Assimil" inspired language learning game. The core loop relies on the user deducing the meaning of unknown words from context, gradually building up to full reading comprehension.

This guide serves as a blueprint for replicating the exact process and architecture for any other language (e.g., Thai, Japanese, Spanish, Mandarin).

## Phase 1: The Data Pipeline & The "Multi-Word" Problem

The foundation of the game is teaching the **top 2,000 most frequent conversational words**. Calculating this frequency correctly is the hardest and most critical part.

### 1. Data Source: Why OPUS OpenSubtitles?
Do not use Wikipedia or formal literature corpora. We specifically downloaded the raw monolingual text corpus from **OPUS OpenSubtitles** (millions of lines of subtitle dialogue).
* **Reason:** Movies and TV shows contain colloquial, everyday dialogue (e.g., "I'm dead tired", "Don't trust him"). This ensures the 2,000 words extracted are actually useful for daily communication, heavily featuring pronouns, common verbs, and slang, rather than stiff academic vocabulary.

### 2. The Tokenization Challenge (Compound Words)
If you simply split a text file by spaces to calculate word frequency, you will fail in many languages.
* **The Example (Vietnamese):** The concept for "thank you" is `cảm ơn`. "Motorbike" is `xe máy`. If you split by space, you get the frequencies for "cảm", "ơn", "xe", "máy" separately. These individual syllables often have entirely different meanings or no meaning at all on their own.
* **The Goal:** We need the frequency of the *concept* (the compound word), not the typographic spacing.

### 3. The NLP Solution
Instead of a simple split, pass the entire OpenSubtitles corpus through a dedicated NLP Tokenizer for your target language (e.g., `pyvi` or `underthesea` for Vietnamese, `jieba` for Chinese, `MeCab` for Japanese, `spaCy` for European languages).
* These libraries recognize multi-syllable compound words and join them (e.g., with underscores).
* "xin lỗi, nhà vệ sinh ở đâu" becomes `["xin_lỗi", ",", "nhà_vệ_sinh", "ở", "đâu"]`.
* **Result:** You can accurately tally the frequency of `nhà_vệ_sinh` (toilet) as a single vocabulary item, generating a highly accurate `top_2000_words.json`.

---

## Phase 2: The Curriculum Generator (Decoding Stages)

Generating 800+ learning stages manually is impossible. We wrote a Python script (`generate_curriculum.py`) to batch the 2,000 words and prompt an LLM (e.g., Gemini 3.0 Flash) to generate the levels.

### Key LLM Constraints for Success:
1.  **The "Known Vocabulary" Rule:** The LLM is given the `TARGET NEW WORDS` (3-5 words) and a growing set of `PREVIOUSLY LEARNED WORDS`. It must write a sentence using *only* those words. This ensures the puzzle stacks knowledge progressively without introducing unfair, untaught vocabulary.
2.  **The "Abstract Glue" Problem:** The top 100 words in any language are usually abstract grammar "glue" (I, you, is, not, and). If forced to write a sentence using only these early words, the LLM will output bizarre, philosophical sentences like "You and I, we are one."
3.  **The "Anchor Noun" Fix:** Give the player the top ~90 most common words "for free" as a starting base. Explicitly instruct the LLM: *"To prevent abstract sentences, YOU MUST USE 1 or 2 UNLISTED, COMMON NOUNS OR VERBS (e.g., 'coffee', 'money', 'eat') to anchor the sentence in a realistic everyday scenario."*
4.  **Synonym Arrays:** The LLM must output a dictionary mapping the target word to an *array* of English synonyms (e.g., `["toilet", "bathroom", "restroom"]`). This prevents player frustration if they guess the correct concept but use a different synonym.
5.  **Pacing:** Start by introducing 2-3 words per stage, gradually scaling up to 4-5 new words as the user advances through the curriculum.
6.  **Resilience:** The script must have a retry/skip mechanism (e.g., max 3 retries) to bypass any words that trigger LLM safety/harassment filters (e.g., slang words) and auto-save incrementally so generation can be paused and resumed.

---

## Phase 3: The Reading Comprehension Generator (Endgame)

Once the 2,000 words are learned, the game shifts to a testing phase. We use a second script (`generate_dialogues.py`).

1.  **The Prompt:** The LLM is given the full list of 2,000 conversational words. It is instructed to write a 10-20 sentence dialogue between multiple people using *only* those words.
2.  **Themes:** Rotate the prompt through professional and real-life themes (Business Strategy, Finance, Travel, Workplace Conflict) to ensure variety.
3.  **Uniqueness Constraint:** To prevent the LLM from writing the same dialogue 100 times, pass the `scene_setting` of the last 10 generated dialogues back into the prompt with the instruction: *"Do not repeat these scenarios or character names."*
4.  **Output:** The LLM generates the scenario, the dialogue, and 3-4 multiple-choice reading comprehension questions in English.

---

## Phase 4: The Frontend Architecture (Next.js & Tailwind)

The UI is built as a highly responsive, mobile-first web app with no backend database required.

### 1. Dual-Phase Game Loop
*   **State Management:** The game tracks `currentStageIndex`, `currentDialogueIndex`, `phase` (stages vs. dialogues), and `unlockedWords` (Set) purely in browser `localStorage`.
*   **Phase 1 (Stages):** The `SentenceDecoder` component iterates through sentence tokens. Known words are plain text. Unknown words are interactive "???" buttons. Clicking opens a deduction modal.
*   **Phase 2 (Dialogues):** Once Phase 1 is complete, the app loads `DialogueReader`. The user reads long-form Vietnamese scenarios (rendered as plain text, with hover-to-translate fallbacks) and answers multiple-choice comprehension questions to proceed.

### 2. Critical UI/UX Features
*   **Anti-Frustration (3-Strike Rule):** If the user guesses a word incorrectly 3 times, a "Reveal Answer" button fades in.
*   **Skip Word:** A button allowing users to bypass typing the English word if they already mentally know the concept.
*   **Visual Feedback Loop:** When a word is guessed correctly, the success modal remains locked open for **1.5 seconds** before returning to the sentence. This delay is crucial for the user to mentally map the English definition to the Vietnamese visual.
*   **Searchable Database:** A real-time, text-filtered search box over the `unlockedWords` array to prevent UI lag when the vocabulary list reaches 2,000 items.
*   **Phase Skipping:** A developer/debug UI allowing users to jump to specific stage numbers or jump directly into the Dialogue phase.

## Summary of the Workflow for a New Language
1.  Download the target language's `OpenSubtitles` raw `.txt` corpus.
2.  Write a Python script using a language-specific NLP Tokenizer to extract the top 2,000 concepts/compounds.
3.  Run the `generate_curriculum.py` LLM script to build `stages.json` (Phase 1).
4.  Run the `generate_dialogues.py` LLM script to build `dialogues_generated.json` (Phase 2).
5.  Load both JSON arrays into the Next.js frontend, configure the top ~90 baseline words in the React state, and deploy.