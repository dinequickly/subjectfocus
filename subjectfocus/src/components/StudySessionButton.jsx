import React from 'react';
import { Clock, BookOpen } from 'lucide-react';
import { formatDateTime } from '../lib/calendarUtils';

/**
 * StudySessionButton - Displays a study session with time and subject
 * @param {Object} props
 * @param {Object} props.session - Session object with start_time, end_time, title
 * @param {Function} props.onClick - Click handler
 * @param {string} props.variant - 'upcoming' | 'current' | 'completed'
 */
const StudySessionButton = ({ session, onClick, variant = 'upcoming' }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'current':
        return 'bg-blue-50 border-blue-500 hover:bg-blue-100';
      case 'completed':
        return 'bg-gray-50 border-gray-300 hover:bg-gray-100 opacity-75';
      case 'upcoming':
      default:
        return 'bg-white border-gray-300 hover:bg-gray-50';
    }
  };

  const getVariantIndicator = () => {
    switch (variant) {
      case 'current':
        return <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />;
      case 'completed':
        return <div className="w-2 h-2 bg-green-500 rounded-full" />;
      default:
        return null;
    }
  };

  const duration = () => {
    if (!session.start_time || !session.end_time) return '';
    const start = new Date(session.start_time);
    const end = new Date(session.end_time);
    const hours = Math.round((end - start) / (1000 * 60 * 60) * 10) / 10;
    return `${hours}h`;
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 border-2 rounded-lg transition text-left ${getVariantStyles()}`}
    >
      <div className="flex items-start gap-3">
        {/* Icon and indicator */}
        <div className="flex-shrink-0 mt-1">
          <div className="relative">
            <BookOpen className="w-5 h-5 text-gray-600" />
            {getVariantIndicator() && (
              <div className="absolute -top-1 -right-1">
                {getVariantIndicator()}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">
            {session.title || 'Study Session'}
          </h4>

          {session.description && (
            <p className="text-sm text-gray-600 truncate">
              {session.description}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formatDateTime(session.start_time)}</span>
            </div>
            {duration() && (
              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">
                {duration()}
              </span>
            )}
          </div>
        </div>

        {/* Status badge */}
        {variant === 'current' && (
          <div className="flex-shrink-0">
            <span className="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">
              Now
            </span>
          </div>
        )}
      </div>
    </button>
  );
};

export default StudySessionButton;
