import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabaseClient';
import StudyPlannerAgent from '../components/StudyPlannerAgent';
import CalendarView from '../components/CalendarView';
import StudySessionButton from '../components/StudySessionButton';
import { Calendar, Brain, Clock, TrendingUp } from 'lucide-react';
import { getDaysUntil, getTimeUntilString } from '../lib/calendarUtils';

/**
 * StudyPlanner - Main page for AI study planning
 */
const StudyPlanner = () => {
  const { user } = useAuth();
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [stats, setStats] = useState({
    totalExams: 0,
    upcomingStudySessions: 0,
    totalStudyHours: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    if (user) {
      fetchCalendarData();
    }
  }, [user]);

  // Set up realtime subscription for calendar changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('calendar-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchCalendarData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchCalendarData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch all calendar events
      const { data: events, error: eventsError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true });

      if (eventsError) throw eventsError;

      setCalendarEvents(events || []);

      // Calculate stats
      const now = new Date();
      const exams = events?.filter(e => e.event_type === 'exam' && new Date(e.start_time) > now) || [];
      const studySessions = events?.filter(e => e.event_type === 'study_session' && new Date(e.start_time) > now) || [];

      const totalHours = studySessions.reduce((sum, session) => {
        const duration = (new Date(session.end_time) - new Date(session.start_time)) / (1000 * 60 * 60);
        return sum + duration;
      }, 0);

      setStats({
        totalExams: exams.length,
        upcomingStudySessions: studySessions.length,
        totalStudyHours: Math.round(totalHours * 10) / 10
      });

      // Get next 5 upcoming study sessions
      setUpcomingSessions(studySessions.slice(0, 5));
    } catch (err) {
      console.error('Error fetching calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanGenerated = (plan) => {
    // Refresh calendar data when new plan is generated
    fetchCalendarData();
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  const handleSessionClick = (session) => {
    // Navigate to the study set or show details
    if (session.study_set_id) {
      window.location.href = `/study-set/${session.study_set_id}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your study planner...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1800px] mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Brain className="w-8 h-8 text-blue-600" />
            AI Study Planner
          </h1>
          <p className="text-gray-600 mt-2">
            Let AI help you create the perfect study schedule for your upcoming exams
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Upcoming Exams</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalExams}</p>
              </div>
              <Calendar className="w-12 h-12 text-red-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Study Sessions Planned</p>
                <p className="text-3xl font-bold text-gray-900">{stats.upcomingStudySessions}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Study Hours</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalStudyHours}h</p>
              </div>
              <Clock className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: AI Agent Chat */}
          <div className="h-[700px]">
            <StudyPlannerAgent onPlanGenerated={handlePlanGenerated} />
          </div>

          {/* Right: Calendar and Upcoming Sessions */}
          <div className="space-y-6">
            {/* Calendar */}
            <CalendarView
              events={calendarEvents}
              onEventClick={handleEventClick}
              onDateClick={(date) => console.log('Date clicked:', date)}
            />

            {/* Upcoming Study Sessions */}
            {upcomingSessions.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Upcoming Study Sessions
                </h3>
                <div className="space-y-2">
                  {upcomingSessions.map((session, idx) => (
                    <StudySessionButton
                      key={idx}
                      session={session}
                      onClick={() => handleSessionClick(session)}
                      variant="upcoming"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Exams Summary */}
            {stats.totalExams > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-red-600" />
                  Upcoming Exams
                </h3>
                <div className="space-y-3">
                  {calendarEvents
                    .filter(e => e.event_type === 'exam' && new Date(e.start_time) > new Date())
                    .slice(0, 5)
                    .map((exam, idx) => {
                      const daysUntil = getDaysUntil(exam.start_time);
                      const urgency = daysUntil <= 3 ? 'urgent' : daysUntil <= 7 ? 'soon' : 'upcoming';

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border-l-4 ${
                            urgency === 'urgent'
                              ? 'bg-red-50 border-red-500'
                              : urgency === 'soon'
                              ? 'bg-yellow-50 border-yellow-500'
                              : 'bg-blue-50 border-blue-500'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900">{exam.title}</h4>
                              <p className="text-sm text-gray-600">{getTimeUntilString(exam.start_time)}</p>
                            </div>
                            <div
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                urgency === 'urgent'
                                  ? 'bg-red-100 text-red-700'
                                  : urgency === 'soon'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {getTimeUntilString(exam.start_time)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Event Detail Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-bold mb-4">{selectedEvent.title}</h3>
              {selectedEvent.description && (
                <p className="text-gray-600 mb-4">{selectedEvent.description}</p>
              )}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{new Date(selectedEvent.start_time).toLocaleString()}</span>
                </div>
                {selectedEvent.event_type && (
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                      {selectedEvent.event_type}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyPlanner;
