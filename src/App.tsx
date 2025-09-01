import React, { useState, useCallback } from 'react';
import { Plus, MoreHorizontal, ChevronDown, Calendar, List, Search, X } from 'lucide-react';
import AddHabitModal from './components/AddHabitModal';

interface Habit {
  id: number;
  name: string;
  description: string;
  color: string;
  type: string;
  categories: Array<{ main: string; sub: string; }>;
  frequencyType: string;
  selectedDays: string[];
  timesPerPeriod: number;
  periodUnit: string;
  repeatDays: number;
  completed: Record<string, boolean | null>;
  order: number;
}

// --- Helper Functions for Dates ---
const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
};

const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const formatDate = (date: Date, formatStr: string): string => {
    if (formatStr === 'MM / yyyy') {
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${month} / ${year}`;
    }
    if (formatStr === 'EEE') {
        return date.toLocaleString('en-US', { weekday: 'short' }).toUpperCase();
    }
    if (formatStr === 'd') {
        return date.getDate().toString();
    }
    if (formatStr === 'yyyy-MM-dd') {
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${date.getFullYear()}-${month}-${day}`;
    }
    return date.toDateString();
};

// Helper function to get days difference between two dates
const getDaysDifference = (date1: Date, date2: Date): number => {
    const timeDiff = Math.abs(date2.getTime() - date1.getTime());
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
};

// Helper function to determine if a habit is scheduled for a given day
const isHabitScheduledOnDay = (habit: Habit, date: Date): boolean => {
    switch (habit.frequencyType) {
        case 'Everyday':
            return true;
        
        case 'Anytime':
            return true;
        
        case 'Some days of the week':
            const dayName = date.toLocaleString('en-US', { weekday: 'short' });
            return habit.selectedDays.includes(dayName);
        
        case 'Numbers of times per period':
            // Always show for this type - the "X times per period" is a goal, not a daily restriction
            return true;
        
        case 'Repeats':
            if (habit.repeatDays <= 1) return true; // Every day if repeatDays is 1 or less
            
            // Use habit creation date (from habit.id timestamp) as the start date
            const startDate = new Date(habit.id);
            const daysDiff = getDaysDifference(startDate, date);
            return daysDiff % habit.repeatDays === 0;
        
        default:
            return true;
    }
};

// Helper function to get the first day of the month
const getFirstDayOfMonth = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
};

// Helper function to get the last day of the month
const getLastDayOfMonth = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

// Helper function to get all days in a month for calendar display
const getMonthCalendarDays = (date: Date): Date[] => {
    const firstDay = getFirstDayOfMonth(date);
    const lastDay = getLastDayOfMonth(date);
    
    // Get the first day of the week that contains the first day of the month
    const startDate = getStartOfWeek(firstDay);
    
    // Get the last day of the week that contains the last day of the month
    const endDate = addDays(getStartOfWeek(lastDay), 6);
    
    // Calculate how many days we need to show
    const totalDays = getDaysDifference(startDate, endDate) + 1;
    
    const days: Date[] = [];
    for (let i = 0; i < totalDays; i++) {
        days.push(addDays(startDate, i));
    }
    
    return days;
};

// Helper function to get month names
const getMonthName = (monthIndex: number): string => {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIndex];
};

// Helper function to get short month names
const getShortMonthName = (monthIndex: number): string => {
    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return months[monthIndex];
};
// --- Sub-Components ---

// Header item for a single day (e.g., MON 25)
const DayHeader: React.FC<{ date: Date }> = ({ date }) => (
    <div className="flex flex-col items-center flex-1">
        <p className="text-xs font-semibold text-gray-400">{formatDate(date, 'EEE')}</p>
        <p className="mt-1 text-sm font-bold text-white">{formatDate(date, 'd')}</p>
    </div>
);

// The header that displays all 7 days of the week
const WeekHeader: React.FC<{ weekDates: Date[] }> = ({ weekDates }) => {
    return (
        <div className="flex flex-row justify-around pb-4 border-b border-gray-700">
            {weekDates.map(date => (
                <DayHeader key={date.toString()} date={date} />
            ))}
        </div>
    );
};

