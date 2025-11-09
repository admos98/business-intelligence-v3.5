import React, { useState, useMemo } from 'react';
import { t } from '../../translations';
import { gregorianToJalali, getDaysInJalaliMonth, getFirstDayOfWeekJalali, jalaliToGregorian } from '../../lib/jalali';

interface JalaliCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  isEmbedded?: boolean;
}

const JalaliCalendar: React.FC<JalaliCalendarProps> = ({ selectedDate, onSelectDate, isEmbedded = false }) => {
  const [displayDate, setDisplayDate] = useState(selectedDate);
  const [currentJalaliYear, currentJalaliMonth] = useMemo(() => gregorianToJalali(displayDate.getFullYear(), displayDate.getMonth() + 1, displayDate.getDate()), [displayDate]);
  
  const daysInMonth = getDaysInJalaliMonth(currentJalaliYear, currentJalaliMonth);
  const firstDayOfWeek = getFirstDayOfWeekJalali(currentJalaliYear, currentJalaliMonth);
  
  const [selectedJalaliYear, selectedJalaliMonth, selectedJalaliDay] = useMemo(() => gregorianToJalali(selectedDate.getFullYear(), selectedDate.getMonth() + 1, selectedDate.getDate()), [selectedDate]);

  const handleMonthChange = (offset: number) => {
    const newDate = new Date(displayDate);
    newDate.setDate(1);
    const newMonth = newDate.getMonth() + offset;
    newDate.setMonth(newMonth);

    // Handle year change correctly
    if (newMonth < 0) {
        newDate.setFullYear(newDate.getFullYear() - 1);
        newDate.setMonth(11);
    } else if (newMonth > 11) {
        newDate.setFullYear(newDate.getFullYear() + 1);
        newDate.setMonth(0);
    }
    setDisplayDate(newDate);
  };
  
  const handleDayClick = (day: number) => {
    const [gYear, gMonth, gDay] = jalaliToGregorian(currentJalaliYear, currentJalaliMonth, day);
    onSelectDate(new Date(Date.UTC(gYear, gMonth - 1, gDay)));
  };
  
  const renderDays = () => {
    const days = [];
    // empty cells
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="w-10 h-10"></div>);
    }
    // month days
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = day === selectedJalaliDay && currentJalaliMonth === selectedJalaliMonth && currentJalaliYear === selectedJalaliYear;
      days.push(
        <button
          type="button"
          key={day}
          onClick={() => handleDayClick(day)}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            isSelected ? 'bg-accent text-accent-text font-bold' : 'hover:bg-border'
          }`}
        >
          {day.toLocaleString('fa-IR')}
        </button>
      );
    }
    return days;
  };
  
  const calendarClasses = isEmbedded 
    ? ""
    : "absolute top-full right-0 mt-2 bg-background border border-border rounded-xl p-4 z-30 w-full animate-fade-in-down";


  return (
    <div className={calendarClasses}>
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={() => handleMonthChange(-1)} className="p-2 rounded-full hover:bg-border transition-colors">&lt;</button>
        <div className="font-bold text-primary">
          {t.jalaliMonths[currentJalaliMonth - 1]} {currentJalaliYear.toLocaleString('fa-IR')}
        </div>
        <button type="button" onClick={() => handleMonthChange(1)} className="p-2 rounded-full hover:bg-border transition-colors">&gt;</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm text-secondary">
        {t.jalaliDaysShort.map(day => <div key={day} className="w-10 h-10 flex items-center justify-center font-medium">{day}</div>)}
        {renderDays()}
      </div>
       {!isEmbedded && <style>{`
            @keyframes fade-in-down {
                0% { opacity: 0; transform: translateY(-10px); }
                100% { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in-down { animation: fade-in-down 0.2s ease-out forwards; }
        `}</style>}
    </div>
  );
};

export default JalaliCalendar;