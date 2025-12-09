import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { TodoItem, Folder, Priority, Note, TaskSection } from '@/types/note';
import { WaveformVisualizer } from '@/components/WaveformVisualizer';
import { Play, Pause, Repeat, Check, Trash2 as TrashIcon, Edit, Plus as PlusIcon, ArrowUpCircle, ArrowDownCircle, Move } from 'lucide-react';
import { Plus, FolderIcon, ChevronRight, ChevronDown, MoreVertical, Eye, EyeOff, Filter, Copy, MousePointer2, FolderPlus, Settings, LayoutList, LayoutGrid, Trash2, ListPlus, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TaskInputSheet } from '@/components/TaskInputSheet';
import { TaskDetailPage } from '@/components/TaskDetailPage';
import { TaskItem } from '@/components/TaskItem';
import { TaskFilterSheet, DateFilter, PriorityFilter, StatusFilter } from '@/components/TaskFilterSheet';
import { DuplicateOptionsSheet, DuplicateOption } from '@/components/DuplicateOptionsSheet';
import { FolderManageSheet } from '@/components/FolderManageSheet';
import { MoveToFolderSheet } from '@/components/MoveToFolderSheet';
import { SelectActionsSheet, SelectAction } from '@/components/SelectActionsSheet';
import { PrioritySelectSheet } from '@/components/PrioritySelectSheet';
import { BatchTaskSheet } from '@/components/BatchTaskSheet';
import { SectionEditSheet } from '@/components/SectionEditSheet';
import { SectionMoveSheet } from '@/components/SectionMoveSheet';
import { UnifiedDragDropList } from '@/components/UnifiedDragDropList';
import { SubtaskDetailSheet } from '@/components/SubtaskDetailSheet';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { notificationManager } from '@/utils/notifications';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from '@/components/ui/checkbox';
import { TodoLayout } from './TodoLayout';
import { toast } from 'sonner';
import { isToday, isTomorrow, isThisWeek, isBefore, startOfDay } from 'date-fns';

type ViewMode = 'card' | 'flat';

const defaultSections: TaskSection[] = [
  { id: 'default', name: 'Tasks', color: '#3b82f6', isCollapsed: false, order: 0 }
];

