import json
import os
import time
import argparse
import google.generativeai as genai
from pathlib import Path

from google.generativeai.types import HarmCategory, HarmBlockThreshold

def setup_gemini(api_key: str):
    genai.configure(api_key=api_key)
    # Using gemini-3.0-flash-preview for maximum reasoning and natural language flow
    model = genai.GenerativeModel('gemini-3-flash-preview', generation_config={
        "response_mime_type": "application/json",
        "temperature": 0.2,
    }, safety_settings={
        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
    })
    return model

def get_batch_size(stage_index: int) -> int:
    """
    Gradually increases the number of new words introduced per stage 
    as the player becomes more advanced.
    """
    if stage_index < 100:
        return 3  # Start with 3 words
    elif stage_index < 300:
        return 4  # Intermediate: 4 words
    else:
        return 5  # Advanced: 5 words

def generate_stage(model, target_words: list[str], learned_words: set[str]) -> dict | None:
    # Pass the allowed words to the prompt so the LLM knows its vocabulary bounds
    allowed_words_str = ", ".join(list(learned_words))
    
    prompt = f"""
    You are an expert Vietnamese language curriculum designer.
    Your task is to create a single language learning stage (a scenario) based on the deductive "Chants of Sennaar" method.
    
    TARGET NEW WORDS to introduce: {', '.join(target_words)}
    
    PREVIOUSLY LEARNED WORDS (You MAY use these freely):
    {allowed_words_str if learned_words else "(None. You must try to construct a micro-sentence or phrase using ONLY the target words.)"}
    
    CRITICAL CONSTRAINTS:
    1. Create ONE natural, highly colloquial, everyday Vietnamese sentence that logically includes ALL of the TARGET NEW WORDS.
    2. THE SENTENCE MUST SOUND LIKE REAL HUMAN SPEECH. DO NOT write abstract, poetic, or awkward sentences. It must be an everyday situation (ordering food, asking directions, chatting casually). If it sounds unnatural, it is a failure.
    3. STRICT VOCABULARY RULE: The sentence should primarily contain the TARGET NEW WORDS and the PREVIOUSLY LEARNED WORDS. 
       - HOWEVER, to prevent weird abstract sentences, YOU MUST USE 1 or 2 UNLISTED, COMMON NOUNS OR VERBS (e.g., 'cà_phê', 'ăn', 'đi', 'xe', 'tiền') to anchor the sentence in a realistic everyday scenario.
       - Any unlisted word you use MUST be added to your generated 'dictionary' mapping.
    4. The sentence should be easy to deduce from context. You may use standard punctuation (, . ? !).
    5. Provide a 'contextHint' in English: a 1-sentence situation describing what is happening to help the user guess the meaning (DO NOT translate the sentence directly).
    6. Provide a 'dictionary' mapping EVERY single Vietnamese word in your sentence to an array of 1-3 valid English translations/synonyms. Ensure compound words use underscores (e.g., "xe_máy").
    
    Output strictly as a JSON object matching this schema:
    {{
      "sentence": "vietnamese sentence here",
      "contextHint": "You are at a cafe and want to order...",
      "dictionary": {{
        "word1": ["translation1", "translation2"],
        "word2": ["translation1"]
      }}
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        stage_data = json.loads(response.text)
        return stage_data
    except Exception as e:
        print(f"Error generating stage for words {target_words}: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description="Generate Vietnamese learning curriculum using Gemini API.")
    parser.add_argument("--api-key", type=str, required=True, help="Your Google Gemini API Key")
    parser.add_argument("--input", type=str, default="top_2000_vietnamese.json", help="Path to top 2000 words JSON")
    parser.add_argument("--output", type=str, default="../web/src/data/stages_generated.json", help="Path to save generated stages")
    parser.add_argument("--limit", type=int, default=800, help="Max number of stages to generate")
    
    args = parser.parse_args()
    
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Could not find {args.input}")
        return

    with open(input_path, 'r', encoding='utf-8') as f:
        vocab_data = json.load(f)
    
    # The JSON from Phase 1 is already sorted by frequency descending.
    all_words = [item['vietnamese_word'] for item in vocab_data]
    
    # User-defined words from the top 100 to actually teach (not assume known)
    words_to_teach_from_top_100 = {'hắn', 'mày', 'đừng', 'tớ', 'hãy', 'chết', 'tao'}
    
    # The first 100 words (minus the ones to teach) are assumed known.
    top_100 = all_words[:100]
    initial_known_words = [w for w in top_100 if w not in words_to_teach_from_top_100]
    learned_words = set(initial_known_words)
    
    # The words we actually need to generate stages for: 
    # The excluded words from the top 100, followed by word 101+
    target_queue = [w for w in top_100 if w in words_to_teach_from_top_100] + all_words[100:]
    
    model = setup_gemini(args.api_key)
    
    output_path = Path(args.output)
    stages = []
    if output_path.exists():
        try:
            with open(output_path, 'r', encoding='utf-8') as f:
                stages = json.load(f)
            print(f"Found existing file. Resuming from {len(stages)} stages...")
            for stage in stages:
                for word in stage.get('dictionary', {}).keys():
                    learned_words.add(word)
        except Exception as e:
            print(f"Could not load existing stages, starting fresh: {e}")
            stages = []
            
    stage_count = len(stages)
    
    # Fast-forward word_index based on the highest target word already learned
    max_target_idx = -1
    for i, w in enumerate(target_queue):
        if w in learned_words:
            max_target_idx = i
            
    word_index = max_target_idx + 1 if max_target_idx >= 0 else 0
    
    print(f"Starting curriculum generation for up to {args.limit} stages...")
    print(f"Pre-loaded {len(initial_known_words)} words as known from the top 100.")
    print(f"Resuming at target word index {word_index} out of {len(target_queue)}.")
    
    while word_index < len(target_queue) and stage_count < args.limit:
        batch_size = get_batch_size(stage_count)
        target_words = target_queue[word_index : word_index + batch_size]
        
        if not target_words:
            break # Reached the end
            
        print(f"Generating Stage {stage_count + 1} (Batch size: {len(target_words)}, Target words: {target_words})...")
        
        retries = 0
        success = False
        while retries < 3 and not success:
            stage_data = generate_stage(model, target_words, learned_words)
            
            if stage_data:
                stages.append(stage_data)
                
                # Add all words actually used in the generated sentence to the learned pool.
                for word in stage_data.get('dictionary', {}).keys():
                    learned_words.add(word)
                
                stage_count += 1
                word_index += len(target_words)
                
                # Save progress incrementally in case of crash/rate limits
                with open(args.output, 'w', encoding='utf-8') as f:
                    json.dump(stages, f, ensure_ascii=False, indent=2)
                    
                # Respect API rate limits (adjust based on your tier)
                time.sleep(2)
                success = True
            else:
                retries += 1
                print(f"Failed to generate stage. Retrying in 5 seconds... ({retries}/3)")
                time.sleep(5)
                
        if not success:
            print(f"Skipping batch {target_words} after 3 failed attempts.")
            word_index += len(target_words)

    print(f"\nSuccess! Generated {len(stages)} stages.")
    print(f"Curriculum saved to: {args.output}")
    print("To use this in the game, rename it to 'stages.json' and place it in 'web/src/data/'.")

if __name__ == "__main__":
    main()
