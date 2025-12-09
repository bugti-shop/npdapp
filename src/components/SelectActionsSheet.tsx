import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { FolderInput, Trash2, CheckSquare, Pin, Flag, Copy, FileText, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SelectAction = 'move' | 'delete' | 'complete' | 'pin' | 'priority' | 'duplicate' | 'convert';

interface SelectActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onAction: (action: SelectAction) => void;
}

export const SelectActionsSheet = ({
  isOpen,
  onClose,
  selectedCount,
  onAction
}: SelectActionsSheetProps) => {
  const handleAction = (action: SelectAction) => {
    onAction(action);
    if (action !== 'move' && action !== 'priority') {
      onClose();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="mb-4">
          <SheetTitle>{selectedCount} task(s) selected</SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <Button
            variant="outline"
            className="flex flex-col h-20 gap-2"
            onClick={() => handleAction('move')}
          >
            <FolderInput className="h-5 w-5 text-blue-500" />
            <span className="text-xs">Move to Folder</span>
          </Button>

          <Button
            variant="outline"
            className="flex flex-col h-20 gap-2"
            onClick={() => handleAction('delete')}
          >
            <Trash2 className="h-5 w-5 text-red-500" />
            <span className="text-xs">Delete</span>
          </Button>

          <Button
            variant="outline"
            className="flex flex-col h-20 gap-2"
            onClick={() => handleAction('complete')}
          >
            <CheckSquare className="h-5 w-5 text-green-500" />
            <span className="text-xs">Complete</span>
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full">
              <MoreVertical className="h-4 w-4 mr-2" />
              More Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuItem onClick={() => handleAction('pin')}>
              <Pin className="h-4 w-4 mr-2" />
              Pin Tasks
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('priority')}>
              <Flag className="h-4 w-4 mr-2" />
              Set Priority
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('duplicate')}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('convert')}>
              <FileText className="h-4 w-4 mr-2" />
              Convert to Note
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SheetContent>
    </Sheet>
  );
};
