import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ListPlus, FolderIcon, LayoutList, Flag, Calendar } from 'lucide-react';
import { TaskSection, Folder, Priority } from '@/types/note';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface BatchTaskSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTasks: (tasks: string[], sectionId?: string, folderId?: string, priority?: Priority, dueDate?: Date) => void;
  sections?: TaskSection[];
  folders?: Folder[];
}

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: 'text-red-500' },
  { value: 'medium', label: 'Medium', color: 'text-orange-500' },
  { value: 'low', label: 'Low', color: 'text-green-500' },
  { value: 'none', label: 'None', color: 'text-muted-foreground' },
];

export const BatchTaskSheet = ({ isOpen, onClose, onAddTasks, sections = [], folders = [] }: BatchTaskSheetProps) => {
  const [text, setText] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<Priority>('none');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const handleAdd = () => {
    const tasks = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (tasks.length > 0) {
      onAddTasks(
        tasks, 
        selectedSection || undefined, 
        selectedFolder || undefined,
        selectedPriority !== 'none' ? selectedPriority : undefined,
        selectedDate
      );
      setText('');
      setSelectedSection('');
      setSelectedFolder('');
      setSelectedPriority('none');
      setSelectedDate(undefined);
      onClose();
    }
  };

  const taskCount = text.split('\n').filter(line => line.trim().length > 0).length;
  const selectedPriorityOption = priorityOptions.find(p => p.value === selectedPriority);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <ListPlus className="h-5 w-5" />
            Add Multiple Tasks
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter one task per line. Each line will become a separate task.
          </p>
          
          <Textarea
            placeholder="Buy groceries&#10;Call mom&#10;Finish report&#10;Schedule meeting"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[160px] resize-none"
            autoFocus
          />

          {/* Section and Folder Selection */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <LayoutList className="h-3.5 w-3.5" />
                Section
              </label>
              <Select value={selectedSection || "no-section"} onValueChange={(v) => setSelectedSection(v === "no-section" ? "" : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="No section" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="no-section">No section</SelectItem>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: section.color }}
                        />
                        {section.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <FolderIcon className="h-3.5 w-3.5" />
                Folder
              </label>
              <Select value={selectedFolder || "no-folder"} onValueChange={(v) => setSelectedFolder(v === "no-folder" ? "" : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="No folder" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="no-folder">No folder</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <div className="flex items-center gap-2">
                        {folder.color && (
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: folder.color }}
                          />
                        )}
                        {folder.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Priority and Due Date Selection */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Flag className="h-3.5 w-3.5" />
                Priority
              </label>
              <Select value={selectedPriority} onValueChange={(v) => setSelectedPriority(v as Priority)}>
                <SelectTrigger className="h-9">
                  <SelectValue>
                    <span className={cn(selectedPriorityOption?.color)}>
                      {selectedPriorityOption?.label || 'None'}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className={cn(option.color)}>{option.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Due Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'No date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                  {selectedDate && (
                    <div className="p-2 border-t">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setSelectedDate(undefined)}
                      >
                        Clear date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {taskCount} task{taskCount !== 1 ? 's' : ''} to add
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleAdd} disabled={taskCount === 0}>
                Add {taskCount > 0 ? taskCount : ''} Task{taskCount !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
