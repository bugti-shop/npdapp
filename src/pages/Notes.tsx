import { useState, useEffect } from 'react';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Note } from '@/types/note';
import { NoteEditor } from '@/components/NoteEditor';
import { Layers, Settings, Pin, Download, ListTodo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { exportNoteToDocx } from '@/utils/exportToDocx';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import appLogo from '@/assets/app-logo.png';

const STICKY_COLORS: Record<string, string> = {
  yellow: 'hsl(var(--sticky-yellow))',
  blue: 'hsl(var(--sticky-blue))',
  green: 'hsl(var(--sticky-green))',
  pink: 'hsl(var(--sticky-pink))',
  orange: 'hsl(var(--sticky-orange))',
};

// Vibrant colors for notes display
const RANDOM_COLORS = [
  'hsl(330, 100%, 75%)', // Vibrant Pink
  'hsl(160, 70%, 70%)', // Vibrant Mint
  'hsl(280, 70%, 75%)', // Vibrant Lavender
  'hsl(20, 95%, 75%)', // Vibrant Coral
  'hsl(140, 65%, 70%)', // Vibrant Green
  'hsl(350, 80%, 75%)', // Vibrant Rose
  'hsl(45, 90%, 75%)', // Vibrant Peach
  'hsl(270, 65%, 75%)', // Vibrant Purple
  'hsl(200, 80%, 70%)', // Vibrant Sky Blue
  'hsl(60, 90%, 75%)', // Vibrant Yellow
];

const Notes = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('notes');
    if (saved) {
      const parsed = JSON.parse(saved);
      setNotes(parsed.map((n: Note) => ({
        ...n,
        createdAt: new Date(n.createdAt),
        updatedAt: new Date(n.updatedAt),
        voiceRecordings: n.voiceRecordings?.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp),
        })) || [],
      })));
    }
  }, []);

  const handleSaveNote = (note: Note) => {
    const updatedNotes = notes.map((n) => (n.id === note.id ? note : n));
    setNotes(updatedNotes);
    localStorage.setItem('notes', JSON.stringify(updatedNotes));
  };

  const handleEditNote = (note: Note) => {
    setSelectedNote(note);
    setIsEditorOpen(true);
  };

  const handleTogglePin = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedNotes = notes.map((n) => {
      if (n.id === noteId) {
        return {
          ...n,
          isPinned: !n.isPinned,
          pinnedOrder: !n.isPinned ? Date.now() : undefined,
        };
      }
      return n;
    });
    setNotes(updatedNotes);
    localStorage.setItem('notes', JSON.stringify(updatedNotes));
  };

  const handleDragStart = (e: React.DragEvent, noteId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', noteId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetNoteId: string) => {
    e.preventDefault();
    const draggedNoteId = e.dataTransfer.getData('text/html');

    if (draggedNoteId === targetNoteId) return;

    const draggedNote = notes.find(n => n.id === draggedNoteId);
    const targetNote = notes.find(n => n.id === targetNoteId);

    if (!draggedNote || !targetNote) return;

    // Only allow reordering within pinned or unpinned sections
    if (draggedNote.isPinned !== targetNote.isPinned) return;

    const updatedNotes = [...notes];
    const draggedIndex = updatedNotes.findIndex(n => n.id === draggedNoteId);
    const targetIndex = updatedNotes.findIndex(n => n.id === targetNoteId);

    const [removed] = updatedNotes.splice(draggedIndex, 1);
    updatedNotes.splice(targetIndex, 0, removed);

    // Update pinned order for all pinned notes
    if (draggedNote.isPinned) {
      updatedNotes.forEach((note, idx) => {
        if (note.isPinned) {
          note.pinnedOrder = idx;
        }
      });
    }

    setNotes(updatedNotes);
    localStorage.setItem('notes', JSON.stringify(updatedNotes));
  };

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    if (a.isPinned && b.isPinned) {
      return (a.pinnedOrder || 0) - (b.pinnedOrder || 0);
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const getCardColor = (note: Note) => {
    if (note.type === 'sticky' && note.color) {
      return STICKY_COLORS[note.color];
    }
    // Use random colors for other notes (excluding yellow and sky blue)
    const index = note.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return RANDOM_COLORS[index % RANDOM_COLORS.length];
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b bg-white dark:bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={appLogo} alt="Npd" className="h-8 w-8" />
              <h1 className="text-xl font-bold">Npd</h1>
            </div>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => navigate('/todo/today')}
                title="Switch to To-Do"
                className="h-10 w-10"
              >
                <ListTodo className="h-8 w-8" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {notes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No notes yet</p>
          </div>
        ) : (
          <div className="columns-2 gap-3 space-y-3">
            {sortedNotes.map((note) => (
              <div
                key={note.id}
                draggable
                onDragStart={(e) => handleDragStart(e, note.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, note.id)}
                className="break-inside-avoid cursor-move transition-all hover:scale-105 relative group"
                style={{ backgroundColor: getCardColor(note) }}
                onClick={() => handleEditNote(note)}
              >
                <div className="p-4 rounded-2xl">
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportNoteToDocx(note);
                        toast.success('Note exported to Word');
                      }}
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      title="Export to Word"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => handleTogglePin(note.id, e)}
                      className={cn(
                        "h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-10",
                        note.isPinned && "opacity-100"
                      )}
                    >
                      <Pin className={cn("h-4 w-4", note.isPinned && "fill-current")} />
                    </Button>
                  </div>
                  {note.title && (
                    <h3 className="font-bold text-base mb-2 text-gray-900 pr-10">
                      {note.title}
                    </h3>
                  )}
                  {note.content && (
                    <p className="text-sm text-gray-800 mb-3 line-clamp-4">
                      {note.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()}
                    </p>
                  )}
                  <div className="inline-block px-3 py-1 rounded-full border border-gray-900/20 text-xs text-gray-900">
                    {new Date(note.updatedAt).toLocaleDateString('en-US', {
                      month: 'numeric',
                      day: 'numeric',
                      year: '2-digit'
                    })} {new Date(note.updatedAt).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <NoteEditor
        note={selectedNote}
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setSelectedNote(null);
        }}
        onSave={handleSaveNote}
      />

      <BottomNavigation />
    </div>
  );
};

export default Notes;
