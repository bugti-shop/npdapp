import { useState, useRef, useEffect } from 'react';
import { TodoItem, Priority, Folder, Note, RepeatType, ColoredTag } from '@/types/note';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  FolderIcon,
  ChevronDown,
  MoreVertical,
  Check,
  Flag,
  Copy,
  Pin,
  Trash2,
  Plus,
  Calendar as CalendarIcon,
  FileText,
  Paperclip,
  Tag,
  X,
  Image as ImageIcon,
  MapPin
} from 'lucide-react';
import { LocationMapPreview } from './LocationMapPreview';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { WaveformVisualizer } from './WaveformVisualizer';
import { Play, Pause } from 'lucide-react';
import { TaskDateTimePage, RepeatSettings } from './TaskDateTimePage';
import { notificationManager } from '@/utils/notifications';

interface TaskDetailPageProps {
  isOpen: boolean;
  task: TodoItem | null;
  folders: Folder[];
  onClose: () => void;
  onUpdate: (task: TodoItem) => void;
  onDelete: (taskId: string) => void;
  onDuplicate: (task: TodoItem) => void;
  onConvertToNote: (task: TodoItem) => void;
  onMoveToFolder: (taskId: string, folderId: string | null) => void;
}

const TAG_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', 
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
];


export const TaskDetailPage = ({
  isOpen,
  task,
  folders,
  onClose,
  onUpdate,
  onDelete,
  onDuplicate,
  onConvertToNote,
  onMoveToFolder
}: TaskDetailPageProps) => {
  const [title, setTitle] = useState('');
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [showDateTimePage, setShowDateTimePage] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [reminderOffset, setReminderOffset] = useState<string>('');
  const [repeatSettings, setRepeatSettings] = useState<RepeatSettings | undefined>();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const subtaskInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.text);
    }
  }, [task]);

  useEffect(() => {
    if (showSubtaskInput && subtaskInputRef.current) {
      subtaskInputRef.current.focus();
    }
  }, [showSubtaskInput]);

  if (!isOpen || !task) return null;

  const currentFolder = folders.find(f => f.id === task.folderId);

  const handleTitleBlur = () => {
    if (title.trim() !== task.text) {
      onUpdate({ ...task, text: title.trim() });
    }
  };

  const handleMarkAsDone = async () => {
    try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch {}
    onUpdate({ ...task, completed: !task.completed });
    toast.success(task.completed ? 'Task marked as incomplete' : 'Task marked as done');
  };

  const handleSetPriority = async (priority: Priority) => {
    try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
    onUpdate({ ...task, priority });
    toast.success(`Priority set to ${priority === 'none' ? 'none' : priority}`);
  };

  const handleDuplicate = async () => {
    try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
    onDuplicate(task);
    onClose();
    toast.success('Task duplicated');
  };

  const handlePin = async () => {
    try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
    toast.success('Task pinned');
  };

  const handleDelete = async () => {
    try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch {}
    onDelete(task.id);
    onClose();
    toast.success('Task deleted');
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskText.trim()) return;
    
    try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
    
    const newSubtask: TodoItem = {
      id: Date.now().toString(),
      text: newSubtaskText.trim(),
      completed: false,
    };

    onUpdate({
      ...task,
      subtasks: [...(task.subtasks || []), newSubtask]
    });

    setNewSubtaskText('');
    // Keep input open for next subtask
  };

  const handleSubtaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubtask();
    }
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
    const updatedSubtasks = (task.subtasks || []).map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    onUpdate({ ...task, subtasks: updatedSubtasks });
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    onUpdate({
      ...task,
      subtasks: (task.subtasks || []).filter(st => st.id !== subtaskId)
    });
  };

  const handleDateTimeSave = async (data: {
    selectedDate?: Date;
    selectedTime?: { hour: number; minute: number; period: 'AM' | 'PM' };
    reminder?: string;
    repeatSettings?: RepeatSettings;
  }) => {
    try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
    
    let reminderTime: Date | undefined;
    
    if (data.selectedDate && data.selectedTime) {
      reminderTime = new Date(data.selectedDate);
      let hours = data.selectedTime.hour;
      if (data.selectedTime.period === 'PM' && hours !== 12) hours += 12;
      if (data.selectedTime.period === 'AM' && hours === 12) hours = 0;
      reminderTime.setHours(hours, data.selectedTime.minute, 0, 0);
    }

    const updatedTask: TodoItem = {
      ...task,
      dueDate: data.selectedDate,
      reminderTime,
      repeatType: data.repeatSettings?.frequency as any || 'none',
    };

    onUpdate(updatedTask);
    
    // Store reminder offset and repeat settings for notification scheduling
    setReminderOffset(data.reminder || '');
    setRepeatSettings(data.repeatSettings);

    // Schedule notification
    try {
      const notificationIds = await notificationManager.scheduleTaskReminder(
        updatedTask,
        data.reminder,
        data.repeatSettings
      );
      
      if (notificationIds.length > 0) {
        onUpdate({ ...updatedTask, notificationIds });
        toast.success('Date, time, and reminder saved!');
      } else if (data.selectedDate) {
        toast.success('Date saved!');
      }
    } catch (error) {
      console.error('Error scheduling notification:', error);
      toast.success('Date saved (notification scheduling not available)');
    }

    setShowDateTimePage(false);
  };

  const handleConvertToNote = () => {
    onConvertToNote(task);
    onClose();
  };

  const handleAttachment = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      onUpdate({ ...task, imageUrl: dataUrl });
      toast.success('Attachment added');
    };
    reader.readAsDataURL(file);
  };

  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    
    const newTag: ColoredTag = {
      name: newTagName.trim(),
      color: newTagColor
    };

    onUpdate({
      ...task,
      coloredTags: [...(task.coloredTags || []), newTag]
    });

    // Save to suggestions
    const savedTags = JSON.parse(localStorage.getItem('coloredTagSuggestions') || '[]');
    const exists = savedTags.some((t: ColoredTag) => t.name === newTag.name);
    if (!exists) {
      localStorage.setItem('coloredTagSuggestions', JSON.stringify([newTag, ...savedTags].slice(0, 20)));
    }

    setNewTagName('');
    setShowTagInput(false);
    toast.success('Tag added');
  };

  const handleRemoveTag = (tagName: string) => {
    onUpdate({
      ...task,
      coloredTags: (task.coloredTags || []).filter(t => t.name !== tagName)
    });
  };

  const handleVoicePlay = () => {
    if (!task.voiceRecording) return;

    if (playingVoiceId === task.id && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingVoiceId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(task.voiceRecording.audioUrl);
    audioRef.current = audio;
    audio.onended = () => {
      setPlayingVoiceId(null);
      audioRef.current = null;
    };
    audio.play();
    setPlayingVoiceId(task.id);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-orange-500';
      case 'low': return 'text-green-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className={cn(
      "fixed inset-0 bg-background z-50 flex flex-col transition-transform duration-300",
      isOpen ? "translate-x-0" : "translate-x-full"
    )}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        {/* Left: Folders Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <FolderIcon className="h-4 w-4" />
              <span>{currentFolder?.name || 'All Tasks'}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 bg-popover border shadow-lg z-[60]">
            <DropdownMenuItem 
              onClick={() => onMoveToFolder(task.id, null)}
              className={cn("cursor-pointer", !task.folderId && "bg-accent")}
            >
              <FolderIcon className="h-4 w-4 mr-2" />
              All Tasks (No folder)
              {!task.folderId && <Check className="h-4 w-4 ml-auto" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {folders.map((folder) => (
              <DropdownMenuItem 
                key={folder.id}
                onClick={() => onMoveToFolder(task.id, folder.id)}
                className={cn("cursor-pointer", task.folderId === folder.id && "bg-accent")}
              >
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: folder.color }} />
                {folder.name}
                {task.folderId === folder.id && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Right: Options Menu */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover border shadow-lg z-[60]">
              <DropdownMenuItem onClick={handleMarkAsDone} className="cursor-pointer">
                <Check className="h-4 w-4 mr-2" />
                {task.completed ? 'Mark as Incomplete' : 'Mark as Done'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleSetPriority('high')} className="cursor-pointer">
                <Flag className="h-4 w-4 mr-2 text-red-500" />High Priority
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSetPriority('medium')} className="cursor-pointer">
                <Flag className="h-4 w-4 mr-2 text-orange-500" />Medium Priority
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSetPriority('low')} className="cursor-pointer">
                <Flag className="h-4 w-4 mr-2 text-green-500" />Low Priority
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSetPriority('none')} className="cursor-pointer">
                <Flag className="h-4 w-4 mr-2 text-muted-foreground" />No Priority
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDuplicate} className="cursor-pointer">
                <Copy className="h-4 w-4 mr-2" />Duplicate Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePin} className="cursor-pointer">
                <Pin className="h-4 w-4 mr-2" />Pin Task
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="cursor-pointer text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Task Title */}
        <div className="space-y-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Task title..."
            className={cn(
              "text-xl font-semibold border-none shadow-none px-0 h-auto focus-visible:ring-0",
              task.completed && "line-through opacity-60"
            )}
          />
          {task.priority && task.priority !== 'none' && (
            <div className="flex items-center gap-1.5">
              <Flag className={cn("h-4 w-4", getPriorityColor(task.priority))} />
              <span className={cn("text-sm capitalize", getPriorityColor(task.priority))}>
                {task.priority} Priority
              </span>
            </div>
          )}
        </div>

        {/* Voice Recording Display */}
        {task.voiceRecording && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
            <button
              onClick={handleVoicePlay}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              {playingVoiceId === task.id ? (
                <Pause className="h-5 w-5 text-primary" />
              ) : (
                <Play className="h-5 w-5 text-primary" />
              )}
              <WaveformVisualizer 
                isActive={playingVoiceId === task.id} 
                barCount={20}
                color="hsl(var(--primary))"
                className="h-6 w-24"
              />
              <span className="text-sm text-primary font-medium">
                {formatDuration(task.voiceRecording.duration)}
              </span>
            </button>
          </div>
        )}

        {/* Image Display */}
        {task.imageUrl && (
          <div className="rounded-xl overflow-hidden border border-border">
            <img src={task.imageUrl} alt="Task attachment" className="w-full max-h-48 object-cover" />
          </div>
        )}

        {/* Location Map Display */}
        {task.location && (
          <LocationMapPreview 
            location={task.location} 
            showFullMap={true}
            onClose={() => onUpdate({ ...task, location: undefined })}
          />
        )}

        {/* Subtasks */}
        <div className="space-y-3">
          <button
            onClick={() => setShowSubtaskInput(true)}
            className="flex items-center gap-2 text-primary font-medium"
          >
            <Plus className="h-5 w-5" />
            Add Sub-task
          </button>

          {showSubtaskInput && (
            <div className="flex items-center gap-2 pl-7">
              <Checkbox className="h-5 w-5 rounded-sm border-2" disabled />
              <Input
                ref={subtaskInputRef}
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                onKeyDown={handleSubtaskKeyDown}
                placeholder="Type subtask and press Enter..."
                className="flex-1 h-9"
              />
              <Button variant="ghost" size="icon" onClick={() => setShowSubtaskInput(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {task.subtasks && task.subtasks.length > 0 && (
            <div className="space-y-2 pl-2">
              {task.subtasks.map((subtask) => (
                <div key={subtask.id} className="flex items-center gap-3 py-2 group">
                  <Checkbox
                    checked={subtask.completed}
                    onCheckedChange={() => handleToggleSubtask(subtask.id)}
                    className={cn(
                      "h-5 w-5 rounded-sm border-2",
                      subtask.completed && "border-muted-foreground/50"
                    )}
                  />
                  <span className={cn("flex-1 text-sm", subtask.completed && "line-through text-muted-foreground")}>
                    {subtask.text}
                  </span>
                  <button
                    onClick={() => handleDeleteSubtask(subtask.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Items */}
        <div className="space-y-1 border-t border-border pt-4">
          {/* Date - Opens TaskDateTimePage */}
          <button 
            onClick={() => setShowDateTimePage(true)}
            className="w-full flex items-center gap-3 py-3 hover:bg-muted/50 rounded-lg px-2 transition-colors"
          >
            <CalendarIcon className="h-5 w-5 text-cyan-500" />
            <span className="flex-1 text-left">Date, Time & Reminder</span>
            <span className="text-sm text-muted-foreground">
              {task.dueDate 
                ? `${format(new Date(task.dueDate), 'MMM d')}${task.reminderTime ? ` • ${format(new Date(task.reminderTime), 'h:mm a')}` : ''}`
                : 'Not set'}
            </span>
          </button>

          {/* Convert to Notes */}
          <button 
            onClick={handleConvertToNote}
            className="w-full flex items-center gap-3 py-3 hover:bg-muted/50 rounded-lg px-2 transition-colors"
          >
            <FileText className="h-5 w-5 text-blue-500" />
            <span className="flex-1 text-left">Convert to Notes</span>
          </button>

          {/* Attachment */}
          <button 
            onClick={handleAttachment}
            className="w-full flex items-center gap-3 py-3 hover:bg-muted/50 rounded-lg px-2 transition-colors"
          >
            <Paperclip className="h-5 w-5 text-pink-500" />
            <span className="flex-1 text-left">Attachment</span>
            {task.imageUrl && <ImageIcon className="h-4 w-4 text-muted-foreground" />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="*/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Tag */}
          <div className="space-y-2">
            <Popover open={showTagInput} onOpenChange={setShowTagInput}>
              <PopoverTrigger asChild>
                <button className="w-full flex items-center gap-3 py-3 hover:bg-muted/50 rounded-lg px-2 transition-colors">
                  <Tag className="h-5 w-5 text-yellow-500" />
                  <span className="flex-1 text-left">Tag</span>
                  <span className="text-sm text-muted-foreground">
                    {task.coloredTags?.length || 0} tag(s)
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 z-[60]" align="start">
                <div className="space-y-3">
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Tag name..."
                    className="h-9"
                  />
                  <div className="flex gap-1 flex-wrap">
                    {TAG_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewTagColor(color)}
                        className={cn(
                          "w-6 h-6 rounded-full transition-transform",
                          newTagColor === color && "ring-2 ring-offset-2 ring-primary scale-110"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <Button onClick={handleAddTag} size="sm" className="w-full">
                    Add Tag
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Display existing tags */}
            {task.coloredTags && task.coloredTags.length > 0 && (
              <div className="flex flex-wrap gap-2 pl-10">
                {task.coloredTags.map((tag) => (
                  <span
                    key={tag.name}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full"
                    style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                  >
                    {tag.name}
                    <button onClick={() => handleRemoveTag(tag.name)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Safe area padding for bottom */}
      <div style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }} />

      {/* TaskDateTimePage */}
      <TaskDateTimePage
        isOpen={showDateTimePage}
        onClose={() => setShowDateTimePage(false)}
        onSave={handleDateTimeSave}
        initialDate={task.dueDate ? new Date(task.dueDate) : undefined}
        initialTime={task.reminderTime ? {
          hour: new Date(task.reminderTime).getHours() % 12 || 12,
          minute: new Date(task.reminderTime).getMinutes(),
          period: new Date(task.reminderTime).getHours() >= 12 ? 'PM' : 'AM'
        } : undefined}
        initialReminder={reminderOffset}
        initialRepeatSettings={repeatSettings}
      />
    </div>
  );
};
