import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, ChevronDown, ChevronUp, Plus } from 'lucide-react';

interface Category {
  main: string;
  sub: string;
}

interface AddHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveHabit: (habitData: {
    id?: number;
    name: string;
    description: string;
    color: string;
    type: string;
    categories: Category[];
    frequencyType: string;
    selectedDays: string[];
    timesPerPeriod: number;
    periodUnit: string;
    repeatDays: number;
  }) => void;
  onDeleteHabit?: (habitId: number) => void;
  habitToEdit?: {
    id: number;
    name: string;
    description: string;
    color: string;
    type: string;
    categories: Category[];
    frequencyType: string;
    selectedDays: string[];
    timesPerPeriod: number;
    periodUnit: string;
    repeatDays: number;
    completed: Record<string, boolean>; // Added for stats calculation
  } | null;
  habitMuscleCount: number;
  lifeGoalsCount: number;
  habitMuscleCount: number;
  lifeGoalsCount: number;
}

// Constants for localStorage
const LOCAL_STORAGE_CATEGORIES_KEY = 'bolt_habit_categories';

// Initial preset categories
const initialPresetCategories = {
  'Physical': ['Exercise', 'Nutrition', 'Sleep', 'Hygiene', 'Movement'],
  'Mental': ['Learning', 'Mindfulness', 'Journaling', 'Reading', 'Problem Solving'],
  'Emotional': ['Stress Management', 'Gratitude', 'Self-Compassion', 'Emotional Regulation'],
  'Social': ['Relationships', 'Community', 'Networking', 'Communication'],
  'Career': ['Productivity', 'Skill Development', 'Professional Growth', 'Work-Life Balance'],
  'Personal Growth': ['Hobbies', 'Creative Projects', 'New Skills', 'Self-Reflection', 'Purpose'],
  'Financial': ['Budgeting', 'Saving', 'Investing', 'Debt Management'],
  'Spiritual': ['Meditation', 'Reflection', 'Values Alignment', 'Connection'],
  'Home & Environment': ['Organization', 'Cleaning', 'Decluttering', 'Sustainability'],
  'Project': ['Side Projects', 'Creative Work', 'Business Ventures', 'Research', 'Building'],
  'Life': ['Life Planning', 'Goal Setting', 'Life Review', 'Major Decisions', 'Life Balance']
};

// Load categories from localStorage
const loadCategoriesFromLocalStorage = (): Record<string, string[]> => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_CATEGORIES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure we return an object, even if localStorage is corrupted
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error loading categories from localStorage:', error);
  }
  // If nothing is stored, save and return the initial presets
  localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(initialPresetCategories));
  return initialPresetCategories;
};

// Save categories to localStorage
const saveCategoriesToLocalStorage = (categoriesMap: Record<string, string[]>) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(categoriesMap));
  } catch (error) {
    console.error('Error saving categories to localStorage:', error);
  }
};

