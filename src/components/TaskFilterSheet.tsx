import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Folder, Priority, ColoredTag } from '@/types/note';
import { X, Tag } from 'lucide-react';

export type DateFilter = 'all' | 'today' | 'tomorrow' | 'this-week' | 'overdue' | 'no-date' | 'has-date';
export type PriorityFilter = 'all' | Priority;
export type StatusFilter = 'all' | 'completed' | 'uncompleted';

interface TaskFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  selectedFolderId: string | null;
  onFolderChange: (folderId: string | null) => void;
  dateFilter: DateFilter;
  onDateFilterChange: (value: DateFilter) => void;
  priorityFilter: PriorityFilter;
  onPriorityFilterChange: (value: PriorityFilter) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  onClearAll: () => void;
}

export const TaskFilterSheet = ({
  isOpen,
  onClose,
  folders,
  selectedFolderId,
  onFolderChange,
  dateFilter,
  onDateFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  statusFilter,
  onStatusFilterChange,
  selectedTags,
  onTagsChange,
  onClearAll,
}: TaskFilterSheetProps) => {
  const [savedTags, setSavedTags] = useState<ColoredTag[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('savedColoredTags');
    if (saved) {
      setSavedTags(JSON.parse(saved));
    }
  }, [isOpen]);

  const hasActiveFilters = selectedFolderId !== null || dateFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all' || selectedTags.length > 0;

  const handleTagToggle = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter(t => t !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">Filters</SheetTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={onClearAll} className="text-destructive hover:text-destructive">
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto pb-8">
          {/* Filter by Tags */}
          {savedTags.length > 0 && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {savedTags.map((tag) => (
                    <button
                      key={tag.name}
                      onClick={() => handleTagToggle(tag.name)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full transition-all ${
                        selectedTags.includes(tag.name) 
                          ? 'ring-2 ring-offset-2 ring-primary' 
                          : 'hover:opacity-80'
                      }`}
                      style={{ 
                        backgroundColor: `${tag.color}20`, 
                        color: tag.color 
                      }}
                    >
                      <Tag className="h-3.5 w-3.5" />
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Filter by Folder */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Folder</h3>
            <RadioGroup value={selectedFolderId || 'all'} onValueChange={(v) => onFolderChange(v === 'all' ? null : v)}>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="all" id="folder-all" />
                <Label htmlFor="folder-all" className="cursor-pointer flex-1">All Folders</Label>
              </div>
              {folders.map((folder) => (
                <div key={folder.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value={folder.id} id={`folder-${folder.id}`} />
                  <Label htmlFor={`folder-${folder.id}`} className="cursor-pointer flex-1 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: folder.color }} />
                    {folder.name}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Separator />

          {/* Filter by Date */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Date</h3>
            <RadioGroup value={dateFilter} onValueChange={(v) => onDateFilterChange(v as DateFilter)}>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="all" id="date-all" />
                <Label htmlFor="date-all" className="cursor-pointer flex-1">All Dates</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="today" id="date-today" />
                <Label htmlFor="date-today" className="cursor-pointer flex-1">Today</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="tomorrow" id="date-tomorrow" />
                <Label htmlFor="date-tomorrow" className="cursor-pointer flex-1">Tomorrow</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="this-week" id="date-week" />
                <Label htmlFor="date-week" className="cursor-pointer flex-1">This Week</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="overdue" id="date-overdue" />
                <Label htmlFor="date-overdue" className="cursor-pointer flex-1 text-destructive">Overdue</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="has-date" id="date-has" />
                <Label htmlFor="date-has" className="cursor-pointer flex-1">Has Due Date</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="no-date" id="date-no" />
                <Label htmlFor="date-no" className="cursor-pointer flex-1">No Due Date</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Filter by Priority */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Priority</h3>
            <RadioGroup value={priorityFilter} onValueChange={(v) => onPriorityFilterChange(v as PriorityFilter)}>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="all" id="priority-all" />
                <Label htmlFor="priority-all" className="cursor-pointer flex-1">All Priorities</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="high" id="priority-high" />
                <Label htmlFor="priority-high" className="cursor-pointer flex-1 text-red-500">High</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="medium" id="priority-medium" />
                <Label htmlFor="priority-medium" className="cursor-pointer flex-1 text-yellow-500">Medium</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="low" id="priority-low" />
                <Label htmlFor="priority-low" className="cursor-pointer flex-1 text-blue-500">Low</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="none" id="priority-none" />
                <Label htmlFor="priority-none" className="cursor-pointer flex-1">No Priority</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Filter by Status */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Status</h3>
            <RadioGroup value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="all" id="status-all" />
                <Label htmlFor="status-all" className="cursor-pointer flex-1">All Tasks</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="uncompleted" id="status-uncompleted" />
                <Label htmlFor="status-uncompleted" className="cursor-pointer flex-1">Uncompleted</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="completed" id="status-completed" />
                <Label htmlFor="status-completed" className="cursor-pointer flex-1">Completed</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
