-- Phase 2: Supabase Schema Definition for Gamified Vietnamese Learning App

-- 1. Create the `words` table to store the global conversational vocabulary.
CREATE TABLE public.words (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vietnamese_word TEXT NOT NULL UNIQUE,
    english_translation TEXT NOT NULL,
    frequency_rank INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast lookup by word (useful during sentence parsing)
CREATE INDEX idx_words_vietnamese ON public.words(vietnamese_word);

-- 2. Create the `user_vocab` table to track individual user progress.
-- This table references the `auth.users` table provided by Supabase Auth.
CREATE TABLE public.user_vocab (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    word_id UUID NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
    is_unlocked BOOLEAN DEFAULT TRUE NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure a user can only unlock a specific word once.
    UNIQUE(user_id, word_id)
);

-- Indexes for fast querying of a user's unlocked words
CREATE INDEX idx_user_vocab_user_id ON public.user_vocab(user_id);

-- 3. Enable Row Level Security (RLS) on `user_vocab` to ensure data privacy.
ALTER TABLE public.user_vocab ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for `user_vocab`

-- Policy: Users can only select/view their own unlocked vocabulary.
CREATE POLICY "Users can view own vocab" 
    ON public.user_vocab 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Policy: Users can only insert new unlocks for themselves.
CREATE POLICY "Users can insert own vocab" 
    ON public.user_vocab 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- (Optional) If we need an admin role or script to read the `words` table:
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone (even unauthenticated, if needed for SSR/edge functions) can read global words.
-- If the app requires login to even see sentences, we can restrict this to authenticated users.
CREATE POLICY "Anyone can read words" 
    ON public.words 
    FOR SELECT 
    USING (true);