const Today = () => {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [sections, setSections] = useState<TaskSection[]>(defaultSections);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [inputSectionId, setInputSectionId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TodoItem | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isDuplicateSheetOpen, setIsDuplicateSheetOpen] = useState(false);
  const [isFolderManageOpen, setIsFolderManageOpen] = useState(false);
  const [isMoveToFolderOpen, setIsMoveToFolderOpen] = useState(false);
  const [isSelectActionsOpen, setIsSelectActionsOpen] = useState(false);
  const [isPrioritySheetOpen, setIsPrioritySheetOpen] = useState(false);
  const [isBatchTaskOpen, setIsBatchTaskOpen] = useState(false);
  const [isSectionEditOpen, setIsSectionEditOpen] = useState(false);
  const [isSectionMoveOpen, setIsSectionMoveOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<TaskSection | null>(null);
  const [selectedSubtask, setSelectedSubtask] = useState<{ subtask: TodoItem; parentId: string } | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('flat');
  const [hideDetails, setHideDetails] = useState<boolean>(false);
  const [subtaskSwipeState, setSubtaskSwipeState] = useState<{ id: string; parentId: string; x: number; isSwiping: boolean } | null>(null);
  const subtaskTouchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const saved = localStorage.getItem('todoItems');
    if (saved) {
      const parsed = JSON.parse(saved);
      const loadedItems = parsed.map((item: TodoItem) => ({
        ...item,
        dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
        reminderTime: item.reminderTime ? new Date(item.reminderTime) : undefined,
      }));
      setItems(loadedItems);
      notificationManager.rescheduleAllTasks(loadedItems).catch(console.error);
    }

    const savedFolders = localStorage.getItem('todoFolders');
    if (savedFolders) {
      const parsed = JSON.parse(savedFolders);
      setFolders(parsed.map((f: Folder) => ({ ...f, createdAt: new Date(f.createdAt) })));
    }

    const savedSections = localStorage.getItem('todoSections');
    if (savedSections) {
      const parsed = JSON.parse(savedSections);
      setSections(parsed.length > 0 ? parsed : defaultSections);
    }

    const savedShowCompleted = localStorage.getItem('todoShowCompleted');
    if (savedShowCompleted !== null) setShowCompleted(JSON.parse(savedShowCompleted));
    const savedDateFilter = localStorage.getItem('todoDateFilter');
    if (savedDateFilter) setDateFilter(savedDateFilter as DateFilter);
    const savedPriorityFilter = localStorage.getItem('todoPriorityFilter');
    if (savedPriorityFilter) setPriorityFilter(savedPriorityFilter as PriorityFilter);
    const savedStatusFilter = localStorage.getItem('todoStatusFilter');
    if (savedStatusFilter) setStatusFilter(savedStatusFilter as StatusFilter);
    const savedTagFilter = localStorage.getItem('todoTagFilter');
    if (savedTagFilter) setTagFilter(JSON.parse(savedTagFilter));
    const savedViewMode = localStorage.getItem('todoViewMode');
    if (savedViewMode) setViewMode(savedViewMode as ViewMode);
    const savedHideDetails = localStorage.getItem('todoHideDetails');
    if (savedHideDetails !== null) setHideDetails(JSON.parse(savedHideDetails));
  }, []);

  useEffect(() => { localStorage.setItem('todoItems', JSON.stringify(items)); }, [items]);
  useEffect(() => { localStorage.setItem('todoFolders', JSON.stringify(folders)); }, [folders]);
  useEffect(() => { localStorage.setItem('todoSections', JSON.stringify(sections)); }, [sections]);
  useEffect(() => { localStorage.setItem('todoShowCompleted', JSON.stringify(showCompleted)); }, [showCompleted]);
  useEffect(() => { 
    localStorage.setItem('todoDateFilter', dateFilter); 
    localStorage.setItem('todoPriorityFilter', priorityFilter);
    localStorage.setItem('todoStatusFilter', statusFilter);
    localStorage.setItem('todoTagFilter', JSON.stringify(tagFilter));
  }, [dateFilter, priorityFilter, statusFilter, tagFilter]);
  useEffect(() => { localStorage.setItem('todoViewMode', viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem('todoHideDetails', JSON.stringify(hideDetails)); }, [hideDetails]);

  const handleCreateFolder = (name: string, color: string) => {
    const newFolder: Folder = { id: Date.now().toString(), name, color, isDefault: false, createdAt: new Date() };
    setFolders([...folders, newFolder]);
  };

  const handleEditFolder = (folderId: string, name: string, color: string) => {
    setFolders(folders.map(f => f.id === folderId ? { ...f, name, color } : f));
  };

  const handleDeleteFolder = (folderId: string) => {
    setItems(items.map(item => item.folderId === folderId ? { ...item, folderId: undefined } : item));
    setFolders(folders.filter(f => f.id !== folderId));
    if (selectedFolderId === folderId) setSelectedFolderId(null);
  };

  const handleAddTask = async (task: Omit<TodoItem, 'id' | 'completed'>) => {
    const newItem: TodoItem = { 
      id: Date.now().toString(), 
      completed: false, 
      sectionId: inputSectionId || sections[0]?.id,
      ...task 
    };
    if (newItem.reminderTime) {
      try { await notificationManager.scheduleTaskReminder(newItem); } catch (error) { console.error('Failed to schedule notification:', error); }
    }
    setItems([newItem, ...items]);
    setInputSectionId(null);
  };

  const handleBatchAddTasks = (taskTexts: string[], sectionId?: string, folderId?: string, priority?: Priority, dueDate?: Date) => {
    const newItems: TodoItem[] = taskTexts.map((text, idx) => ({
      id: `${Date.now()}-${idx}`,
      text,
      completed: false,
      folderId: folderId || selectedFolderId || undefined,
      sectionId: sectionId || inputSectionId || sections[0]?.id,
      priority: priority,
      dueDate: dueDate,
    }));
    setItems([...newItems, ...items]);
    toast.success(`Added ${newItems.length} task(s)`);
    setInputSectionId(null);
  };

  // Section management functions
  const handleAddSection = (position: 'above' | 'below', referenceId?: string) => {
    const maxOrder = Math.max(...sections.map(s => s.order), 0);
    let newOrder = maxOrder + 1;
    
    if (referenceId) {
      const refSection = sections.find(s => s.id === referenceId);
      if (refSection) {
        if (position === 'above') {
          newOrder = refSection.order - 0.5;
        } else {
          newOrder = refSection.order + 0.5;
        }
      }
    }

    const newSection: TaskSection = {
      id: Date.now().toString(),
      name: 'New Section',
      color: '#3b82f6',
      isCollapsed: false,
      order: newOrder,
    };

    const updatedSections = [...sections, newSection]
      .sort((a, b) => a.order - b.order)
      .map((s, idx) => ({ ...s, order: idx }));

    setSections(updatedSections);
    setEditingSection(newSection);
    setIsSectionEditOpen(true);
    toast.success('Section added');
  };

  const handleEditSection = (section: TaskSection) => {
    setEditingSection(section);
    setIsSectionEditOpen(true);
  };

  const handleSaveSection = (updatedSection: TaskSection) => {
    setSections(sections.map(s => s.id === updatedSection.id ? updatedSection : s));
  };

  const handleDeleteSection = (sectionId: string) => {
    if (sections.length <= 1) {
      toast.error('Cannot delete the last section');
      return;
    }
    // Move tasks to the first remaining section
    const remainingSections = sections.filter(s => s.id !== sectionId);
    const firstSection = remainingSections.sort((a, b) => a.order - b.order)[0];
    setItems(items.map(item => item.sectionId === sectionId ? { ...item, sectionId: firstSection.id } : item));
    setSections(remainingSections);
    toast.success('Section deleted');
  };

  const handleDuplicateSection = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const maxOrder = Math.max(...sections.map(s => s.order), 0);
    const newSection: TaskSection = {
      ...section,
      id: Date.now().toString(),
      name: `${section.name} (Copy)`,
      order: maxOrder + 1,
    };

    // Duplicate tasks in this section
    const sectionTasks = items.filter(i => i.sectionId === sectionId && !i.completed);
    const duplicatedTasks = sectionTasks.map((task, idx) => ({
      ...task,
      id: `${Date.now()}-${idx}`,
      sectionId: newSection.id,
    }));

    setSections([...sections, newSection]);
    setItems([...duplicatedTasks, ...items]);
    toast.success('Section duplicated');
  };

  const handleMoveSection = (sectionId: string, targetIndex: number) => {
    const sortedSections = [...sections].sort((a, b) => a.order - b.order);
    const currentIndex = sortedSections.findIndex(s => s.id === sectionId);
    if (currentIndex === targetIndex) return;

    const [movedSection] = sortedSections.splice(currentIndex, 1);
    sortedSections.splice(targetIndex, 0, movedSection);
    
    const reorderedSections = sortedSections.map((s, idx) => ({ ...s, order: idx }));
    setSections(reorderedSections);
    toast.success('Section moved');
  };

  const handleToggleSectionCollapse = (sectionId: string) => {
    setSections(sections.map(s => s.id === sectionId ? { ...s, isCollapsed: !s.isCollapsed } : s));
  };

  const handleAddTaskToSection = async (sectionId: string) => {
    try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
    setInputSectionId(sectionId);
    setIsInputOpen(true);
  };

  const updateItem = async (itemId: string, updates: Partial<TodoItem>) => {
    setItems(items.map((i) => (i.id === itemId ? { ...i, ...updates } : i)));
  };

  const deleteItem = async (itemId: string, showUndo: boolean = false) => {
    try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch {}
    const deletedItem = items.find(item => item.id === itemId);
    setItems(items.filter((item) => item.id !== itemId));
    
    if (showUndo && deletedItem) {
      toast.success('Task deleted', {
        action: {
          label: 'Undo',
          onClick: () => {
            setItems(prev => [deletedItem, ...prev]);
            toast.success('Task restored');
          }
        },
        duration: 5000,
      });
    }
  };

  // Unified reorder handler for drag-and-drop
  const handleUnifiedReorder = useCallback((updatedItems: TodoItem[]) => {
    setItems(prevItems => {
      // Keep completed items unchanged
      const completedItems = prevItems.filter(item => item.completed);
      return [...updatedItems, ...completedItems];
    });
  }, []);

  // Section reorder handler for drag-and-drop
  const handleSectionReorder = useCallback((updatedSections: TaskSection[]) => {
    setSections(updatedSections);
  }, []);

  // Handle subtask updates
  const handleUpdateSubtaskFromSheet = useCallback((parentId: string, subtaskId: string, updates: Partial<TodoItem>) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id === parentId && item.subtasks) {
        return {
          ...item,
          subtasks: item.subtasks.map(st => st.id === subtaskId ? { ...st, ...updates } : st)
        };
      }
      return item;
    }));
  }, []);

  // Handle subtask deletion
  const handleDeleteSubtaskFromSheet = useCallback((parentId: string, subtaskId: string) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id === parentId && item.subtasks) {
        return {
          ...item,
          subtasks: item.subtasks.filter(st => st.id !== subtaskId)
        };
      }
      return item;
    }));
  }, []);

  // Convert subtask to main task
  const handleConvertSubtaskToTask = useCallback((parentId: string, subtask: TodoItem) => {
    setItems(prevItems => {
      // Remove subtask from parent
      const updatedItems = prevItems.map(item => {
        if (item.id === parentId && item.subtasks) {
          return {
            ...item,
            subtasks: item.subtasks.filter(st => st.id !== subtask.id)
          };
        }
        return item;
      });
      
      // Add as new main task
      const newTask: TodoItem = {
        ...subtask,
        sectionId: prevItems.find(i => i.id === parentId)?.sectionId || sections[0]?.id,
      };
      
      return [newTask, ...updatedItems];
    });
  }, [sections]);

  const duplicateTask = async (task: TodoItem) => {
    try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
    const duplicatedTask: TodoItem = { ...task, id: Date.now().toString(), completed: false, text: `${task.text} (Copy)` };
    setItems([duplicatedTask, ...items]);
  };

  const handleSelectTask = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) newSet.delete(taskId);
      else newSet.add(taskId);
      return newSet;
    });
  };

  const handleDuplicate = (option: DuplicateOption) => {
    const filteredItems = selectedFolderId ? items.filter(i => i.folderId === selectedFolderId) : items;
    let toDuplicate: TodoItem[] = [];

    if (option === 'uncompleted') {
      toDuplicate = filteredItems.filter(i => !i.completed);
    } else {
      toDuplicate = filteredItems;
    }

    const duplicated = toDuplicate.map((item, idx) => ({
      ...item,
      id: `${Date.now()}-${idx}`,
      completed: option === 'all-reset' ? false : item.completed,
      text: `${item.text} (Copy)`
    }));

    setItems([...duplicated, ...items]);
    toast.success(`Duplicated ${duplicated.length} task(s)`);
  };

  const handleSelectAction = (action: SelectAction) => {
    const selectedItems = items.filter(i => selectedTaskIds.has(i.id));
    
    switch (action) {
      case 'move':
        setIsMoveToFolderOpen(true);
        break;
      case 'delete':
        setItems(items.filter(i => !selectedTaskIds.has(i.id)));
        setSelectedTaskIds(new Set());
        setIsSelectionMode(false);
        toast.success(`Deleted ${selectedItems.length} task(s)`);
        break;
      case 'complete':
        setItems(items.map(i => selectedTaskIds.has(i.id) ? { ...i, completed: true } : i));
        setSelectedTaskIds(new Set());
        setIsSelectionMode(false);
        toast.success(`Completed ${selectedItems.length} task(s)`);
        break;
      case 'pin':
        toast.success(`Pinned ${selectedItems.length} task(s)`);
        setSelectedTaskIds(new Set());
        setIsSelectionMode(false);
        break;
      case 'priority':
        setIsPrioritySheetOpen(true);
        break;
      case 'duplicate':
        const duplicated = selectedItems.map((item, idx) => ({
          ...item,
          id: `${Date.now()}-${idx}`,
          completed: false,
          text: `${item.text} (Copy)`
        }));
        setItems([...duplicated, ...items]);
        setSelectedTaskIds(new Set());
        setIsSelectionMode(false);
        toast.success(`Duplicated ${selectedItems.length} task(s)`);
        break;
      case 'convert':
        convertToNotes(selectedItems);
        break;
    }
    setIsSelectActionsOpen(false);
  };

  const handleMoveToFolder = (folderId: string | null) => {
    setItems(items.map(i => selectedTaskIds.has(i.id) ? { ...i, folderId: folderId || undefined } : i));
    setSelectedTaskIds(new Set());
    setIsSelectionMode(false);
    toast.success(`Moved ${selectedTaskIds.size} task(s)`);
  };

  const handleSetPriority = (priority: Priority) => {
    setItems(items.map(i => selectedTaskIds.has(i.id) ? { ...i, priority } : i));
    setSelectedTaskIds(new Set());
    setIsSelectionMode(false);
    toast.success(`Updated priority for ${selectedTaskIds.size} task(s)`);
  };

  const convertToNotes = (tasksToConvert: TodoItem[]) => {
    const existingNotes: Note[] = JSON.parse(localStorage.getItem('notes') || '[]');
    
    const newNotes: Note[] = tasksToConvert.map((task, idx) => ({
      id: `${Date.now()}-${idx}`,
      type: 'regular' as const,
      title: task.text,
      content: task.description || '',
      voiceRecordings: [],
      images: task.imageUrl ? [task.imageUrl] : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    localStorage.setItem('notes', JSON.stringify([...newNotes, ...existingNotes]));
    setItems(items.filter(i => !tasksToConvert.some(t => t.id === i.id)));
    setSelectedTaskIds(new Set());
    setIsSelectionMode(false);
    toast.success(`Converted ${tasksToConvert.length} task(s) to notes`);
  };

  const handleConvertSingleTask = (task: TodoItem) => {
    convertToNotes([task]);
  };

  const handleMoveTaskToFolder = (taskId: string, folderId: string | null) => {
    setItems(items.map(i => i.id === taskId ? { ...i, folderId: folderId || undefined } : i));
    toast.success('Task moved');
  };

  const processedItems = useMemo(() => {
    let filtered = items.filter(item => {
      // Folder filter
      const folderMatch = selectedFolderId ? item.folderId === selectedFolderId : true;
      
      // Priority filter
      const priorityMatch = priorityFilter === 'all' ? true : item.priority === priorityFilter;
      
      // Status filter
      let statusMatch = true;
      if (statusFilter === 'completed') statusMatch = item.completed;
      else if (statusFilter === 'uncompleted') statusMatch = !item.completed;
      
      // Date filter
      let dateMatch = true;
      if (dateFilter !== 'all') {
        const today = startOfDay(new Date());
        const itemDate = item.dueDate ? new Date(item.dueDate) : null;
        
        switch (dateFilter) {
          case 'today':
            dateMatch = itemDate ? isToday(itemDate) : false;
            break;
          case 'tomorrow':
            dateMatch = itemDate ? isTomorrow(itemDate) : false;
            break;
          case 'this-week':
            dateMatch = itemDate ? isThisWeek(itemDate) : false;
            break;
          case 'overdue':
            dateMatch = itemDate ? isBefore(itemDate, today) && !item.completed : false;
            break;
          case 'has-date':
            dateMatch = !!itemDate;
            break;
          case 'no-date':
            dateMatch = !itemDate;
            break;
        }
      }

      // Tag filter
      let tagMatch = true;
      if (tagFilter.length > 0) {
        const itemTags = item.coloredTags?.map(t => t.name) || [];
        tagMatch = tagFilter.some(tag => itemTags.includes(tag));
      }
      
      return folderMatch && priorityMatch && statusMatch && dateMatch && tagMatch;
    });

    // Sort by date (tasks with dates first, then by date)
    filtered = [...filtered].sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return dateA - dateB;
    });

    return filtered;
  }, [items, selectedFolderId, priorityFilter, statusFilter, dateFilter, tagFilter]);

  const uncompletedItems = processedItems.filter(item => !item.completed);
  const completedItems = processedItems.filter(item => item.completed);

  const handleClearFilters = () => {
    setSelectedFolderId(null);
    setDateFilter('all');
    setPriorityFilter('all');
    setStatusFilter('all');
    setTagFilter([]);
  };

  const getPriorityBorderColor = (priority?: Priority) => {
    switch (priority) {
      case 'high': return 'border-red-500';
      case 'medium': return 'border-orange-500';
      case 'low': return 'border-green-500';
      default: return 'border-primary';
    }
  };

  // Voice playback state for flat view
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const flatAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Swipe state for flat view
  const [swipeState, setSwipeState] = useState<{ id: string; x: number; isSwiping: boolean } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const SWIPE_THRESHOLD = 80;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFlatVoicePlay = (item: TodoItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.voiceRecording) return;

    if (playingVoiceId === item.id && flatAudioRef.current) {
      flatAudioRef.current.pause();
      flatAudioRef.current = null;
      setPlayingVoiceId(null);
      return;
    }

    if (flatAudioRef.current) {
      flatAudioRef.current.pause();
      flatAudioRef.current = null;
    }

    const audio = new Audio(item.voiceRecording.audioUrl);
    flatAudioRef.current = audio;
    audio.onended = () => {
      setPlayingVoiceId(null);
      flatAudioRef.current = null;
    };
    audio.play();
    setPlayingVoiceId(item.id);
  };

  const handleFlatTouchStart = (itemId: string, e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setSwipeState({ id: itemId, x: 0, isSwiping: false });
  };

  const handleFlatTouchMove = (itemId: string, e: React.TouchEvent) => {
    if (!swipeState || swipeState.id !== itemId) return;
    const deltaX = e.touches[0].clientX - touchStartRef.current.x;
    const deltaY = Math.abs(e.touches[0].clientY - touchStartRef.current.y);
    
    if (deltaY < 30) {
      const clampedX = Math.max(-120, Math.min(120, deltaX));
      setSwipeState({ id: itemId, x: clampedX, isSwiping: true });
    }
  };

  const handleFlatTouchEnd = async (item: TodoItem) => {
    if (!swipeState || swipeState.id !== item.id) return;
    
    if (swipeState.x < -SWIPE_THRESHOLD) {
      try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch {}
      deleteItem(item.id, true);
    } else if (swipeState.x > SWIPE_THRESHOLD) {
      try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch {}
      updateItem(item.id, { completed: !item.completed });
    }
    setSwipeState(null);
  };

  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const toggleSubtasks = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const updateSubtask = async (parentId: string, subtaskId: string, updates: Partial<TodoItem>) => {
    setItems(items.map(item => {
      if (item.id === parentId && item.subtasks) {
        return {
          ...item,
          subtasks: item.subtasks.map(st => st.id === subtaskId ? { ...st, ...updates } : st)
        };
      }
      return item;
    }));
  };

  const deleteSubtask = (parentId: string, subtaskId: string, showUndo: boolean = false) => {
    let deletedSubtask: TodoItem | null = null;
    
    setItems(items.map(item => {
      if (item.id === parentId && item.subtasks) {
        deletedSubtask = item.subtasks.find(st => st.id === subtaskId) || null;
        return {
          ...item,
          subtasks: item.subtasks.filter(st => st.id !== subtaskId)
        };
      }
      return item;
    }));

    if (showUndo && deletedSubtask) {
      const subtaskToRestore = deletedSubtask;
      toast.success('Subtask deleted', {
        action: {
          label: 'Undo',
          onClick: () => {
            setItems(prev => prev.map(item => {
              if (item.id === parentId) {
                return {
                  ...item,
                  subtasks: [...(item.subtasks || []), subtaskToRestore]
                };
              }
              return item;
            }));
            toast.success('Subtask restored');
          }
        },
        duration: 5000,
      });
    }
  };

  const handleSubtaskSwipeStart = (subtaskId: string, parentId: string, e: React.TouchEvent) => {
    subtaskTouchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setSubtaskSwipeState({ id: subtaskId, parentId, x: 0, isSwiping: false });
  };

  const handleSubtaskSwipeMove = (subtaskId: string, parentId: string, e: React.TouchEvent) => {
    if (!subtaskSwipeState || subtaskSwipeState.id !== subtaskId) return;
    const deltaX = e.touches[0].clientX - subtaskTouchStartRef.current.x;
    const deltaY = Math.abs(e.touches[0].clientY - subtaskTouchStartRef.current.y);
    
    if (deltaY < 30) {
      const clampedX = Math.max(-120, Math.min(120, deltaX));
      setSubtaskSwipeState({ id: subtaskId, parentId, x: clampedX, isSwiping: true });
    }
  };

  const handleSubtaskSwipeEnd = async (subtask: TodoItem, parentId: string) => {
    if (!subtaskSwipeState || subtaskSwipeState.id !== subtask.id) return;
    
    if (subtaskSwipeState.x < -SWIPE_THRESHOLD) {
      try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch {}
      deleteSubtask(parentId, subtask.id, true);
    } else if (subtaskSwipeState.x > SWIPE_THRESHOLD) {
      try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch {}
      updateSubtask(parentId, subtask.id, { completed: !subtask.completed });
    }
    setSubtaskSwipeState(null);
  };

  const renderTaskItem = (item: TodoItem) => {
    const hasSubtasks = item.subtasks && item.subtasks.length > 0;
    const currentSwipe = swipeState?.id === item.id ? swipeState : null;
    const isExpanded = expandedTasks.has(item.id);
    const completedSubtasks = item.subtasks?.filter(st => st.completed).length || 0;
    const totalSubtasks = item.subtasks?.length || 0;
    
    return viewMode === 'flat' ? (
      <div key={item.id} className="relative">
        <div className="relative overflow-hidden">
          {/* Swipe action backgrounds - only show relevant color based on direction */}
          {currentSwipe && currentSwipe.isSwiping && (
            <div className="absolute inset-0 flex">
              {currentSwipe.x > 0 && (
                <div className={cn(
                  "absolute inset-0 flex items-center justify-start pl-4 transition-colors",
                  currentSwipe.x > SWIPE_THRESHOLD ? "bg-green-500" : "bg-green-500/70"
                )}>
                  <Check className="h-5 w-5 text-white" />
                </div>
              )}
              {currentSwipe.x < 0 && (
                <div className={cn(
                  "absolute inset-0 flex items-center justify-end pr-4 transition-colors",
                  currentSwipe.x < -SWIPE_THRESHOLD ? "bg-red-500" : "bg-red-500/70"
                )}>
                  <TrashIcon className="h-5 w-5 text-white" />
                </div>
              )}
            </div>
          )}
          
          {/* Main flat item */}
          <div 
            className="flex items-start gap-3 py-2.5 px-2 border-b border-border/50 bg-background"
            style={{ 
              transform: `translateX(${currentSwipe?.x || 0}px)`, 
              transition: currentSwipe?.isSwiping ? 'none' : 'transform 0.3s ease-out' 
            }}
            onTouchStart={(e) => handleFlatTouchStart(item.id, e)}
            onTouchMove={(e) => handleFlatTouchMove(item.id, e)}
            onTouchEnd={() => handleFlatTouchEnd(item)}
          >
          {isSelectionMode && (
              <Checkbox checked={selectedTaskIds.has(item.id)} onCheckedChange={() => handleSelectTask(item.id)} className="h-5 w-5 mt-0.5" />
            )}
            
            <Checkbox
              checked={item.completed}
              onCheckedChange={async (checked) => {
                updateItem(item.id, { completed: !!checked });
                if (checked && !item.completed) {
                  try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch {}
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "h-5 w-5 rounded-sm border-0 mt-0.5 flex-shrink-0",
                item.completed 
                  ? "bg-muted-foreground/30 data-[state=checked]:bg-muted-foreground/30 data-[state=checked]:text-white" 
                  : cn("border-2", getPriorityBorderColor(item.priority))
              )}
            />
            <div className="flex-1 min-w-0" onClick={() => !currentSwipe?.isSwiping && setSelectedTask(item)}>
              {/* Show voice player OR text based on whether it's a voice task */}
              {item.voiceRecording ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleFlatVoicePlay(item, e)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    {playingVoiceId === item.id ? (
                      <Pause className="h-4 w-4 text-primary flex-shrink-0" />
                    ) : (
                      <Play className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                    <WaveformVisualizer 
                      isActive={playingVoiceId === item.id} 
                      barCount={16}
                      color="hsl(var(--primary))"
                      className="h-5 w-20"
                    />
                    <span className="text-xs text-primary font-medium">
                      {formatDuration(item.voiceRecording.duration)}
                    </span>
                  </button>
                  {item.repeatType && item.repeatType !== 'none' && <Repeat className="h-3 w-3 text-purple-500 flex-shrink-0" />}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm", item.completed && "text-muted-foreground")}>{item.text}</span>
                  {item.repeatType && item.repeatType !== 'none' && <Repeat className="h-3 w-3 text-purple-500 flex-shrink-0" />}
                </div>
              )}
              {/* Tags display - hidden when hideDetails is true */}
              {!hideDetails && item.coloredTags && item.coloredTags.length > 0 && (
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {item.coloredTags.slice(0, 4).map((tag) => (
                    <span 
                      key={tag.name}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded-full"
                      style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {tag.name}
                    </span>
                  ))}
                  {item.coloredTags.length > 4 && (
                    <span className="text-[10px] text-muted-foreground">+{item.coloredTags.length - 4}</span>
                  )}
                </div>
              )}
              {/* Date display - hidden when hideDetails is true */}
              {!hideDetails && item.dueDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(item.dueDate).toLocaleDateString()}
                </p>
              )}
              {/* Subtasks indicator - always visible */}
              {hasSubtasks && !isExpanded && (
                <p className="text-xs text-muted-foreground mt-1">
                  {completedSubtasks}/{totalSubtasks} subtasks
                </p>
              )}
            </div>
            {/* Image display */}
            {item.imageUrl && (
              <div
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-border flex-shrink-0 cursor-pointer hover:border-primary transition-colors"
                onClick={(e) => { e.stopPropagation(); setSelectedImage(item.imageUrl!); }}
              >
                <img src={item.imageUrl} alt="Task attachment" className="w-full h-full object-cover" />
              </div>
            )}
            {/* Expand/Collapse button for subtasks - always visible */}
            {hasSubtasks && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleSubtasks(item.id); }}
                className="mt-0.5 p-1 rounded hover:bg-muted transition-colors flex-shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            )}
          </div>
        </div>
        {/* Subtasks are rendered by UnifiedDragDropList - not here to avoid duplicates */}
      </div>
    ) : (
      <TaskItem key={item.id} item={item} onUpdate={updateItem} onDelete={deleteItem} onTaskClick={setSelectedTask} onImageClick={setSelectedImage} isSelected={selectedTaskIds.has(item.id)} isSelectionMode={isSelectionMode} onSelect={handleSelectTask} expandedTasks={expandedTasks} onToggleSubtasks={toggleSubtasks} onUpdateSubtask={updateSubtask} />
    );
  };

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  const renderSectionHeader = (section: TaskSection, isDragging: boolean = false) => {
    const sectionTasks = uncompletedItems.filter(item => item.sectionId === section.id || (!item.sectionId && section.id === sections[0]?.id));
    
    return (
      <div 
        className={cn(
          "flex items-center",
          isDragging && "opacity-90 scale-[1.02] shadow-xl bg-card rounded-t-xl"
        )} 
        style={{ borderLeft: `4px solid ${section.color}` }}
      >
        <div className="flex-1 flex items-center gap-3 px-3 py-2.5 bg-muted/30">
          <span className="text-sm font-semibold">{section.name}</span>
          <span className="text-xs text-muted-foreground">({sectionTasks.length})</span>
        </div>
        
        {/* Collapse button */}
        <button
          onClick={() => handleToggleSectionCollapse(section.id)}
          className="p-2 hover:bg-muted/50 transition-colors"
        >
          {section.isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Options menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 hover:bg-muted/50 transition-colors">
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover border shadow-lg z-50">
            <DropdownMenuItem onClick={() => handleEditSection(section)} className="cursor-pointer">
              <Edit className="h-4 w-4 mr-2" />Edit Section
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddTaskToSection(section.id)} className="cursor-pointer">
              <PlusIcon className="h-4 w-4 mr-2" />Add Task
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAddSection('above', section.id)} className="cursor-pointer">
              <ArrowUpCircle className="h-4 w-4 mr-2" />Add Section Above
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddSection('below', section.id)} className="cursor-pointer">
              <ArrowDownCircle className="h-4 w-4 mr-2" />Add Section Below
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDuplicateSection(section.id)} className="cursor-pointer">
              <Copy className="h-4 w-4 mr-2" />Duplicate Section
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setEditingSection(section); setIsSectionMoveOpen(true); }} className="cursor-pointer">
              <Move className="h-4 w-4 mr-2" />Move to
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => handleDeleteSection(section.id)} 
              className="cursor-pointer text-destructive focus:text-destructive"
              disabled={sections.length <= 1}
            >
              <Trash2 className="h-4 w-4 mr-2" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const handleSubtaskClick = (subtask: TodoItem, parentId?: string) => {
    if (parentId) {
      setSelectedSubtask({ subtask, parentId });
    } else {
      setSelectedTask(subtask);
    }
  };

  return (
    <TodoLayout title="Npd">
      <main className="container mx-auto px-4 py-3 pb-32">
        <div className="max-w-2xl mx-auto">
          {/* Folders */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2"><FolderIcon className="h-5 w-5" />Folders</h2>
              <div className="flex items-center gap-2">
                {isSelectionMode && (
                  <Button variant="default" size="sm" onClick={() => { setIsSelectionMode(false); setSelectedTaskIds(new Set()); }}>
                    Cancel
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-popover border shadow-lg z-50">
                    <DropdownMenuItem onClick={() => setShowCompleted(!showCompleted)} className="cursor-pointer">
                      {showCompleted ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                      {showCompleted ? 'Hide Completed' : 'Show Completed'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setHideDetails(!hideDetails)} className="cursor-pointer">
                      {hideDetails ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                      {hideDetails ? 'Show Details' : 'Hide Details'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsFilterSheetOpen(true)} className="cursor-pointer">
                      <Filter className="h-4 w-4 mr-2" />Filter
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsDuplicateSheetOpen(true)} className="cursor-pointer">
                      <Copy className="h-4 w-4 mr-2" />Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsBatchTaskOpen(true)} className="cursor-pointer">
                      <ListPlus className="h-4 w-4 mr-2" />Add Multiple Tasks
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleAddSection('below')} className="cursor-pointer">
                      <PlusIcon className="h-4 w-4 mr-2" />Sections
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsFolderManageOpen(true)} className="cursor-pointer">
                      <FolderIcon className="h-4 w-4 mr-2" />Folders
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { setIsSelectionMode(true); setIsSelectActionsOpen(true); }} className="cursor-pointer">
                      <MousePointer2 className="h-4 w-4 mr-2" />Select
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setViewMode(viewMode === 'card' ? 'flat' : 'card')} className="cursor-pointer">
                      {viewMode === 'card' ? <LayoutList className="h-4 w-4 mr-2" /> : <LayoutGrid className="h-4 w-4 mr-2" />}
                      {viewMode === 'card' ? 'Flat Layout' : 'Card Layout'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button onClick={() => setSelectedFolderId(null)} className={cn("flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all whitespace-nowrap", !selectedFolderId ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted border-border")}>
                <FolderIcon className="h-4 w-4" />All Tasks
              </button>
              {folders.map((folder) => (
                <button key={folder.id} onClick={() => setSelectedFolderId(folder.id)} className="flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all whitespace-nowrap" style={{ backgroundColor: selectedFolderId === folder.id ? folder.color : 'transparent', color: selectedFolderId === folder.id ? 'white' : 'inherit', borderColor: folder.color }}>
                  {folder.name}
                </button>
              ))}
            </div>
          </div>

          {/* Bulk Actions */}
          {isSelectionMode && selectedTaskIds.size > 0 && (
            <div className="fixed bottom-20 left-4 right-4 z-40 bg-card border rounded-lg shadow-lg p-4">
              <p className="text-sm mb-3 font-medium">{selectedTaskIds.size} task(s) selected</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsSelectActionsOpen(true)}>Actions</Button>
                <Button variant="outline" size="sm" onClick={() => { setItems(items.filter(i => !selectedTaskIds.has(i.id))); setSelectedTaskIds(new Set()); setIsSelectionMode(false); }}>
                  <Trash2 className="h-4 w-4 mr-2" />Delete
                </Button>
              </div>
            </div>
          )}

          {/* Tasks by Sections */}
          {processedItems.length === 0 ? (
            <div className="text-center py-20"><p className="text-muted-foreground">No tasks yet. Tap "Add Task" to get started!</p></div>
          ) : (
            <div className="space-y-4">
              {/* Render sections with unified drag-drop */}
              <UnifiedDragDropList
                sections={sortedSections}
                items={uncompletedItems}
                onReorder={handleUnifiedReorder}
                onSectionReorder={handleSectionReorder}
                onTaskClick={handleSubtaskClick}
                expandedTasks={expandedTasks}
                renderSectionHeader={renderSectionHeader}
                selectedFolderId={selectedFolderId}
                renderEmptySection={(section) => (
                  <div className="py-4 px-4 text-center text-sm text-muted-foreground">
                    No tasks in this section
                  </div>
                )}
                renderTask={(item, isDragging, isDropTarget) => (
                  <div className={cn(isDragging && "bg-card rounded-lg")}>
                    {renderTaskItem(item)}
                  </div>
                )}
                renderSubtask={(subtask, parentId, isDragging) => {
                  const currentSubtaskSwipe = subtaskSwipeState?.id === subtask.id ? subtaskSwipeState : null;
                  
                  return (
                    <div className="relative overflow-hidden">
                      {/* Swipe action backgrounds - only show relevant color based on direction */}
                      {currentSubtaskSwipe && currentSubtaskSwipe.isSwiping && (
                        <div className="absolute inset-0 flex">
                          {currentSubtaskSwipe.x > 0 && (
                            <div className={cn(
                              "absolute inset-0 flex items-center justify-start pl-4 transition-colors",
                              currentSubtaskSwipe.x > SWIPE_THRESHOLD ? "bg-green-500" : "bg-green-500/70"
                            )}>
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                          {currentSubtaskSwipe.x < 0 && (
                            <div className={cn(
                              "absolute inset-0 flex items-center justify-end pr-4 transition-colors",
                              currentSubtaskSwipe.x < -SWIPE_THRESHOLD ? "bg-red-500" : "bg-red-500/70"
                            )}>
                              <TrashIcon className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Subtask content */}
                      <div 
                        className={cn(
                          "flex items-start gap-3 py-2 px-3 border-b border-border/30 last:border-b-0 cursor-pointer bg-muted/10 transition-colors",
                          isDragging && "bg-card shadow-lg"
                        )}
                        style={{ 
                          transform: `translateX(${currentSubtaskSwipe?.x || 0}px)`, 
                          transition: currentSubtaskSwipe?.isSwiping ? 'none' : 'transform 0.3s ease-out' 
                        }}
                        onClick={() => !currentSubtaskSwipe?.isSwiping && setSelectedSubtask({ subtask, parentId })}
                        onTouchStart={(e) => handleSubtaskSwipeStart(subtask.id, parentId, e)}
                        onTouchMove={(e) => handleSubtaskSwipeMove(subtask.id, parentId, e)}
                        onTouchEnd={() => handleSubtaskSwipeEnd(subtask, parentId)}
                      >
                        <Checkbox
                          checked={subtask.completed}
                          onCheckedChange={async (checked) => {
                            updateSubtask(parentId, subtask.id, { completed: !!checked });
                            if (checked) try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "h-4 w-4 rounded-sm mt-0.5 flex-shrink-0",
                            subtask.completed ? "bg-muted-foreground/30 border-0" : "border-2 border-muted-foreground/40"
                          )}
                        />
                        <span className={cn("text-sm flex-1", subtask.completed && "text-muted-foreground")}>
                          {subtask.text}
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
              {/* Completed Section */}
              {showCompleted && completedItems.length > 0 && (
                <Collapsible open={isCompletedOpen} onOpenChange={setIsCompletedOpen}>
                  <div className="bg-muted/50 rounded-xl p-3 border border-border/30">
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center justify-between px-2 py-2 hover:bg-muted/60 rounded-lg transition-colors">
                        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">COMPLETED</span>
                        <div className="flex items-center gap-2 text-muted-foreground"><span className="text-sm font-medium">{completedItems.length}</span>{isCompletedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2">{completedItems.map(renderTaskItem)}</CollapsibleContent>
                  </div>
                </Collapsible>
              )}
            </div>
          )}
        </div>
      </main>

      <Button onClick={() => { Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}); setIsInputOpen(true); }} className="fixed bottom-20 left-4 right-4 z-30 h-12 text-base font-semibold" size="lg">
        <Plus className="h-5 w-5" />Add Task
      </Button>

      <TaskInputSheet isOpen={isInputOpen} onClose={() => { setIsInputOpen(false); setInputSectionId(null); }} onAddTask={handleAddTask} folders={folders} selectedFolderId={selectedFolderId} onCreateFolder={handleCreateFolder} sections={sections} selectedSectionId={inputSectionId} />
      <TaskDetailPage 
        isOpen={!!selectedTask} 
        task={selectedTask} 
        folders={folders}
        onClose={() => setSelectedTask(null)} 
        onUpdate={(updatedTask) => { updateItem(updatedTask.id, updatedTask); setSelectedTask(updatedTask); }} 
        onDelete={deleteItem} 
        onDuplicate={duplicateTask}
        onConvertToNote={handleConvertSingleTask}
        onMoveToFolder={handleMoveTaskToFolder}
      />
      <TaskFilterSheet isOpen={isFilterSheetOpen} onClose={() => setIsFilterSheetOpen(false)} folders={folders} selectedFolderId={selectedFolderId} onFolderChange={setSelectedFolderId} dateFilter={dateFilter} onDateFilterChange={setDateFilter} priorityFilter={priorityFilter} onPriorityFilterChange={setPriorityFilter} statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} selectedTags={tagFilter} onTagsChange={setTagFilter} onClearAll={handleClearFilters} />
      <DuplicateOptionsSheet isOpen={isDuplicateSheetOpen} onClose={() => setIsDuplicateSheetOpen(false)} onSelect={handleDuplicate} />
      <FolderManageSheet isOpen={isFolderManageOpen} onClose={() => setIsFolderManageOpen(false)} folders={folders} onCreateFolder={handleCreateFolder} onEditFolder={handleEditFolder} onDeleteFolder={handleDeleteFolder} />
      <MoveToFolderSheet isOpen={isMoveToFolderOpen} onClose={() => setIsMoveToFolderOpen(false)} folders={folders} onSelect={handleMoveToFolder} />
      <SelectActionsSheet isOpen={isSelectActionsOpen} onClose={() => setIsSelectActionsOpen(false)} selectedCount={selectedTaskIds.size} onAction={handleSelectAction} />
      <PrioritySelectSheet isOpen={isPrioritySheetOpen} onClose={() => setIsPrioritySheetOpen(false)} onSelect={handleSetPriority} />
      <BatchTaskSheet isOpen={isBatchTaskOpen} onClose={() => setIsBatchTaskOpen(false)} onAddTasks={handleBatchAddTasks} sections={sections} folders={folders} />
      <SectionEditSheet 
        isOpen={isSectionEditOpen} 
        onClose={() => { setIsSectionEditOpen(false); setEditingSection(null); }} 
        section={editingSection} 
        onSave={handleSaveSection} 
      />
      <SectionMoveSheet 
        isOpen={isSectionMoveOpen} 
        onClose={() => { setIsSectionMoveOpen(false); setEditingSection(null); }} 
        sections={sections} 
        currentSectionId={editingSection?.id || ''} 
        onMoveToPosition={(targetIndex) => editingSection && handleMoveSection(editingSection.id, targetIndex)} 
      />
      <SubtaskDetailSheet
        isOpen={!!selectedSubtask}
        subtask={selectedSubtask?.subtask || null}
        parentId={selectedSubtask?.parentId || null}
        onClose={() => setSelectedSubtask(null)}
        onUpdate={handleUpdateSubtaskFromSheet}
        onDelete={handleDeleteSubtaskFromSheet}
        onConvertToTask={handleConvertSubtaskToTask}
      />

      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Task Image</DialogTitle></DialogHeader>
          <div className="flex items-center justify-center"><img src={selectedImage || ''} alt="Task attachment" className="max-w-full max-h-[70vh] object-contain rounded-lg" /></div>
        </DialogContent>
      </Dialog>
    </TodoLayout>
  );
};

export default Today;
