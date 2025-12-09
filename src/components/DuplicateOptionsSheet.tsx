import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Copy, CheckSquare, Square } from 'lucide-react';

export type DuplicateOption = 'uncompleted' | 'all-preserve' | 'all-reset';

interface DuplicateOptionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (option: DuplicateOption) => void;
}

export const DuplicateOptionsSheet = ({ isOpen, onClose, onSelect }: DuplicateOptionsSheetProps) => {
  const handleSelect = (option: DuplicateOption) => {
    onSelect(option);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicate Tasks
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start h-14 text-left"
            onClick={() => handleSelect('uncompleted')}
          >
            <Square className="h-5 w-5 mr-3 text-blue-500" />
            <div>
              <p className="font-medium">Only Duplicate Uncompleted Tasks</p>
              <p className="text-xs text-muted-foreground">Skip completed tasks</p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-14 text-left"
            onClick={() => handleSelect('all-preserve')}
          >
            <CheckSquare className="h-5 w-5 mr-3 text-green-500" />
            <div>
              <p className="font-medium">All Tasks, Preserving Completed Status</p>
              <p className="text-xs text-muted-foreground">Keep completed state</p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-14 text-left"
            onClick={() => handleSelect('all-reset')}
          >
            <Square className="h-5 w-5 mr-3 text-orange-500" />
            <div>
              <p className="font-medium">All Tasks, Without Completed Status</p>
              <p className="text-xs text-muted-foreground">Reset all to uncompleted</p>
            </div>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