const AddHabitModal: React.FC<AddHabitModalProps> = ({ isOpen, onClose, onSaveHabit, onDeleteHabit, habitToEdit, habitMuscleCount, lifeGoalsCount }) => {
  const [habitName, setHabitName] = useState('');
  const [habitDescription, setHabitDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('green');
  const [habitType, setHabitType] = useState('Habit');
  const [frequencyType, setFrequencyType] = useState('Everyday');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [timesPerPeriod, setTimesPerPeriod] = useState(1);
  const [periodUnit, setPeriodUnit] = useState('Week');
  const [repeatDays, setRepeatDays] = useState(1);
  const [showCategorySelection, setShowCategorySelection] = useState(false);
  const [selectedMainCategory, setSelectedMainCategory] = useState<string | null>(null);
  const [customMainCategoryInput, setCustomMainCategoryInput] = useState('');
  const [customSubCategoryInput, setCustomSubCategoryInput] = useState('');
  
  // FIX 1: Use lazy initializer to load state once on mount
  const [allCategoriesMap, setAllCategoriesMap] = useState<Record<string, string[]>>(
    loadCategoriesFromLocalStorage
  );

  // Helper function to calculate habit statistics
  const calculateHabitStats = (habit: any) => {
    if (!habit || !habit.completed) return { totalCompletions: 0, highestStreak: 0 };
    
    // Count total completions
    const totalCompletions = Object.values(habit.completed).filter(Boolean).length;
    
    // Calculate highest streak
    let highestStreak = 0;
    let currentStreak = 0;
    
    // Get all dates from habit creation to today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const habitCreationDate = new Date(habit.id);
    habitCreationDate.setHours(0, 0, 0, 0);
    
    // Helper function to check if habit is scheduled on a day
    const isHabitScheduledOnDay = (habit: any, date: Date): boolean => {
      switch (habit.frequencyType) {
        case 'Everyday':
          return true;
        case 'Some days of the week':
          const dayName = date.toLocaleString('en-US', { weekday: 'short' });
          return habit.selectedDays.includes(dayName);
        case 'Numbers of times per period':
          return true; // Simplified for this example
        case 'Repeats':
          if (habit.repeatDays <= 1) return true;
          const timeDiff = Math.abs(date.getTime() - habitCreationDate.getTime());
          const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
          return daysDiff % habit.repeatDays === 0;
        default:
          return true;
      }
    };
    
    // Helper function to format date
    const formatDateString = (date: Date): string => {
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${date.getFullYear()}-${month}-${day}`;
    };
    
    // Check each day from creation to today
    let currentDay = new Date(habitCreationDate);
    while (currentDay <= today) {
      const dateString = formatDateString(currentDay);
      const isScheduled = isHabitScheduledOnDay(habit, currentDay);
      const isCompleted = habit.completed[dateString];
      
      if (isScheduled) {
        if (isCompleted) {
          currentStreak++;
          highestStreak = Math.max(highestStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      }
      
      // Move to next day
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return { totalCompletions, highestStreak };
  };

  // Color options with rainbow colors
  const colorOptions = [
    { name: 'red', class: 'bg-red-500', hex: '#ef4444' },
    { name: 'orange', class: 'bg-orange-500', hex: '#f97316' },
    { name: 'yellow', class: 'bg-yellow-500', hex: '#eab308' },
    { name: 'green', class: 'bg-green-500', hex: '#22c55e' },
    { name: 'blue', class: 'bg-blue-500', hex: '#3b82f6' },
    { name: 'indigo', class: 'bg-indigo-500', hex: '#6366f1' },
    { name: 'purple', class: 'bg-purple-500', hex: '#a855f7' },
  ];

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Handle habit category selection
  const toggleHabitCategory = (main: string, sub: string) => {
    const category: Category = { main, sub };
    setSelectedCategories(prev => {
      const exists = prev.some(cat => cat.main === main && cat.sub === sub);
      if (exists) {
        return prev.filter(cat => !(cat.main === main && cat.sub === sub));
      } else {
        return [...prev, category];
      }
    });
  };

  // Handle removing a habit category
  const handleRemoveHabitCategory = (categoryToRemove: Category) => {
    setSelectedCategories(prev => 
      prev.filter(cat => !(cat.main === categoryToRemove.main && cat.sub === categoryToRemove.sub))
    );
  };

  // FIX 2: Make saving explicit
  const handleAddCustomMainCategory = () => {
    const trimmedInput = customMainCategoryInput.trim();
    console.log('Adding main category:', trimmedInput);
    console.log('Current categories map:', allCategoriesMap);
    if (trimmedInput && !allCategoriesMap[trimmedInput]) {
      const newCategoriesMap = {
        ...allCategoriesMap,
        [trimmedInput]: []
      };
      console.log('New categories map:', newCategoriesMap);
      setAllCategoriesMap(newCategoriesMap);
      saveCategoriesToLocalStorage(newCategoriesMap); // Save immediately
      setCustomMainCategoryInput('');
    } else {
      console.log('Category not added - either empty or already exists');
    }
  };

  // FIX 2: Make saving explicit
  const handleAddCustomSubCategory = () => {
    const trimmedInput = customSubCategoryInput.trim();
    console.log('Adding sub category:', trimmedInput, 'to main:', selectedMainCategory);
    if (trimmedInput && selectedMainCategory && !allCategoriesMap[selectedMainCategory]?.includes(trimmedInput)) {
      const newCategoriesMap = {
        ...allCategoriesMap,
        [selectedMainCategory]: [...(allCategoriesMap[selectedMainCategory] || []), trimmedInput]
      };
      console.log('New categories map with sub:', newCategoriesMap);
      setAllCategoriesMap(newCategoriesMap);
      saveCategoriesToLocalStorage(newCategoriesMap); // Save immediately
      setCustomSubCategoryInput('');
    } else {
      console.log('Sub category not added - check conditions');
    }
  };

  // FIX 3: Use onKeyDown for better reliability
  const handleCustomMainCategoryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomMainCategory();
    }
  };

  // FIX 3: Use onKeyDown for better reliability
  const handleCustomSubCategoryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomSubCategory();
    }
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowCategorySelection(false);
      setSelectedMainCategory(null);
      setCustomMainCategoryInput('');
      setCustomSubCategoryInput('');
      if (habitToEdit) {
        // Populate form with existing habit data
        setHabitName(habitToEdit.name);
        setHabitDescription(habitToEdit.description);
        setSelectedColor(habitToEdit.color);
        setHabitType(habitToEdit.type);
        setSelectedCategories(habitToEdit.categories);
        setFrequencyType(habitToEdit.frequencyType);
        setSelectedDays(habitToEdit.selectedDays);
        setTimesPerPeriod(habitToEdit.timesPerPeriod);
        setPeriodUnit(habitToEdit.periodUnit);
        setRepeatDays(habitToEdit.repeatDays);
      } else {
        // Reset form for new habit
        setHabitName('');
        setHabitDescription('');
        setSelectedColor('green');
        setHabitType('Habit'); // Default to regular Habit
        setSelectedCategories([]);
        setFrequencyType('Everyday');
        setSelectedDays([]);
        setTimesPerPeriod(1);
        setPeriodUnit('Week');
        setRepeatDays(1);
      }
    }
  }, [isOpen, habitToEdit]);

  // Handle day selection for "Some days of the week"
  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (habitName.trim()) {
      const habitData = {
        ...(habitToEdit && { id: habitToEdit.id }), // Include ID if editing
        name: habitName.trim(),
        description: habitDescription.trim(),
        color: selectedColor,
        type: habitType,
        categories: selectedCategories,
        frequencyType,
        selectedDays,
        timesPerPeriod,
        periodUnit,
        repeatDays,
      };
      onSaveHabit(habitData);
      onClose();
    }
  };

  // Handle delete
  const handleDelete = () => {
    if (habitToEdit && onDeleteHabit) {
      onDeleteHabit(habitToEdit.id);
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 bg-[#2C2C2E] rounded-2xl shadow-xl transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {habitToEdit ? 'Edit Habit' : 'Create New Habit'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Section (only show when editing) */}
        {habitToEdit && (
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-4">
              {(() => {
                const stats = calculateHabitStats(habitToEdit);
                return (
                  <>
                    <div className="bg-[#1C1C1E] p-4 rounded-lg border border-gray-600">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white mb-1">
                          {stats.totalCompletions}
                        </div>
                        <div className="text-sm text-gray-400">
                          Total Completions
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#1C1C1E] p-4 rounded-lg border border-gray-600">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white mb-1">
                          {stats.highestStreak}
                        </div>
                        <div className="text-sm text-gray-400">
                          Highest Streak
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Habit Name */}
          <div>
            <label htmlFor="habitName" className="block text-sm font-medium text-gray-300 mb-2">
              Habit Name *
            </label>
            <input
              id="habitName"
              type="text"
              value={habitName}
              onChange={(e) => setHabitName(e.target.value)}
              placeholder="e.g., Read for 30 minutes"
              className="w-full px-4 py-3 bg-[#1C1C1E] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              autoFocus
            />
          </div>

          {/* Habit Description */}
          <div>
            <label htmlFor="habitDescription" className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="habitDescription"
              value={habitDescription}
              onChange={(e) => setHabitDescription(e.target.value)}
              placeholder="Add more details about your habit..."
              rows={3}
              className="w-full px-4 py-3 bg-[#1C1C1E] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Habit Color */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Habit Color
            </label>
            <div className="flex space-x-3">
              {colorOptions.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setSelectedColor(color.name)}
                  className={`w-8 h-8 rounded-full ${color.class} border-2 transition-all hover:scale-110 ${
                    selectedColor === color.name ? 'border-white' : 'border-gray-600'
                  } flex items-center justify-center`}
                >
                  {selectedColor === color.name && (
                    <Check className="w-4 h-4 text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Habit Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Habit Type
            </label>
            <div className="space-y-3">
              {[
                { value: 'Habit', label: 'Habit', description: 'Regular habit for personal growth' },
                { value: 'Anchor Habit', label: 'Habit Muscle 💪', description: 'Simple habit to build your habit muscle (only 1 allowed)' },
                { value: 'Life Goal Habit', label: 'Life Goals ⭐', description: 'Top priority habit for major life improvement (only 3 allowed)' }
              ].map((type, index) => {
                const isCurrentSelection = habitType === type.value;
                
                // Determine if this type should be shrunk based on limits
                let shouldShrink = false;
                let backgroundClasses = '';
                let paddingClass = 'p-3';
                
                if (type.value === 'Habit') {
                  // Regular habit always shows full styling
                  backgroundClasses = 'bg-green-500/10 border border-green-500/20 hover:bg-green-500/20';
                } else if (type.value === 'Anchor Habit') {
                  const isLimitReached = habitMuscleCount >= 1;
                  shouldShrink = !isCurrentSelection && isLimitReached;
                  backgroundClasses = 'bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20';
                  paddingClass = shouldShrink ? 'py-2' : 'p-3';
                } else if (type.value === 'Life Goal Habit') {
                  const isLimitReached = lifeGoalsCount >= 3;
                  shouldShrink = !isCurrentSelection && isLimitReached;
                  backgroundClasses = 'bg-red-500/10 border border-red-500/20 hover:bg-red-500/20';
                  paddingClass = shouldShrink ? 'py-2' : 'p-3';
                }
                
                return (
                <label key={type.value} className={`flex items-center space-x-3 cursor-pointer ${paddingClass} rounded-lg transition-colors ${backgroundClasses}`}>
                  <input
                    type="radio"
                    name="habitType"
                    value={type.value}
                    checked={habitType === type.value}
                    onChange={(e) => setHabitType(e.target.value)}
                    className="w-4 h-4 text-green-500 bg-[#1C1C1E] border-gray-600 focus:ring-green-500 flex-shrink-0"
                  />
                  <div>
                    <div className="text-white font-medium">{type.label}</div>
                    <div className={`text-sm text-gray-400 ${shouldShrink ? 'hidden' : ''}`}>{type.description}</div>
                  </div>
                </label>
                );
              })}
            </div>
          </div>

          {/* Categories */}
          <div>
            {/* Categories Header */}
            <button
              type="button"
              onClick={() => setShowCategorySelection(!showCategorySelection)}
              className="flex items-center justify-between w-full text-left mb-3 hover:text-gray-200 transition-colors"
            >
              <span className="text-sm font-medium text-gray-300">Categories (Optional)</span>
              {showCategorySelection ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {/* Selected Categories Display */}
            {selectedCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {(() => {
                  // Group categories by main category
                  const groupedCategories = selectedCategories.reduce((acc, category) => {
                    if (!acc[category.main]) {
                      acc[category.main] = [];
                    }
                    acc[category.main].push(category);
                    return acc;
                  }, {} as Record<string, Category[]>);

                  return Object.entries(groupedCategories).map(([mainCategory, categories]) => (
                    <div key={mainCategory} className="flex flex-wrap items-center gap-2">
                      {/* Main category bubble (blue) - shown once per main category */}
                      <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full">
                        {mainCategory}
                      </span>
                      {/* Sub category bubbles (green) - all subs for this main category */}
                      {categories.map((category, index) => (
                        <span key={`${category.main}-${category.sub}-${index}`} className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 rounded-full">
                          {category.sub}
                          <button
                            type="button"
                            onClick={() => handleRemoveHabitCategory(category)}
                            className="ml-1.5 text-green-400 hover:text-green-300 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            )}

            {/* Collapsible Category Selection */}
            {showCategorySelection && (
              <div className="space-y-4">
                {/* Main Categories */}
                <div>
                  <div className="text-xs font-medium text-gray-400 mb-2">Main Categories</div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {Object.keys(allCategoriesMap).map((mainCategory) => (
                      <button
                        key={mainCategory}
                        type="button"
                        onClick={() => setSelectedMainCategory(
                          selectedMainCategory === mainCategory ? null : mainCategory
                        )}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          selectedMainCategory === mainCategory
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-[#1C1C1E] border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-700'
                        }`}
                      >
                        {mainCategory}
                      </button>
                    ))}
                  </div>
                  
                  {/* Add Custom Main Category */}
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={customMainCategoryInput}
                      onChange={(e) => setCustomMainCategoryInput(e.target.value)}
                      onKeyDown={handleCustomMainCategoryKeyDown}
                      placeholder="Add custom main category..."
                      className="flex-1 px-3 py-2 bg-[#1C1C1E] border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomMainCategory}
                      disabled={!customMainCategoryInput.trim()}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sub Categories (only show when main category is selected) */}
                {selectedMainCategory && (
                  <div>
                    <div className="text-xs font-medium text-gray-400 mb-2">
                      {selectedMainCategory} Sub-Categories
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {allCategoriesMap[selectedMainCategory]?.map((subCategory) => {
                        const isSelected = selectedCategories.some(
                          cat => cat.main === selectedMainCategory && cat.sub === subCategory
                        );
                        return (
                          <button
                            key={subCategory}
                            type="button"
                            onClick={() => toggleHabitCategory(selectedMainCategory, subCategory)}
                            className={`px-2.5 py-1.5 text-xs rounded-md border transition-colors ${
                              isSelected
                                ? 'bg-green-500 border-green-400 text-white'
                                : 'bg-[#1C1C1E] border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-700'
                            }`}
                          >
                            {subCategory}
                          </button>
                        );
                      })}
                    </div>
                    
                    {/* Add Custom Sub Category */}
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={customSubCategoryInput}
                        onChange={(e) => setCustomSubCategoryInput(e.target.value)}
                        onKeyDown={handleCustomSubCategoryKeyDown}
                        placeholder={`Add custom ${selectedMainCategory.toLowerCase()} category...`}
                        className="flex-1 px-3 py-2 bg-[#1C1C1E] border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-transparent transition-all"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomSubCategory}
                        disabled={!customSubCategoryInput.trim()}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              How Often?
            </label>
            <div className="space-y-3">
              {/* Anytime */}
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="frequencyType"
                  value="Anytime"
                  checked={frequencyType === 'Anytime'}
                  onChange={(e) => setFrequencyType(e.target.value)}
                  className="w-4 h-4 text-green-500 bg-[#1C1C1E] border-gray-600 focus:ring-green-500"
                />
                <span className="text-white">Anytime</span>
              </label>

              {/* Everyday */}
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="frequencyType"
                  value="Everyday"
                  checked={frequencyType === 'Everyday'}
                  onChange={(e) => setFrequencyType(e.target.value)}
                  className="w-4 h-4 text-green-500 bg-[#1C1C1E] border-gray-600 focus:ring-green-500"
                />
                <span className="text-white">Everyday</span>
              </label>

              {/* Some days of the week */}
              <div>
                <label className="flex items-center space-x-3 cursor-pointer mb-2">
                  <input
                    type="radio"
                    name="frequencyType"
                    value="Some days of the week"
                    checked={frequencyType === 'Some days of the week'}
                    onChange={(e) => setFrequencyType(e.target.value)}
                    className="w-4 h-4 text-green-500 bg-[#1C1C1E] border-gray-600 focus:ring-green-500"
                  />
                  <span className="text-white">Some days of the week</span>
                </label>
                {frequencyType === 'Some days of the week' && (
                  <div className="ml-7 flex flex-wrap gap-2">
                    {daysOfWeek.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                          selectedDays.includes(day)
                            ? 'bg-green-500 border-green-400 text-white'
                            : 'bg-[#1C1C1E] border-gray-600 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Numbers of times per period */}
              <div>
                <label className="flex items-center space-x-3 cursor-pointer mb-2">
                  <input
                    type="radio"
                    name="frequencyType"
                    value="Numbers of times per period"
                    checked={frequencyType === 'Numbers of times per period'}
                    onChange={(e) => setFrequencyType(e.target.value)}
                    className="w-4 h-4 text-green-500 bg-[#1C1C1E] border-gray-600 focus:ring-green-500"
                  />
                  <span className="text-white">Numbers of times per period</span>
                </label>
                {frequencyType === 'Numbers of times per period' && (
                  <div className="ml-7 flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      value={timesPerPeriod}
                      onChange={(e) => setTimesPerPeriod(parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-1 bg-[#1C1C1E] border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                    <span className="text-gray-300">times per</span>
                    <select
                      value={periodUnit}
                      onChange={(e) => setPeriodUnit(e.target.value)}
                      className="px-2 py-1 bg-[#1C1C1E] border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    >
                      <option value="Week">Week</option>
                      <option value="Month">Month</option>
                      <option value="Year">Year</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Repeats */}
              <div>
                <label className="flex items-center space-x-3 cursor-pointer mb-2">
                  <input
                    type="radio"
                    name="frequencyType"
                    value="Repeats"
                    checked={frequencyType === 'Repeats'}
                    onChange={(e) => setFrequencyType(e.target.value)}
                    className="w-4 h-4 text-green-500 bg-[#1C1C1E] border-gray-600 focus:ring-green-500"
                  />
                  <span className="text-white">Repeats</span>
                </label>
                {frequencyType === 'Repeats' && (
                  <div className="ml-7 flex items-center space-x-2">
                    <span className="text-gray-300">Every</span>
                    <input
                      type="number"
                      min="1"
                      value={repeatDays}
                      onChange={(e) => setRepeatDays(parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-1 bg-[#1C1C1E] border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                    <span className="text-gray-300">days</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3 pt-4">
            {/* Delete button (only show when editing) */}
            {habitToEdit && onDeleteHabit && (
              <button
                type="button"
                onClick={handleDelete}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-red-400 bg-red-900/30 border border-red-800/50 rounded-lg hover:bg-red-900/50 transition-colors font-medium"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Habit</span>
              </button>
            )}
            
            {/* Save/Cancel buttons */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!habitName.trim()}
                className="flex-1 px-4 py-3 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {habitToEdit ? 'Save' : 'Create Habit'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddHabitModal;