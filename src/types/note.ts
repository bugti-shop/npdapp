export type NoteType = 'sticky' | 'lined' | 'regular' | 'sketch' | 'code' | 'mindmap';

export type Priority = 'high' | 'medium' | 'low' | 'none';
export type RepeatType = 'none' | 'daily' | 'weekly' | 'weekdays' | 'weekends' | 'monthly' | 'custom';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export interface ColoredTag {
  name: string;
  color: string;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority?: Priority;
  dueDate?: Date;
  reminderTime?: Date;
  repeatType?: RepeatType;
  repeatDays?: number[];
  tags?: string[];
  coloredTags?: ColoredTag[];
  folderId?: string;
  sectionId?: string;
  imageUrl?: string;
  description?: string;
  location?: string;
  subtasks?: TodoItem[];
  categoryId?: string;
  googleCalendarEventId?: string;
  notificationIds?: number[];
  voiceRecording?: VoiceRecording;
}

export interface TaskTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  taskText: string;
  priority?: Priority;
  categoryId?: string;
  subtasks?: string[];
}

export interface TaskSection {
  id: string;
  name: string;
  color: string;
  isCollapsed: boolean;
  order: number;
}

export interface CornellSection {
  id: string;
  title: string;
  content: string;
  color: string;
}

export type StickyColor = 'yellow' | 'blue' | 'green' | 'pink' | 'orange';

export interface VoiceRecording {
  id: string;
  audioUrl: string;
  duration: number;
  timestamp: Date;
}

export interface Note {
  id: string;
  type: NoteType;
  title: string;
  content: string;
  color?: StickyColor;
  images?: string[];
  voiceRecordings: VoiceRecording[];
  folderId?: string;
  todoItems?: TodoItem[];
  todoSections?: TaskSection[];
  todoName?: string;
  todoDate?: string;
  todoNotes?: string;
  cornellSections?: CornellSection[];
  meetingTitle?: string;
  meetingDate?: string;
  meetingTime?: string;
  meetingLocation?: string;
  isPinned?: boolean;
  pinnedOrder?: number;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  letterSpacing?: string;
  isItalic?: boolean;
  lineHeight?: string;
  reminderEnabled?: boolean;
  reminderTime?: Date;
  reminderRecurring?: 'none' | 'daily' | 'weekly' | 'monthly';
  reminderSound?: string;
  reminderVibration?: boolean;
  notificationId?: number;
  notificationIds?: number[];
  codeContent?: string;
  codeLanguage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Folder {
  id: string;
  name: string;
  noteType?: NoteType;
  isDefault: boolean;
  createdAt: Date;
  color?: string;
}
