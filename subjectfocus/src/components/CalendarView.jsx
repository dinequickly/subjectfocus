import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { generateCalendarDates, groupEventsByDate, isToday, isPast } from '../lib/calendarUtils';

/**
 * CalendarView - Monthly calendar view with events
 * @param {Object} props
 * @param {Array} props.events - Array of calendar events
 * @param {Function} props.onEventClick - Handler for event clicks
 * @param {Function} props.onDateClick - Handler for date clicks
 */
const CalendarView = ({ events = [], onEventClick, onDateClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const dates = generateCalendarDates(currentDate);
  const eventsByDate = groupEventsByDate(events);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getEventsForDate = (date) => {
    const dateKey = date.toISOString().split('T')[0];
    return eventsByDate[dateKey] || [];
  };

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const getDateClasses = (date) => {
    const base = 'min-h-[100px] p-2 border border-gray-200 cursor-pointer transition';
    const classes = [base];

    if (!isCurrentMonth(date)) {
      classes.push('bg-gray-50 text-gray-400');
    } else {
      classes.push('bg-white hover:bg-blue-50');
    }

    if (isToday(date)) {
      classes.push('ring-2 ring-blue-500 ring-inset');
    }

    return classes.join(' ');
  };

  const getEventDot = (event) => {
    if (event.event_type === 'exam') {
      return 'bg-red-500';
    } else if (event.event_type === 'study_session') {
      return 'bg-blue-500';
    } else {
      return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-6 h-6" />
            {monthYear}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded transition text-sm font-medium"
            >
              Today
            </button>
            <button
              onClick={goToPreviousMonth}
              className="p-1.5 hover:bg-white/20 rounded transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-1.5 hover:bg-white/20 rounded transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center font-semibold text-gray-600 text-sm py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar dates */}
        <div className="grid grid-cols-7 gap-1">
          {dates.map((date, idx) => {
            const dayEvents = getEventsForDate(date);

            return (
              <div
                key={idx}
                className={getDateClasses(date)}
                onClick={() => onDateClick && onDateClick(date)}
              >
                {/* Date number */}
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${isToday(date) ? 'text-blue-600 font-bold' : ''}`}>
                    {date.getDate()}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Events */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event, eventIdx) => (
                    <button
                      key={eventIdx}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick && onEventClick(event);
                      }}
                      className="w-full text-left p-1 rounded hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getEventDot(event)}`} />
                        <span className="text-xs truncate text-gray-700">
                          {event.title}
                        </span>
                      </div>
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 pl-3">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="border-t p-4 bg-gray-50">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-700">Exams</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-700">Study Sessions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500" />
            <span className="text-gray-700">Other Events</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
