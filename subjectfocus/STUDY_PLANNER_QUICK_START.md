# AI Study Planner - Quick Start Guide

## Testing the Feature

### Option 1: Use Existing Data (Recommended)

If you already have study sets and want to quickly test:

1. **Add an Exam to Your Calendar**:
   ```sql
   -- Run in Supabase SQL Editor
   INSERT INTO calendar_events (user_id, title, description, event_type, start_time, end_time, study_set_id)
   VALUES (
     'YOUR_USER_ID',
     'Biology Midterm',
     'Comprehensive exam on cell biology',
     'exam',
     NOW() + INTERVAL '5 days',
     NOW() + INTERVAL '5 days' + INTERVAL '2 hours',
     'YOUR_STUDY_SET_ID'  -- Link to an existing study set
   );
   ```

2. **Navigate to Study Planner**:
   - Go to http://localhost:5173/study-planner
   - Click "Start Planning" on the demo modal

3. **Follow the Conversation**:
   - AI will show your exam
   - Select it (type "1" or "all")
   - Enter hours you can study per day (e.g., "3")
   - Confirm the generated plan

### Option 2: Create Complete Demo Environment

For a full demo with multiple exams and study sets:

1. **Get Your User ID**:
   ```sql
   SELECT id FROM auth.users WHERE email = 'your-email@example.com';
   ```

2. **Create Demo Study Sets**:
   ```sql
   -- Biology Study Set
   INSERT INTO study_sets (id, user_id, title, subject_area, description, total_cards)
   VALUES (
     gen_random_uuid(),
     'YOUR_USER_ID',
     'Biology Exam Prep',
     'Biology',
     'Cell biology and genetics',
     15
   );

   -- Math Study Set
   INSERT INTO study_sets (id, user_id, title, subject_area, description, total_cards)
   VALUES (
     gen_random_uuid(),
     'YOUR_USER_ID',
     'Calculus Review',
     'Mathematics',
     'Derivatives and integrals',
     20
   );
   ```

3. **Create Multiple Exams**:
   ```sql
   -- Urgent exam (3 days away)
   INSERT INTO calendar_events (user_id, title, event_type, start_time, end_time, study_set_id)
   VALUES (
     'YOUR_USER_ID',
     'Biology Quiz',
     'exam',
     NOW() + INTERVAL '3 days',
     NOW() + INTERVAL '3 days' + INTERVAL '1 hour',
     (SELECT id FROM study_sets WHERE title = 'Biology Exam Prep' AND user_id = 'YOUR_USER_ID')
   );

   -- Medium urgency (7 days away)
   INSERT INTO calendar_events (user_id, title, event_type, start_time, end_time, study_set_id)
   VALUES (
     'YOUR_USER_ID',
     'Calculus Midterm',
     'exam',
     NOW() + INTERVAL '7 days',
     NOW() + INTERVAL '7 days' + INTERVAL '2 hours',
     (SELECT id FROM study_sets WHERE title = 'Calculus Review' AND user_id = 'YOUR_USER_ID')
   );

   -- Far away (14 days)
   INSERT INTO calendar_events (user_id, title, event_type, start_time, end_time)
   VALUES (
     'YOUR_USER_ID',
     'History Final',
     'exam',
     NOW() + INTERVAL '14 days',
     NOW() + INTERVAL '14 days' + INTERVAL '3 hours',
     NULL  -- No study set linked
   );
   ```

4. **Test the Full Flow**:
   - Open http://localhost:5173/study-planner
   - You should see 3 upcoming exams
   - Select multiple exams to plan for
   - System will assess readiness (0% for new sets)
   - Enter study availability
   - Review and confirm the generated plan

## Understanding the AI Responses

### Welcome Stage
```
"Hi! I'm your AI Study Planner. I'll help you create a personalized
study schedule for your upcoming exams. Let me check your calendar..."
```

