import os
import re
import json
import argparse
from collections import Counter
from pathlib import Path
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

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

def extract_ngrams(input_file, top_n=3000):
    print(f"Reading corpus {input_file} to extract n-grams...")
    phrase_counts = Counter()
    
    with open(input_file, 'r', encoding='utf-8') as f:
        line_count = 0
        for line in f:
            line = line.strip().lower()
            if not line:
                continue
            
            cleaned = re.sub(r'[^\w\s]', '', line)
            words = cleaned.split()
            
            for n in range(2, 6):
                for i in range(len(words) - n + 1):
                    phrase = " ".join(words[i:i+n])
                    if is_valid_phrase(phrase):
                        phrase_counts[phrase] += 1
                        
            line_count += 1
            if line_count % 500000 == 0:
                print(f"Processed {line_count} lines...")
                        
    print(f"Extracted {len(phrase_counts)} unique raw phrases.")
    most_common = phrase_counts.most_common(top_n)
    return [p[0] for p in most_common], most_common

def analyze_categories_with_llm(api_key, top_phrases_sample):
    print("Sending top phrases to Gemini to propose functional categories...")
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

    prompt = f"""
    You are an expert in Vietnamese linguistics and pedagogy.
    I am providing you with the top 300 most frequently spoken n-grams (phrases) extracted from a massive corpus of conversational Vietnamese (movie subtitles).
    
    Analyze these phrases and group them into 8 to 12 distinct "functional categories" based on how they are actually used in daily life. 
    Do not just stick to standard grammatical categories (like "Verbs" or "Nouns"); look at functional intent (e.g., "Exclamations", "Time/Tense Markers", "Comparisons & Degrees", "Questions/Inquiries", "Politeness/Pronouns").
    
    Return a JSON list of categories. For each category, provide:
    - "name": A clear, short name in English (e.g., "Questions & Inquiries")
    - "description": A short explanation of what this category covers.
    - "examples": 3-4 exact Vietnamese phrases from the provided list that fit this category.
    
    Phrases to analyze:
    {json.dumps(top_phrases_sample, ensure_ascii=False)}
    
    Output Format (JSON Array):
    [
      {{
         "name": "Category Name",
         "description": "...",
         "examples": ["phrase 1", "phrase 2"]
      }}
    ]
    """
    
    response = model.generate_content(prompt)
    try:
        categories = json.loads(response.text)
        return categories
    except Exception as e:
        print("Error parsing LLM response:", e)
        print("Raw response:", response.text)
        return None

def main():
    parser = argparse.ArgumentParser(description="Extract n-grams and propose categories.")
    parser.add_argument("--input", type=str, required=True, help="Path to raw corpus (vi.txt)")
    parser.add_argument("--api-key", type=str, help="Gemini API Key")
    args = parser.parse_args()
    
    api_key = args.api_key or os.environ.get("GEMINI_API_KEY")

    top_phrases, raw_counts = extract_ngrams(args.input, 3000)
    
    print("\n--- Top 20 N-grams Found ---")
    for phrase, count in raw_counts[:20]:
        print(f"{count}: {phrase}")

    if not api_key:
        print("\nNotice: GEMINI_API_KEY not set. Skipping the LLM categorization step. Please set the key or pass it via --api-key.")
        return
    
    # Send the top 300 phrases to the LLM to get a representative categorization
    categories = analyze_categories_with_llm(api_key, top_phrases[:300])
    
    if categories:
        print("\n=============================================")
        print("PROPOSED DYNAMIC CATEGORIES BASED ON FREQUENCY")
        print("=============================================\n")
        print(json.dumps(categories, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()