// Monthly calendar view component
const MonthView: React.FC<{
    currentDate: Date;
    habits: Habit[];
    onDateClick: (date: Date) => void;
}> = ({ currentDate, habits, onDateClick }) => {
    const monthDays = getMonthCalendarDays(currentDate);
    const currentMonth = currentDate.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Days of week header
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    return (
        <div>
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {daysOfWeek.map(day => (
                    <div key={day} className="text-center py-2">
                        <span className="text-xs font-semibold text-gray-400">{day}</span>
                    </div>
                ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
                {monthDays.map((date, index) => {
                    const isCurrentMonth = date.getMonth() === currentMonth;
                    const isToday = date.getTime() === today.getTime();
                    const dateString = formatDate(date, 'yyyy-MM-dd');
                    
                    // Calculate completion status for this date
                    const completedHabits = habits.filter(habit => {
                        const isScheduled = isHabitScheduledOnDay(habit, date);
                        const isCompleted = habit.completed[dateString];
                        return isScheduled && isCompleted;
                    });
                    
                    const scheduledHabits = habits.filter(habit => 
                        isHabitScheduledOnDay(habit, date)
                    );
                    
                    const completionRate = scheduledHabits.length > 0 
                        ? completedHabits.length / scheduledHabits.length 
                        : 0;
                    
                    return (
                        <button
                            key={index}
                            onClick={() => onDateClick(date)}
                            className={`
                                aspect-square p-1 rounded-lg transition-all hover:bg-gray-600
                                ${isCurrentMonth ? 'text-white' : 'text-gray-500'}
                                ${isToday ? 'bg-blue-600 hover:bg-blue-500' : 'hover:bg-gray-700'}
                            `}
                        >
                            <div className="w-full h-full flex flex-col items-center justify-center">
                                <span className={`text-lg font-medium ${isToday ? 'text-white' : ''}`}>
                                    {date.getDate()}
                                </span>
                                {/* Completion indicator */}
                                {scheduledHabits.length > 0 && (
                                    <div className="w-4 h-1 mt-1 rounded-full bg-gray-600">
                                        <div 
                                            className="h-full rounded-full bg-green-500 transition-all"
                                            style={{ width: `${completionRate * 100}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
// The header for the month and navigation arrows
const CalendarHeader: React.FC<{
    currentDate: Date;
    viewMode: 'week' | 'month' | 'year';
    onPrevWeek: () => void;
    onNextWeek: () => void;
    onTitleClick: () => void;
}> = ({ currentDate, viewMode, onPrevWeek, onNextWeek, onTitleClick }) => {
    const getDisplayText = () => {
        if (viewMode === 'year') {
            return currentDate.getFullYear().toString();
        }
        return formatDate(currentDate, 'MM / yyyy');
    };
    
    return (
    <div className="flex flex-row items-center justify-between px-2 mb-5">
        <button onClick={onPrevWeek} className="text-2xl text-white">
            {'<'}
        </button>
        <button 
            onClick={onTitleClick}
            className="text-base font-bold text-white hover:text-gray-300 transition-colors cursor-pointer"
        >
            {getDisplayText()}
        </button>
        <button onClick={onNextWeek} className="text-2xl text-white">
            {'>'}
        </button>
    </div>
    );
};

// Yearly view component showing all 12 months
const YearView: React.FC<{
    currentDate: Date;
    habits: Habit[];
    onMonthClick: (date: Date) => void;
}> = ({ currentDate, habits, onMonthClick }) => {
    const currentYear = currentDate.getFullYear();
    const currentMonth = new Date().getMonth();
    const currentYearIsThisYear = currentYear === new Date().getFullYear();
    
    // Generate all 12 months for the current year
    const months = Array.from({ length: 12 }, (_, index) => {
        return new Date(currentYear, index, 1);
    });
    
    // Calculate completion stats for a specific month
    const getMonthStats = (monthDate: Date) => {
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        let totalScheduledDays = 0;
        let completedDays = 0;
        
        // Check each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateString = formatDate(date, 'yyyy-MM-dd');
            
            // Check each habit for this day
            habits.forEach(habit => {
                const isScheduled = isHabitScheduledOnDay(habit, date);
                if (isScheduled) {
                    totalScheduledDays++;
                    if (habit.completed[dateString]) {
                        completedDays++;
                    }
                }
            });
        }
        
        return { totalScheduledDays, completedDays };
    };
    
    return (
        <div className="grid grid-cols-3 gap-4">
            {months.map((monthDate, index) => {
                const stats = getMonthStats(monthDate);
                const completionRate = stats.totalScheduledDays > 0 
                    ? stats.completedDays / stats.totalScheduledDays 
                    : 0;
                const isCurrentMonth = currentYearIsThisYear && index === currentMonth;
                
                return (
                    <button
                        key={index}
                        onClick={() => onMonthClick(monthDate)}
                        className={`
                            p-4 rounded-xl transition-all hover:bg-gray-600
                            ${isCurrentMonth ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'}
                        `}
                    >
                        <div className="text-center">
                            <h3 className="text-2xl font-bold text-white">
                                {index + 1}
                            </h3>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

// Map color names to Tailwind classes
const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; border: string }> = {
        red: { bg: 'bg-red-500', border: 'border-red-400' },
        orange: { bg: 'bg-orange-500', border: 'border-orange-400' },
        yellow: { bg: 'bg-yellow-500', border: 'border-yellow-400' },
        green: { bg: 'bg-green-500', border: 'border-green-400' },
        blue: { bg: 'bg-blue-500', border: 'border-blue-400' },
        indigo: { bg: 'bg-indigo-500', border: 'border-indigo-400' },
        purple: { bg: 'bg-purple-500', border: 'border-purple-400' },
    };
    return colorMap[color] || { bg: 'bg-green-500', border: 'border-green-400' };
};

// A single tappable circle for a day's check-in
const DayCircle: React.FC<{
    completionStatus: boolean | null;
    isScheduled: boolean;
    onPress: () => void;
    habitColor: string;
}> = ({ completionStatus, isScheduled, onPress, habitColor }) => {
    const colors = getColorClasses(habitColor);
    
    let circleClasses = `w-9 h-9 rounded-full border transition-colors flex items-center justify-center text-sm font-medium `;
    let circleContent = null;
    
    if (!isScheduled) {
        circleClasses += 'bg-gray-800 border-gray-700 text-gray-500 opacity-50 cursor-not-allowed';
    } else if (completionStatus === true) {
        circleClasses += `${colors.bg} ${colors.border} text-white cursor-pointer`;
    } else if (completionStatus === false) {
        circleClasses += 'bg-red-900/30 border-red-800/50 text-red-400 cursor-pointer';
        circleContent = <X className="w-4 h-4" />;
    } else {
        // null or undefined - empty circle
        circleClasses += 'bg-gray-700 border-gray-600 text-gray-300 cursor-pointer hover:bg-gray-600';
    }
    
    return (
        <button 
            onClick={isScheduled ? onPress : undefined} 
            disabled={!isScheduled}
            className={circleClasses} 
            aria-label="Mark habit complete"
        >
            {circleContent}
        </button>
    );
};

const getTextColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
        red: 'text-red-400',
        orange: 'text-orange-400',
        yellow: 'text-yellow-400',
        green: 'text-green-400',
        blue: 'text-blue-400',
        indigo: 'text-indigo-400',
        purple: 'text-purple-400',
    };
    return colorMap[color] || 'text-white';
};

// A row for a single habit, including its name and 7 daily circles
const HabitRow: React.FC<{
    habit: Habit;
    weekDates: Date[];
    onToggle: (habitId: number, dateString: string) => void;
    onEditHabit: (habit: Habit) => void;
    showCircles: boolean;
    onDragStart: (e: React.DragEvent, habitId: number) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, targetHabitId: number) => void;
    isDragging: boolean;
}> = ({ habit, weekDates, onToggle, onEditHabit, showCircles, onDragStart, onDragOver, onDrop, isDragging }) => {
    // Calculate current streak for this habit
    const calculateStreak = (): number => {
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
        
        // Start from today and work backwards day by day
        let currentDay = new Date(today);
        const habitCreationDate = new Date(habit.id); // Use habit ID as creation timestamp
        habitCreationDate.setHours(0, 0, 0, 0);
        
        // Look back up to 365 days or until habit creation date
        for (let daysBack = 0; daysBack < 365; daysBack++) {
            // Stop if we've gone back before the habit was created
            if (currentDay < habitCreationDate) {
                break;
            }
            
            const dateString = formatDate(currentDay, 'yyyy-MM-dd');
            const isScheduled = isHabitScheduledOnDay(habit, currentDay);
            const isCompleted = habit.completed[dateString];
            
            if (isScheduled) {
                if (isCompleted) {
                    streak++;
                } else {
                    // Streak is broken on a scheduled day that wasn't completed
                    break;
                }
            }
            // If not scheduled for this day, continue without breaking streak
            
            // Move to previous day
            currentDay = addDays(currentDay, -1);
        }
        
        return streak;
    };
    
    const currentStreak = calculateStreak();
    
    // Get background styling based on habit type
    const getHabitRowStyling = () => {
        if (habit.type === 'Anchor Habit') {
            return 'bg-blue-500/10 border border-blue-500/20';
        } else if (habit.type === 'Life Goal Habit') {
            return 'bg-red-500/10 border border-red-500/20';
        } else {
            return 'bg-[#1C1C1E] border border-gray-700';
        }
    };
    
    return (
        <div 
            className={`mt-3 ${isDragging ? 'opacity-50' : ''} transition-opacity cursor-move p-3 rounded-lg ${getHabitRowStyling()}`}
            draggable
            onDragStart={(e) => onDragStart(e, habit.id)}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, habit.id)}
        >
            {showCircles ? (
                <div className="flex justify-between items-center mb-4">
                    <button 
                        onClick={() => onEditHabit(habit)}
                        className={`text-base font-medium ${getTextColorClass(habit.color)} hover:opacity-75 transition-opacity text-left`}
                    >
                        {habit.name}
                    </button>
                    {currentStreak > 0 && (
                        <span className="text-sm text-gray-400 font-medium">
                            {currentStreak} day{currentStreak !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            ) : (
                <div className="flex justify-between items-center mb-4">
                    <button 
                        onClick={() => onEditHabit(habit)}
                        className={`text-base font-medium ${getTextColorClass(habit.color)} hover:opacity-75 transition-opacity text-left flex-1`}
                    >
                        {habit.name}
                    </button>
                    <div className="flex items-center space-x-3">
                        {currentStreak > 0 && (
                            <span className="text-sm text-gray-400 font-medium">
                                {currentStreak} day{currentStreak !== 1 ? 's' : ''}
                            </span>
                        )}
                        {(() => {
                            const today = new Date();
                            const todayString = formatDate(today, 'yyyy-MM-dd');
                            const isScheduledToday = isHabitScheduledOnDay(habit, today);
                            const isCompletedToday = habit.completed[todayString];
                            
                            return (
                                <button 
                                    onClick={isScheduledToday ? () => onToggle(habit.id, todayString) : undefined}
                                    disabled={!isScheduledToday}
                                    className={`w-6 h-6 rounded-full border transition-colors flex items-center justify-center text-xs ${
                                        !isScheduledToday
                                            ? 'bg-gray-800 border-gray-700 text-gray-500 opacity-50 cursor-not-allowed'
                                            : isCompletedToday === true
                                                ? `${getColorClasses(habit.color).bg} ${getColorClasses(habit.color).border} text-white cursor-pointer`
                                                : isCompletedToday === false
                                                    ? 'bg-red-900/30 border-red-800/50 text-red-400 cursor-pointer'
                                                    : 'bg-gray-700 border-gray-600 text-gray-300 cursor-pointer hover:bg-gray-600'
                                    }`}
                                >
                                    {isCompletedToday === false && <X className="w-3 h-3" />}
                                </button>
                            );
                        })()}
                    </div>
                </div>
            )}
            {showCircles && (
                <div className="flex items-center w-full">
                    {weekDates.map((date, index) => {
                        const dateString = formatDate(date, 'yyyy-MM-dd');
                        const isCompleted = habit.completed[dateString];
                        const isScheduled = isHabitScheduledOnDay(habit, date);
                        const dayNumber = formatDate(date, 'd');
                        
                        // Check if previous day was completed and scheduled (for connecting line)
                        let showConnectingLine = false;
                        if (index > 0) {
                            const prevDate = weekDates[index - 1];
                            const prevDateString = formatDate(prevDate, 'yyyy-MM-dd');
                            const isPrevCompleted = habit.completed[prevDateString];
                            const isPrevScheduled = isHabitScheduledOnDay(habit, prevDate);
                            showConnectingLine = isCompleted === true && isScheduled && isPrevCompleted === true && isPrevScheduled;
                        }
                        
                        return (
                            <React.Fragment key={dateString}>
                                {/* Connecting line (only show between circles, not before first one) */}
                                {index > 0 && (
                                    <div 
                                        className={`h-1 flex-grow mx-1 ${
                                            showConnectingLine
                                                ? getColorClasses(habit.color).bg 
                                                : 'bg-transparent'
                                        }`}
                                    />
                                )}
                                <DayCircle
                                    completionStatus={isCompleted}
                                    isScheduled={isScheduled}
                                    onPress={() => onToggle(habit.id, dateString)}
                                    habitColor={habit.color}
                                />
                            </React.Fragment>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// --- Main App Screen ---
function App() {
    // State to keep track of the date that determines the current week
    const [currentDate, setCurrentDate] = useState(new Date());
    
    // State to manage the current view mode (week, month, year)
    const [viewMode, setViewMode] = useState<'week' | 'month' | 'year'>('week');
    
    // State to toggle between daily tracking view and simple list view
    const [showDailyTrackingView, setShowDailyTrackingView] = useState(true);

    // State for habits. Each habit has an ID, a name, and an object to track completed dates.
    const [habits, setHabits] = useState<Habit[]>([
        { 
            id: 1, 
            name: 'Non-Negotiable: Open App', 
            description: 'Simple habit to build consistency',
            color: 'blue',
            type: 'Non Negotiables',
            categories: [{ main: 'Mental', sub: 'Personal Development' }],
            frequencyType: 'Everyday',
            selectedDays: [],
            timesPerPeriod: 1,
            periodUnit: 'Week',
            repeatDays: 1,
            order: 0,
            completed: {} 
        },
        { 
            id: 2, 
            name: 'Life-Improving: Jog in the morning', 
            description: 'Morning exercise for better health',
            color: 'green',
            type: 'Life Goal Habit',
            categories: [{ main: 'Physical', sub: 'Exercise' }],
            frequencyType: 'Everyday',
            selectedDays: [],
            timesPerPeriod: 1,
            periodUnit: 'Week',
            repeatDays: 1,
            order: 1,
            completed: {} 
        },
        { 
            id: 3, 
            name: 'Skill-Building: Code for 30 minutes', 
            description: 'Daily coding practice for skill development',
            color: 'purple',
            type: 'Habit',
            categories: [{ main: 'Work', sub: 'Skill Development' }],
            frequencyType: 'Everyday',
            selectedDays: [],
            timesPerPeriod: 1,
            periodUnit: 'Week',
            repeatDays: 1,
            order: 2,
            completed: {} 
        },
    ]);

    // State for controlling the Add Habit modal
    const [showAddHabitModal, setShowAddHabitModal] = useState(false);

    // State for tracking which habit is being edited
    const [selectedHabitToEdit, setSelectedHabitToEdit] = useState<Habit | null>(null);

    // State for drag and drop
    const [draggedHabitId, setDraggedHabitId] = useState<number | null>(null);
    // Generate the 7 dates for the current week based on `currentDate`
    const startOfWeek = getStartOfWeek(currentDate);
    const weekDates = Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek, i));

    // Handlers for week navigation
    const handlePrevWeek = () => {
        if (viewMode === 'week') {
            setCurrentDate(prevDate => addDays(prevDate, -7));
        } else if (viewMode === 'month') {
            setCurrentDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1));
        } else if (viewMode === 'year') {
            setCurrentDate(prevDate => new Date(prevDate.getFullYear() - 1, prevDate.getMonth(), 1));
        }
    };

    const handleNextWeek = () => {
        if (viewMode === 'week') {
            setCurrentDate(prevDate => addDays(prevDate, 7));
        } else if (viewMode === 'month') {
            setCurrentDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1));
        } else if (viewMode === 'year') {
            setCurrentDate(prevDate => new Date(prevDate.getFullYear() + 1, prevDate.getMonth(), 1));
        }
    };
    
    // Handler for clicking on the calendar header title
    const handleTitleClick = () => {
        if (viewMode === 'week') {
            setViewMode('month');
        } else if (viewMode === 'month') {
            setViewMode('year');
        } else if (viewMode === 'year') {
            setViewMode('week');
        }
    };
    
    // Handler for clicking on a date in monthly view
    const handleDateClick = (date: Date) => {
        setCurrentDate(date);
        setViewMode('week');
    };
    
    // Handler for adding a new habit
    const handleAddNewHabit = () => {
        setSelectedHabitToEdit(null); // Ensure we're adding, not editing
        setShowAddHabitModal(true);
    };

    // Handler for editing an existing habit
    const handleEditHabit = (habit: Habit) => {
        setSelectedHabitToEdit(habit);
        setShowAddHabitModal(true);
    };

    // Handler for saving habit from modal (both add and edit)
    const handleSaveHabit = (habitData: {
        id?: number;
        name: string;
        description: string;
        color: string;
        type: string;
        categories: Array<{ main: string; sub: string; }>;
        frequencyType: string;
        selectedDays: string[];
        timesPerPeriod: number;
        periodUnit: string;
        repeatDays: number;
    }) => {
        if (habitData.id) {
            // Editing existing habit
            setHabits(prevHabits =>
                prevHabits.map(habit => {
                    if (habit.id === habitData.id) {
                        return {
                            ...habit,
                            name: habitData.name,
                            description: habitData.description,
                            color: habitData.color,
                            type: habitData.type,
                            categories: habitData.categories,
                            frequencyType: habitData.frequencyType,
                            selectedDays: habitData.selectedDays,
                            timesPerPeriod: habitData.timesPerPeriod,
                            periodUnit: habitData.periodUnit,
                            repeatDays: habitData.repeatDays,
                        };
                    }
                    return habit;
                })
            );
        } else {
            // Adding new habit
            const maxOrder = Math.max(...habits.map(h => h.order), -1);
            const newHabit: Habit = {
                id: Date.now(), // Use timestamp for a simple unique ID
                name: habitData.name,
                description: habitData.description,
                color: habitData.color,
                type: habitData.type,
                categories: habitData.categories,
                frequencyType: habitData.frequencyType,
                selectedDays: habitData.selectedDays,
                timesPerPeriod: habitData.timesPerPeriod,
                periodUnit: habitData.periodUnit,
                repeatDays: habitData.repeatDays,
                order: maxOrder + 1,
                completed: {},
            };
            // Add the new habit to the existing habits array
            setHabits(prevHabits => [...prevHabits, newHabit]);
        }
    };

    // Handler for deleting a habit
    const handleDeleteHabit = (habitId: number) => {
        setHabits(prevHabits => prevHabits.filter(habit => habit.id !== habitId));
    };

    // Handler to toggle a habit's completion status for a specific date
    // useCallback is used for performance optimization
    const handleToggleHabit = useCallback((habitId: number, dateString: string) => {
        setHabits(prevHabits =>
            prevHabits.map(habit => {
                if (habit.id === habitId) {
                    // Create a new 'completed' object to ensure state immutability
                    const newCompleted = { ...habit.completed };
                    // Cycle through three states: null -> true -> false -> null
                    const currentValue = newCompleted[dateString];
                    if (currentValue === null || currentValue === undefined) {
                        newCompleted[dateString] = true; // Empty -> Filled
                    } else if (currentValue === true) {
                        newCompleted[dateString] = false; // Filled -> X'ed out
                    } else {
                        newCompleted[dateString] = null; // X'ed out -> Empty
                    }
                    return { ...habit, completed: newCompleted };
                }
                return habit;
            })
        );
    }, []);

    // Drag and drop handlers
    const handleDragStart = (e: React.DragEvent, habitId: number) => {
        setDraggedHabitId(habitId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetHabitId: number) => {
        e.preventDefault();
        
        if (draggedHabitId === null || draggedHabitId === targetHabitId) {
            setDraggedHabitId(null);
            return;
        }

        setHabits(prevHabits => {
            const sortedHabits = [...prevHabits].sort((a, b) => a.order - b.order);
            const draggedIndex = sortedHabits.findIndex(h => h.id === draggedHabitId);
            const targetIndex = sortedHabits.findIndex(h => h.id === targetHabitId);
            
            if (draggedIndex === -1 || targetIndex === -1) return prevHabits;
            
            // Remove dragged item and insert at target position
            const [draggedHabit] = sortedHabits.splice(draggedIndex, 1);
            sortedHabits.splice(targetIndex, 0, draggedHabit);
            
            // Update order values
            return sortedHabits.map((habit, index) => ({
                ...habit,
                order: index
            }));
        });
        
        setDraggedHabitId(null);
    };

    // Sort habits by order for display
    const sortedHabits = [...habits].sort((a, b) => a.order - b.order);

    // Calculate habit type counts for modal
    const habitMuscleCount = habits.filter(h => h.type === 'Anchor Habit').length;
    const lifeGoalsCount = habits.filter(h => h.type === 'Life Goal Habit').length;

    return (
        <div className="min-h-screen bg-[#1C1C1E] font-sans text-white p-4">
            {/* Header with sidebar, add habit, and settings buttons */}
            <div className="flex justify-between items-center max-w-2xl mx-auto mb-8">
                {/* Left spacer for balance */}
                <div className="flex-1"></div>
                
                {/* Right-aligned controls */}
                <div className="flex items-center space-x-2">
                    {showDailyTrackingView ? (
                        <button
                            onClick={() => setShowDailyTrackingView(false)}
                            className="p-2 rounded-lg transition-colors text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                            title="Switch to List View"
                        >
                            <List className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowDailyTrackingView(true)}
                            className="p-2 rounded-lg transition-colors text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                            title="Switch to Daily View"
                        >
                            <Calendar className="w-5 h-5" />
                        </button>
                    )}
                    {/* Add habit button */}
                    <button 
                        onClick={handleAddNewHabit}
                        className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                    {/* More options button */}
                    <button className="p-2 rounded-full hover:bg-gray-700 transition-colors">
                        <MoreHorizontal className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-2xl mx-auto">
                {/* Title */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-2">Mastery Dashboard</h1>
                    <p className="text-gray-400">Track your habits and build a better you, one day at a time.</p>
                </div>

                {/* Calendar Header */}
                {showDailyTrackingView && (
                    <CalendarHeader
                        currentDate={currentDate}
                        viewMode={viewMode}
                        onPrevWeek={handlePrevWeek}
                        onNextWeek={handleNextWeek}
                        onTitleClick={handleTitleClick}
                    />
                )}

                {/* Week Header - only show in week view and when circles are visible */}
                {viewMode === 'week' && showDailyTrackingView && (
                    <WeekHeader weekDates={weekDates} />
                )}

                {/* Month View */}
                {viewMode === 'month' && (
                    <MonthView
                        currentDate={currentDate}
                        habits={habits}
                        onDateClick={handleDateClick}
                    />
                )}

                {/* Year View */}
                {viewMode === 'year' && (
                    <YearView
                        currentDate={currentDate}
                        habits={habits}
                        onMonthClick={handleDateClick}
                    />
                )}

                {/* Week View - Habit Rows */}
                {viewMode === 'week' && (
                    <div className="space-y-2">
                        {sortedHabits.map(habit => (
                            <HabitRow
                                key={habit.id}
                                habit={habit}
                                weekDates={weekDates}
                                onToggle={handleToggleHabit}
                                onEditHabit={handleEditHabit}
                                showCircles={showDailyTrackingView}
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                isDragging={draggedHabitId === habit.id}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Add Habit Modal */}
            <AddHabitModal
                isOpen={showAddHabitModal}
                onClose={() => {
                    setShowAddHabitModal(false);
                    setSelectedHabitToEdit(null);
                }}
                onSaveHabit={handleSaveHabit}
                onDeleteHabit={handleDeleteHabit}
                habitToEdit={selectedHabitToEdit}
                habitMuscleCount={habitMuscleCount}
                lifeGoalsCount={lifeGoalsCount}
            />
        </div>
    );
}

export default App;