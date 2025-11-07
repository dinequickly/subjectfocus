/**
 * Calendar and date utility functions for study planner
 */

/**
 * Format a date to a readable string
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string (e.g., "Mon, Nov 7")
 */
export function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Format a date with time
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string with time (e.g., "Mon, Nov 7 at 2:30 PM")
 */
export function formatDateTime(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/**
 * Get days until a date
 * @param {Date|string} date - Target date
 * @returns {number} Number of days until the date
 */
export function getDaysUntil(date) {
  const target = new Date(date);
  const now = new Date();
  const diffTime = target - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Get a human-readable "time until" string
 * @param {Date|string} date - Target date
 * @returns {string} Human-readable string (e.g., "in 5 days", "tomorrow", "today")
 */
export function getTimeUntilString(date) {
  const days = getDaysUntil(date);

  if (days < 0) return 'past';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days <= 7) return `in ${days} days`;
  if (days <= 14) return `in ${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''}`;
  return `in ${Math.floor(days / 7)} weeks`;
}

/**
 * Check if a date is today
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is today
 */
export function isToday(date) {
  const d = new Date(date);
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

/**
 * Check if a date is in the past
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is in the past
 */
export function isPast(date) {
  return new Date(date) < new Date();
}

/**
 * Get the start of today
 * @returns {Date} Date object for start of today
 */
export function getStartOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Get the end of a date
 * @param {Date|string} date - Date to get end of
 * @returns {Date} Date object for end of the day
 */
export function getEndOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Generate dates for a calendar view
 * @param {Date} currentDate - Current month to display
 * @returns {Array<Date>} Array of dates to display in calendar
 */
export function generateCalendarDates(currentDate) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of the month
  const firstDay = new Date(year, month, 1);
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0);

  // Days from previous month to show
  const startDay = firstDay.getDay();
  const prevMonthDays = [];
  for (let i = startDay - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    prevMonthDays.push(date);
  }

  // Days in current month
  const currentMonthDays = [];
  for (let i = 1; i <= lastDay.getDate(); i++) {
    currentMonthDays.push(new Date(year, month, i));
  }

  // Days from next month to fill the grid
  const endDay = lastDay.getDay();
  const nextMonthDays = [];
  for (let i = 1; i < 7 - endDay; i++) {
    nextMonthDays.push(new Date(year, month + 1, i));
  }

  return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
}

/**
 * Group events by date
 * @param {Array} events - Array of calendar events
 * @returns {Object} Events grouped by date string (YYYY-MM-DD)
 */
export function groupEventsByDate(events) {
  return events.reduce((acc, event) => {
    const dateKey = new Date(event.start_time).toISOString().split('T')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {});
}

/**
 * Calculate study hours per day between now and exam date
 * @param {number} totalHoursNeeded - Total hours needed to prepare
 * @param {Date|string} examDate - Date of the exam
 * @returns {number} Hours per day needed
 */
export function calculateHoursPerDay(totalHoursNeeded, examDate) {
  const daysUntil = getDaysUntil(examDate);
  if (daysUntil <= 0) return 0;
  return Math.ceil((totalHoursNeeded / daysUntil) * 10) / 10; // Round to 1 decimal
}

/**
 * Generate study session times for a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date (exam date)
 * @param {number} sessionsPerDay - Number of sessions per day
 * @param {number} hoursPerSession - Hours per session
 * @returns {Array} Array of study session objects
 */
export function generateStudySessions(startDate, endDate, sessionsPerDay, hoursPerSession) {
  const sessions = [];
  const current = new Date(startDate);

  while (current < endDate) {
    // Skip if it's the exam day
    if (current.toDateString() === new Date(endDate).toDateString()) {
      break;
    }

    // Generate sessions for this day
    for (let i = 0; i < sessionsPerDay; i++) {
      const sessionStart = new Date(current);
      // Spread sessions throughout the day (9am, 2pm, 7pm)
      const hourOffsets = [9, 14, 19];
      sessionStart.setHours(hourOffsets[i % 3], 0, 0, 0);

      const sessionEnd = new Date(sessionStart);
      sessionEnd.setHours(sessionStart.getHours() + hoursPerSession);

      sessions.push({
        start_time: sessionStart.toISOString(),
        end_time: sessionEnd.toISOString(),
        date: current.toDateString()
      });
    }

    // Move to next day
    current.setDate(current.getDate() + 1);
  }

  return sessions;
}
