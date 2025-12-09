import { useState, useEffect } from 'react';
import { TodoItem, Priority, ColoredTag } from '@/types/note';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  X,
  Flag,
  Trash2,
  Tag,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SubtaskDetailSheetProps {
  isOpen: boolean;
  subtask: TodoItem | null;
  parentId: string | null;
  onClose: () => void;
  onUpdate: (parentId: string, subtaskId: string, updates: Partial<TodoItem>) => void;
  onDelete: (parentId: string, subtaskId: string) => void;
  onConvertToTask: (parentId: string, subtask: TodoItem) => void;
}

const TAG_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', 
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
];

export const SubtaskDetailSheet = ({
  isOpen,
  subtask,
  parentId,
  onClose,
  onUpdate,
  onDelete,
  onConvertToTask
}: SubtaskDetailSheetProps) => {
  const [title, setTitle] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  useEffect(() => {
    if (subtask) {
      setTitle(subtask.text);
    }
  }, [subtask]);

  if (!isOpen || !subtask || !parentId) return null;

  const handleTitleBlur = () => {
    if (title.trim() !== subtask.text) {
      onUpdate(parentId, subtask.id, { text: title.trim() });
    }
  };

  const handleToggleComplete = async () => {
    try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch {}
    onUpdate(parentId, subtask.id, { completed: !subtask.completed });
  };

  const handleSetPriority = async (priority: Priority) => {
    try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
    onUpdate(parentId, subtask.id, { priority });
    toast.success(`Priority set to ${priority === 'none' ? 'none' : priority}`);
  };

  const handleDelete = async () => {
    try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch {}
    onDelete(parentId, subtask.id);
    onClose();
    toast.success('Subtask deleted');
  };

  const handleConvertToTask = async () => {
    try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch {}
    onConvertToTask(parentId, subtask);
    onClose();
    toast.success('Converted to main task');
  };

  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    
    const newTag: ColoredTag = {
      name: newTagName.trim(),
      color: newTagColor
    };

    onUpdate(parentId, subtask.id, {
      coloredTags: [...(subtask.coloredTags || []), newTag]
    });

    setNewTagName('');
    setShowTagInput(false);
    toast.success('Tag added');
  };

  const handleRemoveTag = (tagName: string) => {
    onUpdate(parentId, subtask.id, {
      coloredTags: (subtask.coloredTags || []).filter(t => t.name !== tagName)
    });
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
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
        <SheetHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <SheetTitle>Subtask Details</SheetTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </SheetHeader>

        <div className="py-4 space-y-6 overflow-y-auto max-h-[calc(80vh-100px)]">
          {/* Subtask Title with Checkbox */}
          <div className="flex items-start gap-3">
            <Checkbox
              checked={subtask.completed}
              onCheckedChange={handleToggleComplete}
              className={cn(
                "h-6 w-6 mt-1",
                subtask.completed 
                  ? "bg-muted-foreground/30 border-0" 
                  : "border-2 border-muted-foreground/40"
              )}
            />
            <div className="flex-1">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                placeholder="Subtask title..."
                className={cn(
                  "text-lg font-medium border-none shadow-none px-0 h-auto focus-visible:ring-0",
                  subtask.completed && "line-through opacity-60"
                )}
              />
              {subtask.priority && subtask.priority !== 'none' && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Flag className={cn("h-3 w-3", getPriorityColor(subtask.priority))} />
                  <span className={cn("text-xs capitalize", getPriorityColor(subtask.priority))}>
                    {subtask.priority} Priority
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Priority Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Priority</label>
            <div className="flex gap-2">
              {(['high', 'medium', 'low', 'none'] as Priority[]).map((p) => (
                <Button
                  key={p}
                  variant={subtask.priority === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSetPriority(p)}
                  className={cn(
                    "flex-1 capitalize",
                    subtask.priority === p && p === 'high' && "bg-red-500 hover:bg-red-600",
                    subtask.priority === p && p === 'medium' && "bg-orange-500 hover:bg-orange-600",
                    subtask.priority === p && p === 'low' && "bg-green-500 hover:bg-green-600"
                  )}
                >
                  {p === 'none' ? 'None' : p}
                </Button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Tags</label>
            <div className="flex flex-wrap gap-2">
              {subtask.coloredTags?.map((tag) => (
                <span
                  key={tag.name}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full"
                  style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                >
                  <Tag className="h-3 w-3" />
                  {tag.name}
                  <button
                    onClick={() => handleRemoveTag(tag.name)}
                    className="ml-1 hover:opacity-70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {!showTagInput ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTagInput(true)}
                  className="h-7"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  Add Tag
                </Button>
              ) : (
                <div className="flex items-center gap-2 w-full">
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Tag name..."
                    className="h-8 flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <div className="flex gap-1">
                    {TAG_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewTagColor(color)}
                        className={cn(
                          "w-5 h-5 rounded-full transition-transform",
                          newTagColor === color && "ring-2 ring-offset-1 ring-foreground scale-110"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <Button size="sm" onClick={handleAddTag} className="h-8">
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowTagInput(false)} className="h-8">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleConvertToTask}
            >
              <Flag className="h-4 w-4 mr-2" />
              Convert to Main Task
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Subtask
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
