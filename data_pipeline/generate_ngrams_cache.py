import re
import json
import argparse
from collections import Counter
from pathlib import Path

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

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=str, required=True)
    parser.add_argument("--output", type=str, required=True)
    parser.add_argument("--top", type=int, default=2000)
    args = parser.parse_args()

    phrase_counts = Counter()
    with open(args.input, 'r', encoding='utf-8') as f:
        line_count = 0
        for line in f:
            line = line.strip().lower()
            if not line:
                continue
            cleaned = re.sub(r'[^\w\s]', '', line)
            words = cleaned.split()
            for n in range(2, 5):
                for i in range(len(words) - n + 1):
                    phrase = " ".join(words[i:i+n])
                    if is_valid_phrase(phrase):
                        phrase_counts[phrase] += 1
            line_count += 1
            if line_count % 500000 == 0:
                print(f"Processed {line_count} lines...", flush=True)

    most_common = phrase_counts.most_common(args.top)
    phrases = [p[0] for p in most_common]

    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(phrases, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(phrases)} top phrases to {args.output}")

if __name__ == "__main__":
    main()