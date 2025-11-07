-- Demo Data for Study Planner Feature
-- Run this to populate a user's account with sample data

-- Replace 'YOUR_USER_ID' with the actual auth.users.id from Supabase Auth
-- You can get this from: SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- 1. Create demo study sets
INSERT INTO study_sets (id, user_id, title, subject_area, description, color_theme, total_cards, is_public)
VALUES
  ('demo-set-1', 'YOUR_USER_ID', 'Biology Midterm', 'Biology', 'Cell biology and genetics for midterm exam', 'blue', 0, false),
  ('demo-set-2', 'YOUR_USER_ID', 'Spanish Vocabulary', 'Spanish', 'Common verbs and phrases for quiz', 'green', 0, false),
  ('demo-set-3', 'YOUR_USER_ID', 'Chemistry Final', 'Chemistry', 'Organic chemistry reactions and mechanisms', 'purple', 0, false)
ON CONFLICT (id) DO NOTHING;

-- 2. Create demo flashcards (will auto-update total_cards via trigger)
INSERT INTO flashcards (study_set_id, question, answer, hint, difficulty_level)
VALUES
  -- Biology cards
  ('demo-set-1', 'What is the powerhouse of the cell?', 'Mitochondria', 'Produces ATP', 'easy'),
  ('demo-set-1', 'What are the stages of mitosis?', 'Prophase, Metaphase, Anaphase, Telophase', 'Remember PMAT', 'medium'),
  ('demo-set-1', 'What is the structure of DNA?', 'Double helix with complementary base pairs (A-T, G-C)', 'Think of a twisted ladder', 'medium'),
  ('demo-set-1', 'What is the function of ribosomes?', 'Protein synthesis', 'Found in rough ER', 'easy'),
  ('demo-set-1', 'What is the difference between prokaryotic and eukaryotic cells?', 'Prokaryotes lack a nucleus and membrane-bound organelles', 'Pro = before nucleus', 'hard'),

  -- Spanish cards
  ('demo-set-2', 'hablar', 'to speak', 'Common -ar verb', 'easy'),
  ('demo-set-2', 'comer', 'to eat', 'Common -er verb', 'easy'),
  ('demo-set-2', 'vivir', 'to live', 'Common -ir verb', 'easy'),
  ('demo-set-2', '¿Cómo estás?', 'How are you?', 'Informal greeting', 'easy'),

  -- Chemistry cards
  ('demo-set-3', 'What is the general structure of an alkane?', 'CnH2n+2 with single bonds', 'Saturated hydrocarbon', 'medium'),
  ('demo-set-3', 'What is a nucleophile?', 'An electron-rich species that donates electrons', 'Think "nucleus loving"', 'hard'),
  ('demo-set-3', 'What is the difference between SN1 and SN2 reactions?', 'SN1 is unimolecular (2-step), SN2 is bimolecular (1-step)', 'SN1 forms carbocation', 'hard')
ON CONFLICT DO NOTHING;

-- 3. Create calendar events (upcoming exams)
INSERT INTO calendar_events (user_id, title, description, event_type, start_time, end_time, study_set_id, all_day)
VALUES
  -- Biology Midterm - 5 days from now
  ('YOUR_USER_ID', 'Biology Midterm', 'Comprehensive exam covering chapters 1-5', 'exam',
   NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days' + INTERVAL '2 hours', 'demo-set-1', false),

  -- Spanish Quiz - 3 days from now
  ('YOUR_USER_ID', 'Spanish Vocabulary Quiz', 'Quiz on common verbs and phrases', 'exam',
   NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '1 hour', 'demo-set-2', false),

  -- Chemistry Final - 10 days from now
  ('YOUR_USER_ID', 'Chemistry Final Exam', 'Cumulative final covering all organic chemistry', 'exam',
   NOW() + INTERVAL '10 days', NOW() + INTERVAL '10 days' + INTERVAL '3 hours', 'demo-set-3', false),

  -- Another exam without study set - 7 days from now
  ('YOUR_USER_ID', 'History Essay Due', 'Final essay on World War II', 'exam',
   NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days', NULL, true)
ON CONFLICT DO NOTHING;

-- 4. Create some past study sessions to show progress
INSERT INTO learning_sessions (user_id, study_set_id, session_type, duration_seconds, cards_studied, cards_correct)
VALUES
  ('YOUR_USER_ID', 'demo-set-1', 'practice', 600, 10, 7),
  ('YOUR_USER_ID', 'demo-set-1', 'practice', 450, 8, 6),
  ('YOUR_USER_ID', 'demo-set-2', 'practice', 300, 5, 5)
ON CONFLICT DO NOTHING;

-- 5. Create flashcard progress (to show some cards are being learned)
INSERT INTO flashcard_progress (user_id, flashcard_id, times_seen, times_correct, mastery_level, next_review_date)
SELECT
  'YOUR_USER_ID',
  f.id,
  FLOOR(RANDOM() * 3 + 1)::int,
  FLOOR(RANDOM() * 2 + 1)::int,
  CASE WHEN RANDOM() > 0.5 THEN 'learning' ELSE 'reviewing' END,
  NOW() - INTERVAL '1 day'
FROM flashcards f
WHERE f.study_set_id IN ('demo-set-1', 'demo-set-2', 'demo-set-3')
LIMIT 8
ON CONFLICT DO NOTHING;

-- Verification queries:
-- SELECT * FROM study_sets WHERE user_id = 'YOUR_USER_ID';
-- SELECT * FROM calendar_events WHERE user_id = 'YOUR_USER_ID' AND start_time > NOW() ORDER BY start_time;
-- SELECT COUNT(*) FROM flashcards WHERE study_set_id IN ('demo-set-1', 'demo-set-2', 'demo-set-3');
