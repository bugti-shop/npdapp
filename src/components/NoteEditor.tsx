import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Note, NoteType, StickyColor, VoiceRecording, Folder } from '@/types/note';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from './RichTextEditor';
import { VoiceRecorder } from './VoiceRecorder';
import { SketchEditor } from './SketchEditor';
import { VirtualizedCodeEditor } from './VirtualizedCodeEditor';
import { MindMapEditor } from './MindMapEditor';
import { TemplateSelector } from './TemplateSelector';
import { ArrowLeft, Folder as FolderIcon, Plus, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { scheduleNoteReminder, updateNoteReminder, cancelNoteReminder } from '@/utils/noteNotifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface NoteEditorProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: Note) => void;
  defaultType?: NoteType;
  defaultFolderId?: string;
}

const DEFAULT_FOLDERS: Folder[] = [
  { id: 'sticky', name: 'Sticky Notes', noteType: 'sticky', isDefault: true, createdAt: new Date() },
  { id: 'lined', name: 'Lined Notes', noteType: 'lined', isDefault: true, createdAt: new Date() },
  { id: 'regular', name: 'Regular Notes', noteType: 'regular', isDefault: true, createdAt: new Date() },
  { id: 'sketch', name: 'Sketch Notes', noteType: 'sketch', isDefault: true, createdAt: new Date() },
  { id: 'code', name: 'Code Notes', noteType: 'code', isDefault: true, createdAt: new Date() },
  { id: 'mindmap', name: 'Mind Maps', noteType: 'mindmap', isDefault: true, createdAt: new Date() },
];

const STICKY_COLORS: StickyColor[] = ['yellow', 'blue', 'green', 'pink', 'orange'];

const STICKY_COLOR_VALUES = {
  yellow: 'hsl(var(--sticky-yellow))',
  blue: 'hsl(var(--sticky-blue))',
  green: 'hsl(var(--sticky-green))',
  pink: 'hsl(var(--sticky-pink))',
  orange: 'hsl(var(--sticky-orange))',
};

