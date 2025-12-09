import { useState, useEffect } from 'react';
import { NotesCalendarView } from '@/components/NotesCalendarView';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskInputSheet } from '@/components/TaskInputSheet';
import { TodoItem, Folder } from '@/types/note';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskItem } from '@/components/TaskItem';
import { TaskDetailSheet } from '@/components/TaskDetailSheet';
import { isSameDay } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TodoLayout } from './TodoLayout';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, isGoogleCalendarEnabled } from '@/utils/googleCalendar';
import { toast } from 'sonner';

const TodoCalendar = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [items, setItems] = useState<TodoItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [taskDates, setTaskDates] = useState<Date[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedTask, setSelectedTask] = useState<TodoItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    const loadTasks = () => {
      const saved = localStorage.getItem('todoItems');
      const savedFolders = localStorage.getItem('todoFolders');

      if (saved) {
        const tasks: TodoItem[] = JSON.parse(saved).map((t: any) => ({
          ...t,
          dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
          reminderTime: t.reminderTime ? new Date(t.reminderTime) : undefined,
        }));
        setItems(tasks);

        let filteredTasks = tasks;
        if (filterType === 'pending') filteredTasks = tasks.filter(task => !task.completed);
        else if (filterType === 'completed') filteredTasks = tasks.filter(task => task.completed);

        const dates = filteredTasks.filter(task => task.dueDate).map(task => new Date(task.dueDate!));
        setTaskDates(dates);
      }

      if (savedFolders) setFolders(JSON.parse(savedFolders));
    };

    loadTasks();
    const handleTasksUpdate = () => loadTasks();
    window.addEventListener('tasksUpdated', handleTasksUpdate);
    return () => window.removeEventListener('tasksUpdated', handleTasksUpdate);
  }, [filterType]);

  const handleAddTask = async (task: Omit<TodoItem, 'id' | 'completed'>) => {
    const newItem: TodoItem = { id: Date.now().toString(), completed: false, ...task };
    
    // Sync to Google Calendar if enabled
    if (await isGoogleCalendarEnabled() && newItem.dueDate) {
      const eventId = await createCalendarEvent(newItem);
      if (eventId) {
        newItem.googleCalendarEventId = eventId;
        toast.success('Task synced to Google Calendar');
      }
    }
    
    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    const saved = localStorage.getItem('todoItems');
    const existing = saved ? JSON.parse(saved) : [];
    localStorage.setItem('todoItems', JSON.stringify([...existing, newItem]));
    setTaskDates(updatedItems.filter(t => t.dueDate).map(t => new Date(t.dueDate!)));
    window.dispatchEvent(new Event('tasksUpdated'));
  };

  const handleCreateFolder = (name: string, color: string) => {
    const newFolder: Folder = { id: Date.now().toString(), name, color, isDefault: false, createdAt: new Date() };
    const updatedFolders = [...folders, newFolder];
    setFolders(updatedFolders);
    localStorage.setItem('todoFolders', JSON.stringify(updatedFolders));
  };

  const handleUpdateTask = async (itemId: string, updates: Partial<TodoItem>) => {
    const updatedItems = items.map(task => {
      if (task.id === itemId) {
        const updatedTask = { ...task, ...updates };
        
        // Sync to Google Calendar if enabled
        if (updatedTask.googleCalendarEventId && updatedTask.dueDate) {
          isGoogleCalendarEnabled().then(enabled => {
            if (enabled) {
              updateCalendarEvent(updatedTask.googleCalendarEventId!, updatedTask);
            }
          });
        }
        
        return updatedTask;
      }
      return task;
    });
    setItems(updatedItems);
    localStorage.setItem('todoItems', JSON.stringify(updatedItems));
    window.dispatchEvent(new Event('tasksUpdated'));
  };

  const handleDeleteTask = async (itemId: string) => {
    // Find task and sync deletion to Google Calendar
    const taskToDelete = items.find(t => t.id === itemId);
    if (taskToDelete?.googleCalendarEventId) {
      const enabled = await isGoogleCalendarEnabled();
      if (enabled) {
        await deleteCalendarEvent(taskToDelete.googleCalendarEventId);
      }
    }
    
    const updatedItems = items.filter(task => task.id !== itemId);
    setItems(updatedItems);
    localStorage.setItem('todoItems', JSON.stringify(updatedItems));
    window.dispatchEvent(new Event('tasksUpdated'));
  };

  const handleTaskClick = (task: TodoItem) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const handleImageClick = (imageUrl: string) => window.open(imageUrl, '_blank');

  const tasksForSelectedDate = date
    ? items.filter(task => {
        if (task.dueDate) {
          const matches = isSameDay(new Date(task.dueDate), date);
          if (filterType === 'pending') return matches && !task.completed;
          if (filterType === 'completed') return matches && task.completed;
          return matches;
        }
        return false;
      })
    : [];

  return (
    <TodoLayout title="Calendar">
      <main className="container mx-auto px-4 py-6 pb-32">
        <div className="max-w-md mx-auto space-y-6">
          <Tabs value={filterType} onValueChange={(value) => setFilterType(value as 'all' | 'pending' | 'completed')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>

          <NotesCalendarView selectedDate={date} onDateSelect={setDate} highlightedDates={taskDates} />

          {date && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Tasks for {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</h3>
              {tasksForSelectedDate.length > 0 ? (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-4">
                    {tasksForSelectedDate.map((task) => (
                      <TaskItem key={task.id} item={task} onUpdate={handleUpdateTask} onDelete={handleDeleteTask} onTaskClick={handleTaskClick} onImageClick={handleImageClick} />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-muted-foreground text-center py-8">No {filterType !== 'all' ? filterType : ''} tasks for this date</p>
              )}
            </div>
          )}
        </div>
      </main>

      <Button onClick={() => setIsInputOpen(true)} className="fixed bottom-20 left-4 right-4 z-30 h-12 text-base font-semibold" size="lg">
        <Plus className="h-5 w-5" />Add Task
      </Button>

      <TaskInputSheet isOpen={isInputOpen} onClose={() => setIsInputOpen(false)} onAddTask={handleAddTask} folders={folders} selectedFolderId={null} onCreateFolder={handleCreateFolder} />

      {selectedTask && (
        <TaskDetailSheet
          task={selectedTask}
          isOpen={isDetailOpen}
          onClose={() => { setIsDetailOpen(false); setSelectedTask(null); }}
          onUpdate={(updatedTask) => handleUpdateTask(updatedTask.id, updatedTask)}
          onDelete={handleDeleteTask}
          onDuplicate={(task) => {
            const duplicatedTask: TodoItem = { ...task, id: Date.now().toString(), completed: false };
            const updatedItems = [...items, duplicatedTask];
            setItems(updatedItems);
            localStorage.setItem('todoItems', JSON.stringify(updatedItems));
            window.dispatchEvent(new Event('tasksUpdated'));
          }}
        />
      )}
    </TodoLayout>
  );
};

export default TodoCalendar;
