import { Note } from '@/types/note';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Edit, Mic, FileText, Pen, Pin, FileCode, GitBranch, AlignLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onTogglePin?: (noteId: string, e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent, noteId: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, targetNoteId: string) => void;
  onDragEnd?: () => void;
}

const STICKY_COLORS = {
  yellow: 'hsl(var(--sticky-yellow))',
  blue: 'hsl(var(--sticky-blue))',
  green: 'hsl(var(--sticky-green))',
  pink: 'hsl(var(--sticky-pink))',
  orange: 'hsl(var(--sticky-orange))',
};

const RANDOM_COLORS = [
  'hsl(330, 100%, 75%)',
  'hsl(160, 70%, 70%)',
  'hsl(280, 70%, 75%)',
  'hsl(20, 95%, 75%)',
  'hsl(140, 65%, 70%)',
  'hsl(350, 80%, 75%)',
  'hsl(45, 90%, 75%)',
  'hsl(270, 65%, 75%)',
  'hsl(200, 80%, 70%)',
  'hsl(60, 90%, 75%)',
];

export const NoteCard = ({ note, onEdit, onDelete, onTogglePin, onDragStart, onDragOver, onDrop, onDragEnd }: NoteCardProps) => {
  const isSticky = note.type === 'sticky';
  const isLined = note.type === 'lined';
  const isSketch = note.type === 'sketch';
  const isMindMap = note.type === 'mindmap';
  const isCode = note.type === 'code';

  const getCardColor = () => {
    if (isSticky && note.color) {
      return STICKY_COLORS[note.color];
    }
    const index = note.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return RANDOM_COLORS[index % RANDOM_COLORS.length];
  };

  const cardStyle = { backgroundColor: getCardColor() };

  const getTypeBadge = () => {
    if (note.voiceRecordings && note.voiceRecordings.length > 0) {
      return { icon: Mic, label: 'Audio File' };
    }
    switch (note.type) {
      case 'lined':
        return { icon: AlignLeft, label: 'Lined' };
      case 'sketch':
        return { icon: Pen, label: 'Sketch' };
      case 'code':
        return { icon: FileCode, label: 'Code' };
      case 'mindmap':
        return { icon: GitBranch, label: 'Mind Map' };
      default:
        return { icon: FileText, label: 'Text' };
    }
  };

  const badge = getTypeBadge();
  const BadgeIcon = badge.icon;

  return (
    <Card
      onClick={() => onEdit(note)}
      draggable={!!onDragStart}
      onDragStart={onDragStart ? (e) => onDragStart(e, note.id) : undefined}
      onDragOver={onDragOver}
      onDrop={onDrop ? (e) => onDrop(e, note.id) : undefined}
      onDragEnd={onDragEnd}
      className={cn(
        'group relative overflow-hidden transition-all duration-200 cursor-pointer',
        'w-full hover:shadow-md border border-border/50'
      )}
      style={cardStyle}
    >
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
        {onTogglePin && (
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "h-7 w-7 p-0 bg-background/80 hover:bg-background",
              note.isPinned && "opacity-100"
            )}
            onClick={(e) => onTogglePin(note.id, e)}
          >
            <Pin className={cn("h-3 w-3", note.isPinned && "fill-current")} />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 bg-background/80 hover:bg-background"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(note);
          }}
        >
          <Edit className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 bg-background/80 hover:bg-background"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(note.id);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <div className="p-4">
        {note.title && (
          <h3 className="font-semibold text-base mb-2 line-clamp-1 text-foreground">{note.title}</h3>
        )}

        {note.content && (
          <p className="text-sm text-foreground/70 mb-3 line-clamp-2">
            {note.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 text-xs text-foreground/60">
          <span>
            {new Date(note.updatedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })} • {new Date(note.updatedAt).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </span>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-background/50 text-xs font-medium">
            <BadgeIcon className="h-3 w-3" />
            <span>{badge.label}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