### Show Exams Stage
```
I found 3 upcoming exams:

1. **Biology Quiz** - in 3 days (Mon, Nov 10 at 2:00 PM)
2. **Calculus Midterm** - in 7 days (Fri, Nov 14 at 10:00 AM)
3. **History Final** - in 2 weeks (Fri, Nov 21 at 1:00 PM)

Which exams would you like me to help you prepare for?
```
**Your Response**: "1, 2" or "all"

### Assess Readiness Stage
```
Here's your readiness assessment:

1. **Biology Quiz** (in 3 days)
   - 15 flashcards (0% mastery)
   - ❗ Needs work

2. **Calculus Midterm** (in 7 days)
   - 20 flashcards (0% mastery)
   - ❗ Needs work

How many hours per day can you dedicate to studying?
```
**Your Response**: "3" (or any number 1-8)

### Generate & Confirm Stage
```
I've created a study plan with **12 study sessions**:

- Nov 8: 2 sessions
- Nov 9: 2 sessions
- Nov 10: 1 session
- Nov 11: 2 sessions
- Nov 12: 2 sessions
- Nov 13: 2 sessions
- Nov 14: 1 session

Would you like me to add these sessions to your calendar?
```
**Your Response**: "Yes, add to calendar" (or click the button)

### Complete Stage
```
All done! Your study sessions have been added to your calendar.
Good luck with your exams! 🎓
```

## Verifying It Works

After completing the conversation:

1. **Check Calendar View**:
   - Should see blue dots on dates with study sessions
   - Click dates to see session details

2. **Check Stats**:
   - "Study Sessions Planned" should show total count
   - "Total Study Hours" should show calculated hours

3. **Check Database**:
   ```sql
   SELECT * FROM calendar_events
   WHERE user_id = 'YOUR_USER_ID'
   AND event_type = 'study_session'
   ORDER BY start_time;
   ```

4. **Upcoming Sessions List**:
   - Should show next 5 study sessions
   - Click to navigate to study set

## Troubleshooting

### "I couldn't find any upcoming exams"
- Check that you have events with `event_type = 'exam'`
- Ensure `start_time` is in the future
- Verify `user_id` matches your logged-in user

### "No study set linked - I recommend creating flashcards first"
- Exam doesn't have a `study_set_id`
- AI will still let you plan for it
- Consider linking exams to study sets for better assessments

### Agent seems stuck/not responding
- Check browser console for errors
- Verify Supabase connection
- Check that all required tables exist

### Sessions not appearing in calendar
- Check if save operation succeeded (console logs)
- Verify RLS policies allow inserts on `calendar_events`
- Try refreshing the page

## Next Steps

Once the basic flow works:

1. **Test Edge Cases**:
   - No exams
   - Only past exams
   - Invalid user input
   - Very short/long time until exam

2. **Test Features**:
   - Real-time updates (add exam in another tab)
   - Event details modal
   - Navigation to study sets
   - Calendar month navigation

3. **Customize**:
   - Adjust session timing in `generateStudyPlan()`
   - Modify readiness calculation
   - Change UI colors/styling
   - Add more conversation stages

## Demo Script for Stakeholders

1. **Show Dashboard**: "Here's our AI Study Planner"
2. **Point Out Stats**: "Users can see exam count, planned sessions, and total hours"
3. **Start Conversation**: "Click to start planning"
4. **Show Exam Detection**: "AI automatically finds exams from their calendar"
5. **Select Exams**: "User can choose which exams to focus on"
6. **Explain Assessment**: "System analyzes their readiness based on flashcard progress"
7. **Set Availability**: "User specifies how much time they can dedicate"
8. **Review Plan**: "AI generates optimized schedule distributed until exam dates"
9. **Show Calendar**: "Sessions automatically appear in their calendar"
10. **Highlight Real-time**: "If they add an exam, it updates immediately"

---

**Ready to test!** Open http://localhost:5173/study-planner and start planning. 🚀
