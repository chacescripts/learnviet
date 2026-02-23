import json
import os
import time
import argparse
import google.generativeai as genai
from pathlib import Path
from google.generativeai.types import HarmCategory, HarmBlockThreshold

def setup_gemini(api_key: str):
    genai.configure(api_key=api_key)
    # Using gemini-3-flash-preview for high context window and reasoning
    model = genai.GenerativeModel('gemini-3-flash-preview', generation_config={
        "response_mime_type": "application/json",
        "temperature": 0.4, # Slightly higher for more varied scenarios
    }, safety_settings={
        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
    })
    return model

def generate_dialogue(model, allowed_words_str: str, dialogue_index: int, previous_scenes: list[str]) -> dict | None:
    # Alternate themes to keep the 100 dialogues varied
    themes = [
        "Business Strategy & Management",
        "Finance & Budgeting",
        "Workplace Conflict Resolution",
        "Daily Life & Relationships",
        "Negotiation & Sales",
        "Travel & Logistics",
        "Job Interview",
        "Healthcare & Clinic",
        "Real Estate & Housing",
        "Technology & Project Management"
    ]
    theme = themes[dialogue_index % len(themes)]
    
    previous_scenes_text = "\n".join([f"- {scene}" for scene in previous_scenes]) if previous_scenes else "None"

    prompt = f"""
    You are an expert Vietnamese language curriculum designer. 
    Your task is to create a reading comprehension test for advanced learners who have mastered the top 2000 most common Vietnamese words.
    
    SCENARIO THEME: {theme}
    
    CRITICAL VOCABULARY CONSTRAINT:
    You MUST write the Vietnamese dialogue using ONLY words from the provided "ALLOWED VOCABULARY" list below.
    - If there are foreign names in the list (like "rachel", "jack"), ignore them. Use typical Vietnamese names (e.g., Minh, Lan, Nam, Hoa, Tuan, Mai) varying them for each new scenario.
    - Do NOT use complex, formal, or specialized vocabulary that is not on this list. Keep it highly conversational but professional/relevant to the theme.
    - You may use standard punctuation.
    
    UNIQUENESS CONSTRAINT:
    Below are the scene settings of recently generated dialogues. You MUST create a completely NEW and DIFFERENT scenario, setting, and topic within the '{theme}' theme. Do not repeat the same situations or names if possible.
    PREVIOUSLY GENERATED SCENES:
    {previous_scenes_text}
    
    REQUIREMENTS:
    1. Write a dialogue between 2 or 3 people.
    2. The dialogue MUST be between 10 to 20 sentences in total length.
    3. Provide a 'scene_setting_english' explaining the context in English. Make it unique and distinct from previous scenes.
    4. Provide 3 to 4 'comprehension_questions' in English to test the user's understanding of the dialogue, with 4 multiple-choice options and the index of the correct answer (0-3).
    
    ALLOWED VOCABULARY:
    {allowed_words_str}
    
    Output STRICTLY as a JSON object matching this schema:
    {{
      "theme": "{theme}",
      "scene_setting_english": "A manager is discussing the quarterly budget...",
      "dialogue": [
        {{
          "speaker": "Minh",
          "vietnamese_sentence": "...",
          "english_translation": "..."
        }}
      ],
      "comprehension_questions": [
        {{
          "question": "What is Minh's primary concern?",
          "options": ["Budget cuts", "New hiring", "Office location", "Product quality"],
          "correct_answer_index": 0
        }}
      ]
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        dialogue_data = json.loads(response.text)
        return dialogue_data
    except Exception as e:
        print(f"Error generating dialogue: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description="Generate Vietnamese reading comprehension dialogues using Gemini API.")
    parser.add_argument("--api-key", type=str, required=True, help="Your Google Gemini API Key")
    parser.add_argument("--input", type=str, default="top_2000_vietnamese.json", help="Path to top 2000 words JSON")
    parser.add_argument("--output", type=str, default="../web/src/data/dialogues_generated.json", help="Path to save generated dialogues")
    parser.add_argument("--limit", type=int, default=100, help="Number of dialogues to generate")
    
    args = parser.parse_args()
    
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Could not find {args.input}")
        return

    with open(input_path, 'r', encoding='utf-8') as f:
        vocab_data = json.load(f)
    
    # Extract just the words to pass as a comma-separated string
    all_words = [item['vietnamese_word'] for item in vocab_data]
    
    # Clean up obvious non-vietnamese/garbage words if any exist, to save token space
    # (Just a basic filter, the LLM will ignore the rest)
    clean_words = [w for w in all_words if not w.isascii() or w.isalpha()]
    allowed_words_str = ", ".join(clean_words)
    
    model = setup_gemini(args.api_key)
    
    output_path = Path(args.output)
    dialogues = []
    if output_path.exists():
        try:
            with open(output_path, 'r', encoding='utf-8') as f:
                dialogues = json.load(f)
            print(f"Found existing file. Resuming from {len(dialogues)} dialogues...")
        except Exception as e:
            print(f"Could not load existing dialogues, starting fresh: {e}")
            dialogues = []
            
    dialogue_count = len(dialogues)
    
    print(f"Starting generation of {args.limit} advanced comprehension dialogues...")
    
    while dialogue_count < args.limit:
        print(f"Generating Dialogue {dialogue_count + 1} of {args.limit}...")
        
        # Get up to 10 of the most recently generated scenes to prevent duplicates
        previous_scenes = [d.get("scene_setting_english", "") for d in dialogues[-10:]]
        
        retries = 0
        success = False
        while retries < 3 and not success:
            dialogue_data = generate_dialogue(model, allowed_words_str, dialogue_count, previous_scenes)
            
            if dialogue_data and len(dialogue_data.get('dialogue', [])) >= 5: # Basic validation
                dialogues.append(dialogue_data)
                dialogue_count += 1
                
                # Save progress incrementally
                with open(args.output, 'w', encoding='utf-8') as f:
                    json.dump(dialogues, f, ensure_ascii=False, indent=2)
                    
                time.sleep(3) # Slightly longer pause for larger generation tasks
                success = True
            else:
                retries += 1
                print(f"Failed to generate valid dialogue. Retrying in 5 seconds... ({retries}/3)")
                time.sleep(5)
                
        if not success:
            print(f"Skipping dialogue index {dialogue_count} after 3 failed attempts to maintain progress.")
            dialogue_count += 1

    print(f"Success! Generated {len(dialogues)} dialogues.")
    print(f"Dialogues saved to: {args.output}")

if __name__ == "__main__":
    main()
