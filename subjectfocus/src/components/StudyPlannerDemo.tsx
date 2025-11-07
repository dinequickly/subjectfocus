import React from 'react';
import { Calendar, Brain, Target, Sparkles } from 'lucide-react';

interface StudyPlannerDemoProps {
  onClose: () => void;
  onStartDemo: () => void;
}

const StudyPlannerDemo: React.FC<StudyPlannerDemoProps> = ({ onClose, onStartDemo }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-lg">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-8 h-8" />
            <h2 className="text-2xl font-bold">AI Study Planner</h2>
          </div>
          <p className="text-blue-100">
            Your personal AI assistant for exam preparation
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* What it does */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              What does it do?
            </h3>
            <p className="text-gray-700 mb-4">
              The AI Study Planner has a conversation with you to understand your upcoming exams
              and creates a personalized study schedule. It analyzes your calendar and study sets
              to optimize your preparation time.
            </p>
          </div>

          {/* How it works */}
          <div>
            <h3 className="text-lg font-semibold mb-3">How it works:</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium">Review Your Exams</p>
                  <p className="text-sm text-gray-600">
                    The AI finds all upcoming exams from your calendar and confirms which ones you want to study for
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium">Assess Your Preparation</p>
                  <p className="text-sm text-gray-600">
                    It checks how ready you are for each exam based on your study set progress and practice history
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium">Create Your Schedule</p>
                  <p className="text-sm text-gray-600">
                    Based on your availability and exam dates, it generates study sessions and adds them to your calendar
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 font-bold">
                  4
                </div>
                <div>
                  <p className="font-medium">Stay on Track</p>
                  <p className="text-sm text-gray-600">
                    Your calendar updates automatically with study sessions, and you get reminders to keep you on schedule
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-blue-900">
              <Calendar className="w-4 h-4" />
              To get started, you'll need:
            </h3>
            <ul className="text-sm text-blue-800 space-y-1 ml-6 list-disc">
              <li>At least one upcoming exam in your calendar</li>
              <li>Study sets with flashcards for your subjects</li>
              <li>A few minutes to chat with the AI</li>
            </ul>
          </div>

          {/* Example conversation */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Example conversation:</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
              <div className="flex gap-2">
                <Brain className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <p className="text-gray-700">
                  <span className="font-medium">AI:</span> I found 3 upcoming exams: Biology Midterm (in 5 days),
                  Spanish Quiz (in 3 days), and Chemistry Final (in 10 days). Which ones would you like to study for?
                </p>
              </div>
              <div className="flex gap-2">
                <Target className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-gray-700">
                  <span className="font-medium">You:</span> I need help with Biology and Chemistry.
                </p>
              </div>
              <div className="flex gap-2">
                <Brain className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <p className="text-gray-700">
                  <span className="font-medium">AI:</span> Great! You have 15 Biology cards (60% mastery) and
                  12 Chemistry cards (30% mastery). How much time can you dedicate to studying each day?
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t p-6 flex gap-3 justify-end bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition"
          >
            Maybe Later
          </button>
          <button
            onClick={onStartDemo}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition font-medium shadow-lg"
          >
            Start Planning
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudyPlannerDemo;
