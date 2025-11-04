-- Add ai_feedback column to store AI grading results for short answer/essay questions
ALTER TABLE public.practice_test_attempts 
ADD COLUMN IF NOT EXISTS ai_feedback jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.practice_test_attempts.ai_feedback IS 'AI grading results: { questionIndex: { score, feedback } }';
