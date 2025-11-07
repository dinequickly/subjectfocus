import { getDaysUntil, getTimeUntilString, formatDateTime } from './calendarUtils';

/**
 * Study Planner AI Agent
 * Manages conversation flow and state for creating study plans
 */

export const CONVERSATION_STAGES = {
  WELCOME: 'welcome',
  SHOW_EXAMS: 'show_exams',
  SELECT_EXAMS: 'select_exams',
  ASSESS_READINESS: 'assess_readiness',
  ASK_AVAILABILITY: 'ask_availability',
  GENERATE_PLAN: 'generate_plan',
  CONFIRM_PLAN: 'confirm_plan',
  COMPLETE: 'complete'
};

/**
 * Initialize agent state
 * @param {Array} upcomingExams - Array of upcoming exam events
 * @param {Array} studySets - Array of user's study sets
 * @returns {Object} Initial agent state
 */
export function initializeAgent(upcomingExams, studySets) {
  return {
    stage: CONVERSATION_STAGES.WELCOME,
    upcomingExams,
    studySets,
    selectedExams: [],
    assessments: {},
    availability: {
      hoursPerDay: null,
      daysPerWeek: null
    },
    generatedPlan: null,
    conversationHistory: []
  };
}

/**
 * Get the next message from the AI agent
 * @param {Object} state - Current agent state
 * @returns {Object} Message object with text and options
 */
export function getAgentMessage(state) {
  switch (state.stage) {
    case CONVERSATION_STAGES.WELCOME:
      return {
        text: "Hi! I'm your AI Study Planner. I'll help you create a personalized study schedule for your upcoming exams. Let me check your calendar...",
        options: null,
        needsUserInput: false
      };

    case CONVERSATION_STAGES.SHOW_EXAMS:
      if (state.upcomingExams.length === 0) {
        return {
          text: "I couldn't find any upcoming exams in your calendar. Please add some exams to your calendar first, and then we can create a study plan together!",
          options: null,
          needsUserInput: false,
          isError: true
        };
      }

      const examList = state.upcomingExams
        .map((exam, idx) => {
          const daysUntil = getDaysUntil(exam.start_time);
          const timeStr = getTimeUntilString(exam.start_time);
          return `${idx + 1}. **${exam.title}** - ${timeStr} (${formatDateTime(exam.start_time)})`;
        })
        .join('\n');

      return {
        text: `I found ${state.upcomingExams.length} upcoming exam${state.upcomingExams.length > 1 ? 's' : ''}:\n\n${examList}\n\nWhich exams would you like me to help you prepare for? (Enter the numbers separated by commas, e.g., "1, 3" or type "all" for all exams)`,
        options: null,
        needsUserInput: true
      };

    case CONVERSATION_STAGES.ASSESS_READINESS:
      // Build readiness assessment
      const assessments = state.selectedExams.map((exam, idx) => {
        const studySet = state.studySets.find(set => set.id === exam.study_set_id);
        if (!studySet) {
          return `${idx + 1}. **${exam.title}**: No study set linked - I recommend creating flashcards first!`;
        }

        const totalCards = studySet.total_cards || 0;
        const assessment = state.assessments[exam.id] || {};
        const masteryPercent = assessment.masteryPercent || 0;

        let readinessMsg = '';
        if (masteryPercent >= 80) readinessMsg = '✅ Great progress!';
        else if (masteryPercent >= 50) readinessMsg = '⚠️ Making progress';
        else readinessMsg = '❗ Needs work';

        return `${idx + 1}. **${exam.title}** (${getTimeUntilString(exam.start_time)})\n   - ${totalCards} flashcards (${masteryPercent}% mastery)\n   - ${readinessMsg}`;
      }).join('\n\n');

      return {
        text: `Here's your readiness assessment:\n\n${assessments}\n\nHow many hours per day can you dedicate to studying? (Enter a number between 1-8)`,
        options: null,
        needsUserInput: true
      };

    case CONVERSATION_STAGES.GENERATE_PLAN:
      return {
        text: "Perfect! I'm generating your personalized study plan...",
        options: null,
        needsUserInput: false
      };

    case CONVERSATION_STAGES.CONFIRM_PLAN:
      if (!state.generatedPlan) {
        return {
          text: "Sorry, there was an error generating your plan. Please try again.",
          options: null,
          needsUserInput: false,
          isError: true
        };
      }

      const planSummary = state.generatedPlan.sessions
        .reduce((acc, session) => {
          const date = new Date(session.start_time).toLocaleDateString();
          if (!acc[date]) acc[date] = 0;
          acc[date]++;
          return acc;
        }, {});

      const summaryText = Object.entries(planSummary)
        .map(([date, count]) => `- ${date}: ${count} session${count > 1 ? 's' : ''}`)
        .join('\n');

      return {
        text: `I've created a study plan with **${state.generatedPlan.sessions.length} study sessions**:\n\n${summaryText}\n\nWould you like me to add these sessions to your calendar?`,
        options: ['Yes, add to calendar', 'No, let me review first'],
        needsUserInput: true
      };

    case CONVERSATION_STAGES.COMPLETE:
      return {
        text: "All done! Your study sessions have been added to your calendar. Good luck with your exams! 🎓",
        options: null,
        needsUserInput: false,
        isComplete: true
      };

    default:
      return {
        text: "I'm not sure what to do next. Let's start over.",
        options: null,
        needsUserInput: false,
        isError: true
      };
  }
}

/**
 * Process user input and advance conversation
 * @param {Object} state - Current agent state
 * @param {string} userInput - User's input
 * @returns {Object} Updated state
 */
