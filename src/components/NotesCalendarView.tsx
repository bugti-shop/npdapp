import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Note } from "@/types/note";
import { cn } from "@/lib/utils";

interface NotesCalendarViewProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  highlightedDates?: Date[];
}

export const NotesCalendarView = ({
  selectedDate,
  onDateSelect,
  highlightedDates,
}: NotesCalendarViewProps) => {
  const today = new Date();
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0);
  const [noteDates, setNoteDates] = useState<Date[]>([]);

  useEffect(() => {
    // If highlightedDates prop is provided, use it instead of loading notes
    if (highlightedDates) {
      setNoteDates(highlightedDates);
      return;
    }

    // Load notes from localStorage and extract dates
    const loadNotes = () => {
      const saved = localStorage.getItem('notes');
      if (saved) {
        const notes: Note[] = JSON.parse(saved);
        const dates = notes.map(note => new Date(note.createdAt));
        setNoteDates(dates);
      }
    };

    loadNotes();

    // Listen for notes updates
    const handleNotesUpdate = () => loadNotes();
    window.addEventListener('notesUpdated', handleNotesUpdate);

    return () => window.removeEventListener('notesUpdated', handleNotesUpdate);
  }, [highlightedDates]);

  // Calculate display month
  const startingMonth = startOfMonth(today);
  const displayMonth = addMonths(startingMonth, currentMonthOffset);
  const monthStart = startOfMonth(displayMonth);
  const monthEnd = endOfMonth(displayMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startPadding = getDay(monthStart);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const hasNote = (date: Date) => noteDates.some((nDate) => isSameDay(nDate, date));

  const handlePrevMonth = () => {
    setCurrentMonthOffset(prev => prev - 1);
  };

  const handleNextMonth = () => {
    setCurrentMonthOffset(prev => prev + 1);
  };

  return (
    <div className="p-6 bg-white">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-accent rounded-full transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4 text-foreground" />
        </button>

        <h3 className="text-base font-normal text-foreground text-center">
          {format(displayMonth, "MMMM yyyy")}
        </h3>

        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-accent rounded-full transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4 text-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-3">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-normal text-muted-foreground h-8 flex items-center justify-center"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: startPadding }).map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square" />
        ))}

        {daysInMonth.map((day) => {
          const hasNoteOnDay = hasNote(day);
          const isToday = isSameDay(day, today);
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          let bgClass = "bg-transparent text-foreground hover:bg-gray-100";
          let bgStyle = {};

          if (isSelected) {
            // Selected date: #a3dbf6
            bgClass = "text-foreground hover:opacity-90";
            bgStyle = { backgroundColor: "#a3dbf6" };
          } else if (hasNoteOnDay) {
            // Dates with notes: #3a99dd
            bgClass = "text-white hover:opacity-90";
            bgStyle = { backgroundColor: "#3a99dd" };
          }

          return (
            <button
              key={day.toString()}
              onClick={() => onDateSelect?.(day)}
              style={bgStyle}
              className={cn(
                "aspect-square w-full flex items-center justify-center rounded-lg text-xs font-normal transition-all focus:outline-none",
                bgClass,
                isToday && !hasNoteOnDay && !isSelected ? "ring-2 ring-primary" : "",
                "cursor-pointer"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

    </div>
  );
};