export const NoteEditor = ({ note, isOpen, onClose, onSave, defaultType = 'regular', defaultFolderId }: NoteEditorProps) => {
  const navigate = useNavigate();
  const [noteType, setNoteType] = useState<NoteType>(defaultType);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<StickyColor>('yellow');
  const [images, setImages] = useState<string[]>([]);
  const [voiceRecordings, setVoiceRecordings] = useState<VoiceRecording[]>([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [fontFamily, setFontFamily] = useState<string>('-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif');
  const [fontSize, setFontSize] = useState<string>('16px');
  const [fontWeight, setFontWeight] = useState<string>('400');
  const [letterSpacing, setLetterSpacing] = useState<string>('0em');
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [lineHeight, setLineHeight] = useState<string>('1.5');
  const [createdAt, setCreatedAt] = useState<Date>(new Date());
  const [createdTime, setCreatedTime] = useState<string>('12:00');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState<string>('12:00');
  const [reminderRecurring, setReminderRecurring] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [reminderVibration, setReminderVibration] = useState<boolean>(true);
  const [notificationId, setNotificationId] = useState<number | undefined>(undefined);
  const [notificationIds, setNotificationIds] = useState<number[] | undefined>(undefined);

  // Code note state
  const [codeContent, setCodeContent] = useState<string>('');
  const [codeLanguage, setCodeLanguage] = useState<string>('auto');

  // Folder state
  const [folders, setFolders] = useState<Folder[]>(DEFAULT_FOLDERS);
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(undefined);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    const savedFolders = localStorage.getItem('folders');
    if (savedFolders) {
      const parsed = JSON.parse(savedFolders);
      setFolders([...DEFAULT_FOLDERS, ...parsed.map((f: Folder) => ({
        ...f,
        createdAt: new Date(f.createdAt),
      }))]);
    }
  }, []);

  useEffect(() => {
    if (note) {
      setNoteType(note.type);
      setTitle(note.title);
      setContent(note.content);
      setColor(note.color || 'yellow');
      setImages(note.images || []);
      setVoiceRecordings(note.voiceRecordings);
      setSelectedFolderId(note.folderId);
      setFontFamily(note.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif');
      setFontSize(note.fontSize || '16px');
      setFontWeight(note.fontWeight || '400');
      setLetterSpacing(note.letterSpacing || '0em');
      setIsItalic(note.isItalic || false);
      setLineHeight(note.lineHeight || '1.5');
      const noteDate = new Date(note.createdAt);
      setCreatedAt(noteDate);
      setCreatedTime(format(noteDate, 'HH:mm'));
      setReminderEnabled(note.reminderEnabled || false);
      setReminderRecurring(note.reminderRecurring || 'none');
      setReminderVibration(note.reminderVibration !== false);
      if (note.reminderTime) {
        const reminderDate = new Date(note.reminderTime);
        setReminderTime(format(reminderDate, 'HH:mm'));
      }
      setNotificationId(note.notificationId);
      setNotificationIds(note.notificationIds);

      // Code fields
      setCodeContent(note.codeContent || '');
      setCodeLanguage(note.codeLanguage || 'auto');
    } else {
      setNoteType(defaultType);
      setTitle('');
      setContent('');
      setColor('yellow');
      setImages([]);
      setVoiceRecordings([]);
      setSelectedFolderId(defaultFolderId);
      setFontFamily('-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif');
      setFontSize('16px');
      setFontWeight('400');
      setLetterSpacing('0em');
      setIsItalic(false);
      setLineHeight('1.5');
      const now = new Date();
      setCreatedAt(now);
      setCreatedTime(format(now, 'HH:mm'));
      setReminderEnabled(false);
      setReminderTime('12:00');
      setReminderRecurring('none');
      setReminderVibration(true);
      setNotificationId(undefined);
      setNotificationIds(undefined);

      // Reset code fields
      setCodeContent('');
      setCodeLanguage('auto');
    }
  }, [note, defaultType, defaultFolderId, isOpen]);

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;

    const newFolder: Folder = {
      id: Date.now().toString(),
      name: newFolderName,
      isDefault: false,
      createdAt: new Date(),
    };

    const updatedFolders = [...folders, newFolder];
    setFolders(updatedFolders);
    localStorage.setItem('folders', JSON.stringify(updatedFolders.filter(f => !f.isDefault)));
    setSelectedFolderId(newFolder.id);
    setNewFolderName('');
    setIsNewFolderDialogOpen(false);
    toast.success('Folder created');
  };

  const handleSave = async () => {
    // Combine date and time
    const [hours, minutes] = createdTime.split(':').map(Number);
    const combinedDateTime = new Date(createdAt);
    combinedDateTime.setHours(hours, minutes, 0, 0);

    // Prepare reminder time if enabled
    let reminderDateTime: Date | undefined = undefined;
    if (reminderEnabled) {
      const [remHours, remMinutes] = reminderTime.split(':').map(Number);
      reminderDateTime = new Date(createdAt);
      reminderDateTime.setHours(remHours, remMinutes, 0, 0);
    }

    const savedNote: Note = {
      id: note?.id || Date.now().toString(),
      type: noteType,
      title,
      content: noteType === 'code' ? '' : content,
      color: noteType === 'sticky' ? color : undefined,
      images: noteType === 'sticky' ? undefined : images,
      voiceRecordings,
      folderId: selectedFolderId || noteType,
      fontFamily: (noteType === 'sticky' || noteType === 'lined' || noteType === 'regular') ? fontFamily : undefined,
      fontSize: (noteType === 'sticky' || noteType === 'lined' || noteType === 'regular') ? fontSize : undefined,
      fontWeight: (noteType === 'sticky' || noteType === 'lined' || noteType === 'regular') ? fontWeight : undefined,
      letterSpacing: (noteType === 'sticky' || noteType === 'lined' || noteType === 'regular') ? letterSpacing : undefined,
      isItalic: (noteType === 'sticky' || noteType === 'lined' || noteType === 'regular') ? isItalic : undefined,
      lineHeight: (noteType === 'sticky' || noteType === 'lined' || noteType === 'regular') ? lineHeight : undefined,
      codeContent: noteType === 'code' ? codeContent : undefined,
      codeLanguage: noteType === 'code' ? codeLanguage : undefined,
      reminderEnabled,
      reminderTime: reminderDateTime,
      reminderRecurring,
      reminderVibration,
      notificationId,
      notificationIds,
      createdAt: note?.createdAt || combinedDateTime,
      updatedAt: new Date(),
    };

    // Handle notification scheduling
    if (reminderEnabled && reminderDateTime) {
      const result = await updateNoteReminder({
        ...savedNote,
        notificationId: notificationId || undefined,
        notificationIds: notificationIds || undefined,
      });

      if (result) {
        if (Array.isArray(result)) {
          savedNote.notificationIds = result;
          savedNote.notificationId = undefined;
        } else {
          savedNote.notificationId = result;
          savedNote.notificationIds = undefined;
        }
        toast.success('Reminder set successfully');
      } else {
        toast.error('Failed to set reminder. Please check the time.');
      }
    } else if (!reminderEnabled && (notificationId || notificationIds)) {
      // Cancel notification(s) if reminder was disabled
      if (notificationIds) {
        await cancelNoteReminder(notificationIds);
      } else if (notificationId) {
        await cancelNoteReminder(notificationId);
      }
      savedNote.notificationId = undefined;
      savedNote.notificationIds = undefined;
      savedNote.reminderTime = undefined;
    }

    onSave(savedNote);
  };

  const handleClose = () => {
    handleSave();
    toast.success('Note saved automatically');
    onClose();
    navigate('/');
  };

  const handleImageAdd = (imageUrl: string) => {
    setImages([...images, imageUrl]);
  };

  const handleRecordingAdd = (recording: VoiceRecording) => {
    setVoiceRecordings([...voiceRecordings, recording]);
  };

  const handleInsertAudioAtCursor = (audioBase64: string, recordingId: string) => {
    // For rich text editors (sticky, lined, regular), insert audio element in content
    // We use a custom data attribute to identify and render with AudioPlayer component
    if (['sticky', 'lined', 'regular'].includes(noteType)) {
      const audioHtml = `<div class="audio-player-container" style="margin: 12px 0;" data-recording-id="${recordingId}" data-audio-src="${audioBase64}"><audio controls src="${audioBase64}" style="width: 100%; height: 54px;"></audio></div><p><br></p>`;
      setContent(prev => prev + audioHtml);
    }
  };

  const handleRecordingDelete = (id: string) => {
    setVoiceRecordings(voiceRecordings.filter(r => r.id !== id));
  };

  const getEditorBackgroundColor = () => {
    if (noteType === 'sticky') {
      return STICKY_COLOR_VALUES[color];
    }
    return 'white';
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn("fixed inset-0 z-50 flex flex-col")}
      style={{ backgroundColor: getEditorBackgroundColor() }}
    >
      {/* Top Header */}
      <div
        className="flex justify-between items-center px-4 py-3 border-b"
        style={{ backgroundColor: getEditorBackgroundColor(), borderColor: 'rgba(0,0,0,0.1)' }}
      >
        <Button variant="ghost" size="icon" onClick={handleClose} className="h-9 w-9">
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" title="Set Date & Time">
                <CalendarIcon className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50" align="end">
              <div className="flex flex-col">
                <Calendar
                  mode="single"
                  selected={createdAt}
                  onSelect={(date) => date && setCreatedAt(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
                <div className="border-t p-3 space-y-3">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Time</Label>
                    <Input
                      type="time"
                      value={createdTime}
                      onChange={(e) => setCreatedTime(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Set Reminder</Label>
                      <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
                    </div>
                    {reminderEnabled && (
                      <div className="mt-3 space-y-3">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Reminder Time</Label>
                          <Input
                            type="time"
                            value={reminderTime}
                            onChange={(e) => setReminderTime(e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Repeat</Label>
                          <select
                            value={reminderRecurring}
                            onChange={(e) => setReminderRecurring(e.target.value as any)}
                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="none">Does not repeat</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">Vibration</Label>
                          <Switch checked={reminderVibration} onCheckedChange={setReminderVibration} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <FolderIcon className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card z-50">
              <div className="px-2 py-1.5 text-sm font-semibold">Move to Folder</div>
              <DropdownMenuSeparator />
              {folders.map((folder) => (
                <DropdownMenuItem
                  key={folder.id}
                  onClick={() => {
                    setSelectedFolderId(folder.id);
                    toast.success(`Moved to ${folder.name}`);
                  }}
                  className={cn(selectedFolderId === folder.id && "bg-accent")}
                >
                  <FolderIcon className="h-4 w-4 mr-2" />
                  {folder.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsNewFolderDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <VoiceRecorder
            recordings={voiceRecordings}
            onRecordingAdd={handleRecordingAdd}
            onRecordingDelete={handleRecordingDelete}
            onInsertAtCursor={handleInsertAudioAtCursor}
          />
        </div>
      </div>

      {/* Sticky note color picker */}
      {noteType === 'sticky' && (
        <div className="px-4 py-2 border-b bg-background">
          <div className="flex items-center gap-2">
            {STICKY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Set sticky color ${c}`}
                onClick={() => setColor(c)}
                className={cn("h-7 w-7 rounded-full border", c === color && "ring-2 ring-ring")}
                style={{ backgroundColor: STICKY_COLOR_VALUES[c] }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Full Page Content Editor */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {noteType === 'code' ? (
          <VirtualizedCodeEditor
            code={codeContent}
            onChange={setCodeContent}
            language={codeLanguage}
            onLanguageChange={setCodeLanguage}
            title={title}
            onTitleChange={setTitle}
            onClose={handleClose}
          />
        ) : noteType === 'mindmap' ? (
          <MindMapEditor
            content={content}
            onChange={setContent}
            title={title}
            onTitleChange={setTitle}
          />
        ) : noteType === 'sketch' ? (
          <SketchEditor content={content} onChange={setContent} />
        ) : (
          <RichTextEditor
            content={content}
            onChange={setContent}
            onImageAdd={handleImageAdd}
            allowImages={true}
            className={noteType === 'lined' ? 'lined-note' : ''}
            toolbarPosition="bottom"
            title={title}
            onTitleChange={setTitle}
            showTitle={true}
            fontFamily={fontFamily}
            onFontFamilyChange={setFontFamily}
            fontSize={fontSize}
            onFontSizeChange={setFontSize}
            fontWeight={fontWeight}
            onFontWeightChange={setFontWeight}
            letterSpacing={letterSpacing}
            onLetterSpacingChange={setLetterSpacing}
            isItalic={isItalic}
            onItalicChange={setIsItalic}
            lineHeight={lineHeight}
            onLineHeightChange={setLineHeight}
          />
        )}
      </div>

      {/* Template Selector */}
      <TemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelectTemplate={(templateContent) => setContent(templateContent)}
      />

      {/* New Folder Dialog */}
      <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
            <Button onClick={handleCreateFolder} className="w-full">
              Create Folder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
