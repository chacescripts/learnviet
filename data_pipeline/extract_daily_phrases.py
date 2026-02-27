import argparse
import json
import re
import time
from collections import Counter
from pathlib import Path
import os

try:
    import google.generativeai as genai
    from google.generativeai.types import HarmCategory, HarmBlockThreshold
except ImportError:
    print("Please install google-generativeai: pip install google-generativeai")
    exit(1)

# Stop words to avoid purely grammatical chunks
STOP_WORDS = {
    'của', 'là', 'những', 'các', 'một', 'và', 'thì', 'mà', 'này', 'đó', 'kia', 'ấy',
    'bằng', 'do', 'để', 'với', 'cho', 'từ', 'rằng', 'vì'
}

def is_valid_phrase(phrase):
    if not phrase or len(phrase.strip()) < 3:
        return False
    
    if re.search(r'[0-9]', phrase):
        return False
        
    if bool(re.search(r'[^\w\s]', phrase)):
        return False
        
    words = phrase.split()
    if len(words) < 2:
        return False
        
    if words[0] in STOP_WORDS or words[-1] in STOP_WORDS:
        return False

    return True

def extract_ngrams(input_file, top_n=1000, max_lines=None):
    print(f"Reading corpus {input_file} to extract phrases (n-grams)...")
    phrase_counts = Counter()
    
    with open(input_file, 'r', encoding='utf-8') as f:
        line_count = 0
        for line in f:
            if max_lines and line_count >= max_lines:
                break
                
            line = line.strip().lower()
            if not line:
                continue
            
            # Clean punctuation
            cleaned = re.sub(r'[^\w\s]', '', line)
            words = cleaned.split()
            
            # Extract 2-to-4 word phrases
            for n in range(2, 5):
                for i in range(len(words) - n + 1):
                    phrase = " ".join(words[i:i+n])
                    if is_valid_phrase(phrase):
                        phrase_counts[phrase] += 1
                        
            line_count += 1
            if line_count % 100000 == 0:
                print(f"Processed {line_count} lines...")
                        
    print(f"Extracted {len(phrase_counts)} unique raw phrases.")
    
    # Return top N by frequency
    most_common = phrase_counts.most_common(top_n)
    return [p[0] for p in most_common]

def setup_gemini(api_key):
    genai.configure(api_key=api_key)
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

def filter_with_llm(model, raw_phrases, batch_size=50):
    print(f"Filtering {len(raw_phrases)} phrases using Gemini...")
    valid_phrases = []
    
    # Process in batches
    total_batches = (len(raw_phrases) + batch_size - 1) // batch_size
    for i in range(0, len(raw_phrases), batch_size):
        batch = raw_phrases[i:i+batch_size]
        print(f"Processing batch {i//batch_size + 1}/{total_batches}...")
        
        prompt = f"""
        You are an expert in Northern Vietnamese dialect and everyday conversational language.
        I am providing you with a list of frequently occurring phrases extracted from a movie subtitle corpus.
        Many of these are junk (names, fragmented sentences, translation artifacts).
        
        Your task:
        1. Filter the list to ONLY keep phrases that are commonly used in daily life or workplace contexts in Northern Vietnam (Hanoi dialect).
        2. Discard any sentence fragments, movie-specific names, or unnatural subtitle translations.
        3. For each valid phrase, you MUST classify it into ONE of these 8 exact categories:
           - "Pronouns & Self-Reference"
           - "Negation & Refusal"
           - "Time & Tense Markers"
           - "Questions & Inquiries"
           - "Agreements & Apologies"
           - "Locations & Positioning"
           - "Quantifiers & Degrees"
           - "Core Verbs & Actions"
        4. Provide:
           - "vietnamese": The phrase itself (capitalized naturally).
           - "english": A natural English translation.
           - "category": ONE of the 8 exact categories listed above.
           - "context": A short 1-3 word note on context (e.g., "Office", "Casual greeting", "Restaurant").
           - "nuance": A brief explanation of its usage or tone.
        
        Phrases to evaluate:
        {json.dumps(batch, ensure_ascii=False)}
        
        Output strictly as a JSON list of objects:
        [
          {{
            "vietnamese": "Chào anh ạ",
            "english": "Hello (to older male)",
            "category": "Agreements & Apologies",
            "context": "Greeting",
            "nuance": "Polite, commonly used in workplace or daily life."
          }}
        ]
        If NO phrases in the batch are valid, return an empty array [].
        """
        
        retries = 3
        while retries > 0:
            try:
                response = model.generate_content(prompt)
                batch_results = json.loads(response.text)
                valid_phrases.extend(batch_results)
                break
            except Exception as e:
                print(f"Error calling Gemini: {e}. Retrying...")
                retries -= 1
                time.sleep(5)
                
        time.sleep(2) # rate limiting
        
    return valid_phrases

def main():
    parser = argparse.ArgumentParser(description="Extract and filter Northern Vietnamese phrases.")
    parser.add_argument("--input", type=str, required=True, help="Path to raw corpus (vi.txt)")
    parser.add_argument("--output", type=str, default="../web/src/data/daily_phrases.json", help="Output JSON path")
    parser.add_argument("--api-key", type=str, help="Gemini API Key (or set GEMINI_API_KEY env var)")
    parser.add_argument("--top", type=int, default=1000, help="Number of raw phrases to extract before filtering")
    parser.add_argument("--max-lines", type=int, default=None, help="Max lines to read from corpus (for testing)")
    
    args = parser.parse_args()
    api_key = args.api_key or os.environ.get("GEMINI_API_KEY")
    
    if not api_key:
        print("Error: Must provide --api-key argument or set GEMINI_API_KEY environment variable.")
        return

    top_raw = extract_ngrams(args.input, args.top, args.max_lines)
    
    model = setup_gemini(api_key)
    final_phrases = filter_with_llm(model, top_raw)
    
    out_path = Path(args.output)
    # Ensure directory exists
    out_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(final_phrases, f, ensure_ascii=False, indent=2)
        
    print(f"Success! Saved {len(final_phrases)} curated phrases to {args.output}")

if __name__ == "__main__":
    main()