export function processUserInput(state, userInput) {
  const newState = { ...state };
  newState.conversationHistory.push({ role: 'user', content: userInput });

  switch (state.stage) {
    case CONVERSATION_STAGES.WELCOME:
      // Auto-advance to showing exams
      newState.stage = CONVERSATION_STAGES.SHOW_EXAMS;
      break;

    case CONVERSATION_STAGES.SHOW_EXAMS:
      // Parse exam selection
      const input = userInput.toLowerCase().trim();
      if (input === 'all') {
        newState.selectedExams = [...state.upcomingExams];
      } else {
        // Parse comma-separated numbers
        const indices = input
          .split(',')
          .map(s => parseInt(s.trim()))
          .filter(n => !isNaN(n) && n > 0 && n <= state.upcomingExams.length);

        if (indices.length === 0) {
          // Invalid input, stay on same stage
          newState.conversationHistory.push({
            role: 'assistant',
            content: "I didn't understand that. Please enter exam numbers (e.g., '1, 2') or 'all'."
          });
          return newState;
        }

        newState.selectedExams = indices.map(i => state.upcomingExams[i - 1]);
      }
      newState.stage = CONVERSATION_STAGES.ASSESS_READINESS;
      break;

    case CONVERSATION_STAGES.ASSESS_READINESS:
      // Parse hours per day
      const hours = parseFloat(userInput);
      if (isNaN(hours) || hours < 1 || hours > 8) {
        newState.conversationHistory.push({
          role: 'assistant',
          content: "Please enter a valid number of hours between 1 and 8."
        });
        return newState;
      }

      newState.availability.hoursPerDay = hours;
      newState.stage = CONVERSATION_STAGES.GENERATE_PLAN;
      break;

    case CONVERSATION_STAGES.CONFIRM_PLAN:
      // Check if user confirmed
      if (userInput.toLowerCase().includes('yes')) {
        newState.stage = CONVERSATION_STAGES.COMPLETE;
      } else {
        newState.conversationHistory.push({
          role: 'assistant',
          content: "No problem! You can review the plan in your calendar view below and make adjustments as needed."
        });
        newState.stage = CONVERSATION_STAGES.COMPLETE;
      }
      break;

    default:
      break;
  }

  return newState;
}

/**
 * Calculate readiness assessment for an exam
 * @param {Object} studySet - Study set data
 * @param {Array} progress - Flashcard progress data
 * @returns {Object} Assessment with metrics
 */
export function calculateReadiness(studySet, progress) {
  if (!studySet || !studySet.total_cards) {
    return {
      masteryPercent: 0,
      cardsReviewed: 0,
      totalCards: 0,
      avgCorrectRate: 0
    };
  }

  const totalCards = studySet.total_cards;
  const cardsReviewed = progress.length;

  // Calculate average mastery
  const totalMastery = progress.reduce((sum, p) => {
    const correctRate = p.times_seen > 0 ? (p.times_correct / p.times_seen) : 0;
    return sum + correctRate;
  }, 0);

  const avgCorrectRate = cardsReviewed > 0 ? totalMastery / cardsReviewed : 0;
  const masteryPercent = Math.round((cardsReviewed / totalCards) * avgCorrectRate * 100);

  return {
    masteryPercent: Math.min(masteryPercent, 100),
    cardsReviewed,
    totalCards,
    avgCorrectRate: Math.round(avgCorrectRate * 100)
  };
}

/**
 * Generate study plan based on state
 * @param {Object} state - Agent state with selected exams and availability
 * @returns {Object} Generated plan with sessions
 */
export function generateStudyPlan(state) {
  const sessions = [];

  // For each selected exam
  state.selectedExams.forEach(exam => {
    const studySet = state.studySets.find(set => set.id === exam.study_set_id);
    if (!studySet) return;

    const daysUntil = getDaysUntil(exam.start_time);
    if (daysUntil <= 0) return;

    const assessment = state.assessments[exam.id] || {};
    const masteryPercent = assessment.masteryPercent || 0;

    // Calculate how many hours needed (inverse of mastery)
    const hoursNeeded = Math.max(2, Math.round((100 - masteryPercent) / 10));

    // Calculate sessions needed
    const hoursPerDay = state.availability.hoursPerDay || 2;
    const totalSessions = Math.ceil(hoursNeeded / hoursPerDay);

    // Distribute sessions evenly until exam
    const sessionInterval = Math.max(1, Math.floor(daysUntil / totalSessions));

    for (let i = 0; i < totalSessions && i * sessionInterval < daysUntil; i++) {
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() + (i * sessionInterval));

      // Set time to various hours of the day
      const hourOffsets = [9, 14, 19]; // 9am, 2pm, 7pm
      sessionDate.setHours(hourOffsets[i % 3], 0, 0, 0);

      const sessionEnd = new Date(sessionDate);
      sessionEnd.setHours(sessionDate.getHours() + hoursPerDay);

      sessions.push({
        study_set_id: studySet.id,
        exam_id: exam.id,
        title: `Study: ${exam.title}`,
        description: `Study session for ${studySet.title}`,
        start_time: sessionDate.toISOString(),
        end_time: sessionEnd.toISOString(),
        event_type: 'study_session'
      });
    }
  });

  return {
    sessions,
    totalHours: sessions.reduce((sum, s) => {
      const duration = (new Date(s.end_time) - new Date(s.start_time)) / (1000 * 60 * 60);
      return sum + duration;
    }, 0)
  };
}
