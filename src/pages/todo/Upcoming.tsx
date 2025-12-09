import { useState, useEffect } from 'react';
import { TodoItem, Priority, Folder } from '@/types/note';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { format, isAfter, startOfDay, startOfWeek, endOfWeek } from 'date-fns';
import { TaskInputSheet } from '@/components/TaskInputSheet';
import { TaskDetailSheet } from '@/components/TaskDetailSheet';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { notificationManager } from '@/utils/notifications';
import { getCategoryById } from '@/utils/categories';
import { TodoLayout } from './TodoLayout';

const Upcoming = () => {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<'week' | 'month'>('week');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedTask, setSelectedTask] = useState<TodoItem | null>(null);

  const loadItems = () => {
    const saved = localStorage.getItem('todoItems');
    if (saved) {
      const parsed = JSON.parse(saved);
      const allItems = parsed.map((item: TodoItem) => ({
        ...item,
        dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
        reminderTime: item.reminderTime ? new Date(item.reminderTime) : undefined,
      }));
      const today = startOfDay(new Date());
      const upcomingItems = allItems.filter((item: TodoItem) =>
        item.dueDate && isAfter(startOfDay(item.dueDate), today)
      );
      setItems(upcomingItems);
    }
  };

  useEffect(() => {
    loadItems();
    const savedFolders = localStorage.getItem('todoFolders');
    if (savedFolders) {
      const parsed = JSON.parse(savedFolders);
      setFolders(parsed.map((f: Folder) => ({ ...f, createdAt: new Date(f.createdAt) })));
    }
  }, []);

  const handleCreateFolder = (name: string, color: string) => {
    const newFolder: Folder = { id: Date.now().toString(), name, color, isDefault: false, createdAt: new Date() };
    const updatedFolders = [...folders, newFolder];
    setFolders(updatedFolders);
    localStorage.setItem('todoFolders', JSON.stringify(updatedFolders));
  };

  const handleAddTask = async (task: Omit<TodoItem, 'id' | 'completed'>) => {
    const newItem: TodoItem = { id: Date.now().toString(), completed: false, ...task };
    if (newItem.reminderTime) {
      try { await notificationManager.scheduleTaskReminder(newItem); } catch (error) { console.error('Failed to schedule notification:', error); }
    }
    const saved = localStorage.getItem('todoItems');
    const allItems = saved ? JSON.parse(saved) : [];
    allItems.unshift(newItem);
    localStorage.setItem('todoItems', JSON.stringify(allItems));
    loadItems();
  };

  const updateItem = async (itemId: string, updates: Partial<TodoItem>) => {
    const updatedItems = items.map((item) => (item.id === itemId ? { ...item, ...updates } : item));
    setItems(updatedItems);
    const saved = localStorage.getItem('todoItems');
    if (saved) {
      const allItems = JSON.parse(saved);
      const newAllItems = allItems.map((item: TodoItem) => {
        const updated = updatedItems.find((u) => u.id === item.id);
        return updated ? updated : item;
      });
      localStorage.setItem('todoItems', JSON.stringify(newAllItems));
    }
  };

  const deleteItem = async (itemId: string) => {
    await notificationManager.cancelTaskReminder(itemId);
    setItems(items.filter((item) => item.id !== itemId));
    const saved = localStorage.getItem('todoItems');
    if (saved) {
      const allItems = JSON.parse(saved);
      const newAllItems = allItems.filter((item: TodoItem) => item.id !== itemId);
      localStorage.setItem('todoItems', JSON.stringify(newAllItems));
    }
  };

  const duplicateTask = async (task: TodoItem) => {
    try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
    const duplicatedTask: TodoItem = { ...task, id: Date.now().toString(), completed: false, text: `${task.text} (Copy)` };
    const saved = localStorage.getItem('todoItems');
    const allItems = saved ? JSON.parse(saved) : [];
    allItems.unshift(duplicatedTask);
    localStorage.setItem('todoItems', JSON.stringify(allItems));
    loadItems();
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
    const reorderedItems = Array.from(items);
    const [movedItem] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, movedItem);
    setItems(reorderedItems);
  };

  const getPriorityBorderColor = (priority?: Priority) => {
    switch (priority) {
      case 'high': return 'border-red-500';
      case 'medium': return 'border-orange-500';
      case 'low': return 'border-blue-500';
      default: return 'border-muted-foreground/40';
    }
  };

  const groupedTasks = () => {
    const sorted = [...items].sort((a, b) => {
      if (!a.dueDate || !b.dueDate) return 0;
      const comparison = a.dueDate.getTime() - b.dueDate.getTime();
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    const groups: { [key: string]: TodoItem[] } = {};
    sorted.forEach((item) => {
      if (!item.dueDate) return;
      let groupKey: string;
      if (groupBy === 'week') {
        const weekStart = startOfWeek(item.dueDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(item.dueDate, { weekStartsOn: 0 });
        groupKey = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      } else {
        groupKey = format(item.dueDate, 'MMMM yyyy');
      }
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
    });
    return groups;
  };

  const taskGroups = groupedTasks();

  return (
    <TodoLayout title="Upcoming">
      <main className="container mx-auto px-4 py-6 pb-32">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-end">
              <Button variant="ghost" size="icon" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                <ArrowUpDown className="h-5 w-5" />
              </Button>
            </div>
            <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as 'week' | 'month')}>
              <TabsList className="w-full">
                <TabsTrigger value="week" className="flex-1">By Week</TabsTrigger>
                <TabsTrigger value="month" className="flex-1">By Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-20"><p className="text-muted-foreground">No upcoming tasks</p></div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              {Object.entries(taskGroups).map(([groupName, groupItems]) => (
                <div key={groupName} className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground px-1">{groupName}</h3>
                  <Droppable droppableId={`group-${groupName}`}>
                    {(provided, snapshot) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className={cn("space-y-2 transition-colors rounded-lg", snapshot.isDraggingOver && "bg-muted/20 p-2")}>
                        {groupItems.map((item) => (
                          <Draggable key={item.id} draggableId={item.id} index={items.indexOf(item)}>
                            {(provided, snapshot) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} className={cn("bg-card rounded-lg border group hover:shadow-sm transition-all p-3 space-y-2 cursor-pointer", snapshot.isDragging && "shadow-lg scale-105 rotate-1 ring-2 ring-primary/20")} onClick={() => setSelectedTask(item)}>
                                <div className="flex items-start gap-3">
                                  <div {...provided.dragHandleProps} className="absolute inset-0 cursor-grab active:cursor-grabbing" onClick={(e) => e.stopPropagation()} style={{ width: '100%', height: '100%', zIndex: 0 }} />
                                  <Checkbox checked={item.completed} onCheckedChange={(checked) => updateItem(item.id, { completed: !!checked })} onClick={(e) => e.stopPropagation()} className={cn("h-6 w-6 rounded-full border-2 mt-0.5 relative z-10", item.completed ? "bg-green-500 border-green-500" : getPriorityBorderColor(item.priority))} />
                                  <div className="flex-1 min-w-0 relative z-10">
                                    <p className={cn("text-base font-medium", item.completed && "line-through text-muted-foreground")}>{item.text}</p>
                                    {item.subtasks && item.subtasks.length > 0 && (
                                      <p className="text-xs text-muted-foreground mt-1">{item.subtasks.filter(st => st.completed).length}/{item.subtasks.length} subtasks</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                      {item.categoryId && getCategoryById(item.categoryId) && (
                                        <div className={cn("text-xs px-2 py-0.5 rounded-full text-white flex items-center gap-1", getCategoryById(item.categoryId)!.color)}>
                                          <span>{getCategoryById(item.categoryId)!.icon}</span>
                                          <span>{getCategoryById(item.categoryId)!.name}</span>
                                        </div>
                                      )}
                                      {item.dueDate && <div className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">{format(item.dueDate, 'MMM d')}</div>}
                                    </div>
                                  </div>
                                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </DragDropContext>
          )}
        </div>
      </main>

      <Button onClick={async () => { try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch {} setIsInputOpen(true); }} className="fixed bottom-20 left-4 right-4 z-30 h-12 text-base font-semibold" size="lg">
        <Plus className="h-5 w-5" />Add Task
      </Button>

      <TaskInputSheet isOpen={isInputOpen} onClose={() => setIsInputOpen(false)} onAddTask={handleAddTask} folders={folders} selectedFolderId={null} onCreateFolder={handleCreateFolder} />
      <TaskDetailSheet isOpen={!!selectedTask} task={selectedTask} onClose={() => setSelectedTask(null)} onUpdate={(updatedTask) => { updateItem(updatedTask.id, updatedTask); setSelectedTask(updatedTask); }} onDelete={deleteItem} onDuplicate={duplicateTask} />
    </TodoLayout>
  );
};

export default Upcoming;
