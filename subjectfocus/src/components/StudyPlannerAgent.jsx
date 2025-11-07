import React, { useState, useEffect, useRef } from 'react';
import { Brain, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';
import {
  initializeAgent,
  getAgentMessage,
  processUserInput,
  calculateReadiness,
  generateStudyPlan,
  CONVERSATION_STAGES
} from '../lib/studyAgent';
import StudyPlannerDemo from './StudyPlannerDemo';

/**
 * StudyPlannerAgent - Main conversational AI component for study planning
 */
const StudyPlannerAgent = ({ onPlanGenerated }) => {
  const { user } = useAuth();
  const [showDemo, setShowDemo] = useState(true);
  const [agentState, setAgentState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize agent when demo is closed
  const handleStartDemo = async () => {
    setShowDemo(false);
    await initializeConversation();
  };

  const initializeConversation = async () => {
    if (!user) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Fetch upcoming exams
      const { data: exams, error: examsError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .eq('event_type', 'exam')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (examsError) throw examsError;

      // Fetch study sets
      const { data: studySets, error: setsError } = await supabase
        .from('study_sets')
        .select('*')
        .eq('user_id', user.id);

      if (setsError) throw setsError;

      // Initialize agent
      const initialState = initializeAgent(exams || [], studySets || []);
      setAgentState(initialState);

      // Get welcome message
      const welcomeMsg = getAgentMessage(initialState);
      addMessage('assistant', welcomeMsg.text);

      // Auto-advance to show exams
      setTimeout(() => {
        advanceConversation(initialState);
      }, 1000);
    } catch (err) {
      console.error('Error initializing conversation:', err);
      setError('Failed to load your exams and study sets. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const advanceConversation = async (state) => {
    const newState = { ...state };

    // Handle stage transitions that don't need user input
    if (newState.stage === CONVERSATION_STAGES.WELCOME) {
      newState.stage = CONVERSATION_STAGES.SHOW_EXAMS;
    } else if (newState.stage === CONVERSATION_STAGES.GENERATE_PLAN) {
      // Calculate assessments for selected exams
      await calculateAssessments(newState);

      // Generate the study plan
      const plan = generateStudyPlan(newState);
      newState.generatedPlan = plan;
      newState.stage = CONVERSATION_STAGES.CONFIRM_PLAN;
    }

    setAgentState(newState);

    // Get next message
    const agentMsg = getAgentMessage(newState);
    addMessage('assistant', agentMsg.text, agentMsg);

    return newState;
  };

  const calculateAssessments = async (state) => {
    const assessments = {};

    for (const exam of state.selectedExams) {
      const studySet = state.studySets.find(set => set.id === exam.study_set_id);
      if (!studySet) {
        assessments[exam.id] = { masteryPercent: 0, cardsReviewed: 0, totalCards: 0 };
        continue;
      }

      // Fetch flashcard progress for this study set
      const { data: progress } = await supabase
        .from('flashcard_progress')
        .select('*')
        .eq('user_id', state.user_id || user.id)
        .in('flashcard_id', studySet.flashcard_ids || []);

      assessments[exam.id] = calculateReadiness(studySet, progress || []);
    }

    state.assessments = assessments;
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || !agentState) return;

    const input = userInput.trim();
    setUserInput('');
    setIsProcessing(true);

    // Add user message to chat
    addMessage('user', input);

    try {
      // Process input
      let newState = processUserInput(agentState, input);

      // If there was an error in processing, state will have error message in history
      const lastHistoryMsg = newState.conversationHistory[newState.conversationHistory.length - 1];
      if (lastHistoryMsg?.role === 'assistant') {
        addMessage('assistant', lastHistoryMsg.content);
        setAgentState(newState);
        setIsProcessing(false);
        return;
      }

      // Advance conversation if needed
      newState = await advanceConversation(newState);

      // If plan is complete, save to database
      if (newState.stage === CONVERSATION_STAGES.COMPLETE && newState.generatedPlan) {
        await savePlanToDatabase(newState);
      }
    } catch (err) {
      console.error('Error processing message:', err);
      addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const savePlanToDatabase = async (state) => {
    if (!state.generatedPlan || !user) return;

    try {
      // Insert all study sessions
      const sessionsToInsert = state.generatedPlan.sessions.map(session => ({
        ...session,
        user_id: user.id
      }));

      const { error } = await supabase
        .from('calendar_events')
        .insert(sessionsToInsert);

      if (error) throw error;

      addMessage('assistant', '✅ Study sessions have been added to your calendar!');

      // Notify parent component
      if (onPlanGenerated) {
        onPlanGenerated(state.generatedPlan);
      }
    } catch (err) {
      console.error('Error saving plan:', err);
      addMessage('assistant', '⚠️ There was an error saving your study sessions. Please try again.');
    }
  };

  const addMessage = (role, content, metadata = {}) => {
    setMessages(prev => [...prev, { role, content, metadata, timestamp: new Date() }]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Show demo on first load
  if (showDemo) {
    return (
      <StudyPlannerDemo
        onClose={() => setShowDemo(false)}
        onStartDemo={handleStartDemo}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8" />
          <div>
            <h2 className="text-xl font-bold">AI Study Planner</h2>
            <p className="text-sm text-blue-100">Let's create your personalized study schedule</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4" />
                  <span className="font-semibold text-sm">Study Planner</span>
                </div>
              )}

              {/* Message content with markdown-like formatting */}
              <div className="whitespace-pre-wrap">
                {msg.content.split('\n').map((line, lineIdx) => {
                  // Bold text
                  const formatted = line.split('**').map((part, partIdx) => {
                    if (partIdx % 2 === 1) {
                      return <strong key={partIdx}>{part}</strong>;
                    }
                    return part;
                  });

                  return (
                    <div key={lineIdx}>
                      {formatted}
                      {lineIdx < msg.content.split('\n').length - 1 && <br />}
                    </div>
                  );
                })}
              </div>

              {/* Show status indicators */}
              {msg.metadata?.isError && (
                <div className="flex items-center gap-2 mt-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Error</span>
                </div>
              )}
              {msg.metadata?.isComplete && (
                <div className="flex items-center gap-2 mt-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Complete</span>
                </div>
              )}

              {/* Show option buttons if provided */}
              {msg.metadata?.options && (
                <div className="mt-3 space-y-2">
                  {msg.metadata.options.map((option, optIdx) => (
                    <button
                      key={optIdx}
                      onClick={() => {
                        setUserInput(option);
                        handleSendMessage();
                      }}
                      className="block w-full text-left px-3 py-2 bg-white rounded border border-gray-300 hover:bg-gray-50 transition text-sm"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border-t border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-4 bg-gray-50">
        <div className="flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your response..."
            disabled={isProcessing || !agentState?.stage || agentState?.stage === CONVERSATION_STAGES.COMPLETE}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSendMessage}
            disabled={!userInput.trim() || isProcessing}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudyPlannerAgent;
