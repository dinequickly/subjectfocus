-- Create practice_test_attempts table
CREATE TABLE IF NOT EXISTS public.practice_test_attempts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    practice_test_id uuid NOT NULL,
    study_set_id uuid NOT NULL,
    answers jsonb DEFAULT '{}'::jsonb,
    flagged_questions jsonb DEFAULT '[]'::jsonb,
    time_taken_seconds integer,
    score numeric(5,2),
    max_score integer,
    status text DEFAULT 'in_progress',
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    CONSTRAINT practice_test_attempts_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE,
    CONSTRAINT practice_test_attempts_practice_test_id_fkey
        FOREIGN KEY (practice_test_id)
        REFERENCES public.generated_content(id)
        ON DELETE CASCADE,
    CONSTRAINT practice_test_attempts_study_set_id_fkey
        FOREIGN KEY (study_set_id)
        REFERENCES public.study_sets(id)
        ON DELETE CASCADE,
    CONSTRAINT practice_test_attempts_status_check
        CHECK (status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'abandoned'::text]))
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_practice_test_attempts_user_id
    ON public.practice_test_attempts(user_id);

CREATE INDEX IF NOT EXISTS idx_practice_test_attempts_practice_test_id
    ON public.practice_test_attempts(practice_test_id);

CREATE INDEX IF NOT EXISTS idx_practice_test_attempts_study_set_id
    ON public.practice_test_attempts(study_set_id);

-- Add RLS policies
ALTER TABLE public.practice_test_attempts ENABLE ROW LEVEL SECURITY;

-- Users can view their own attempts
CREATE POLICY "Users can view their own practice test attempts"
    ON public.practice_test_attempts
    FOR SELECT
    USING (user_id = auth.uid());

-- Users can insert their own attempts
CREATE POLICY "Users can create practice test attempts"
    ON public.practice_test_attempts
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own attempts
CREATE POLICY "Users can update their own practice test attempts"
    ON public.practice_test_attempts
    FOR UPDATE
    USING (user_id = auth.uid());

-- Users can delete their own attempts
CREATE POLICY "Users can delete their own practice test attempts"
    ON public.practice_test_attempts
    FOR DELETE
    USING (user_id = auth.uid());

-- Add comments for documentation
COMMENT ON TABLE public.practice_test_attempts IS 'Stores user attempts at practice tests';
COMMENT ON COLUMN public.practice_test_attempts.answers IS 'JSON object mapping question indices to user answers';
COMMENT ON COLUMN public.practice_test_attempts.flagged_questions IS 'Array of flagged question indices';
COMMENT ON COLUMN public.practice_test_attempts.time_taken_seconds IS 'Time taken to complete the test in seconds';
COMMENT ON COLUMN public.practice_test_attempts.score IS 'Score achieved on the test';
COMMENT ON COLUMN public.practice_test_attempts.max_score IS 'Maximum possible score';
