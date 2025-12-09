import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export type GroupBy = 'custom' | 'date' | 'priority';
export type SortBy = 'custom' | 'date' | 'priority';

interface TaskOptionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  groupBy: GroupBy;
  sortBy: SortBy;
  onGroupByChange: (value: GroupBy) => void;
  onSortByChange: (value: SortBy) => void;
}

export const TaskOptionsSheet = ({
  isOpen,
  onClose,
  groupBy,
  sortBy,
  onGroupByChange,
  onSortByChange,
}: TaskOptionsSheetProps) => {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[50vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg font-semibold">Group & Sort</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto">
          {/* Group By */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Group By</h3>
            <RadioGroup value={groupBy} onValueChange={(v) => onGroupByChange(v as GroupBy)}>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="custom" id="group-custom" />
                <Label htmlFor="group-custom" className="cursor-pointer flex-1">Custom</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="date" id="group-date" />
                <Label htmlFor="group-date" className="cursor-pointer flex-1">Date</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="priority" id="group-priority" />
                <Label htmlFor="group-priority" className="cursor-pointer flex-1">Priority</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Sort By */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sort By</h3>
            <RadioGroup value={sortBy} onValueChange={(v) => onSortByChange(v as SortBy)}>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="custom" id="sort-custom" />
                <Label htmlFor="sort-custom" className="cursor-pointer flex-1">Custom</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="date" id="sort-date" />
                <Label htmlFor="sort-date" className="cursor-pointer flex-1">Date</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="priority" id="sort-priority" />
                <Label htmlFor="sort-priority" className="cursor-pointer flex-1">Priority</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};