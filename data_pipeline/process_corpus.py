import json
import re
import argparse
from collections import Counter
from pyvi import ViTokenizer
from pathlib import Path

# Common conversational Vietnamese stop words and punctuation to exclude.
# Depending on the strictness of the vocabulary, you can expand this list.
STOP_WORDS = {
    'à', 'ừ', 'nhỉ', 'nhá', 'nhé', 'ạ', 'hả', 'thế', 'vậy', 'này', 'kia',
    'đấy', 'ấy', 'nào', 'cơ', 'mà', 'thôi', 'đi', 'vâng', 'chứ'
}

def is_valid_word(word: str) -> bool:
    """Check if the word is valid (not purely punctuation, not a digit, not a stop word)."""
    # Remove any stray punctuation from the token first
    cleaned = re.sub(r'[^\w\s_]', '', word)
    
    if not cleaned:
        return False
        
    if cleaned.isdigit():
        return False
        
    if cleaned in STOP_WORDS:
        return False
        
    return True

def process_corpus(input_file: str, output_file: str, top_n: int = 2000):
    """
    Reads a raw text corpus, tokenizes Vietnamese words (keeping compound words 
    with underscores intact), calculates frequency, and exports to JSON.
    """
    input_path = Path(input_file)
    if not input_path.exists():
        print(f"Error: Input file {input_file} not found.")
        return

    word_freqs = Counter()
    total_lines = 0
    
    print(f"Reading and tokenizing {input_file}...")
    with open(input_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip().lower()
            if not line:
                continue
            
            # Use pyvi's ViTokenizer
            # Example: "xe máy" -> "xe_máy"
            tokenized_sentence = ViTokenizer.tokenize(line)
            tokens = tokenized_sentence.split()
            
            for token in tokens:
                if is_valid_word(token):
                    # Remove punctuation that might have attached to the word
                    cleaned_token = re.sub(r'[^\w_]', '', token)
                    if cleaned_token:
                        word_freqs[cleaned_token] += 1
            
            total_lines += 1
            if total_lines % 10000 == 0:
                print(f"Processed {total_lines} lines...")

    print(f"\nProcessing complete. Extracting top {top_n} words...")
    top_words = word_freqs.most_common(top_n)
    
    # Format for JSON output
    results = []
    for word, freq in top_words:
        results.append({
            "vietnamese_word": word,
            "english_translation": "[PENDING TRANSLATION]", # Placeholder for translation API integration
            "frequency": freq
        })
    
    # Save to JSON
    print(f"Saving to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully exported {len(results)} words to {output_file}.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process Vietnamese OPUS corpus for frequency analysis.")
    parser.add_argument("--input", type=str, required=True, help="Path to the raw Vietnamese text corpus (e.g., vi.txt)")
    parser.add_argument("--output", type=str, default="top_2000_vietnamese.json", help="Path to the output JSON file")
    parser.add_argument("--top", type=int, default=2000, help="Number of top words to extract")
    
    args = parser.parse_args()
    process_corpus(args.input, args.output, args.top)
