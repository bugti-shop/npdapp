import { useState, useRef } from 'react';
import { Folder as FolderIcon, Plus, Edit2, Trash2, FolderOpen, FolderPlus, FolderMinus } from 'lucide-react';
import { Folder, Note } from '@/types/note';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface FolderManagerProps {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, color: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onEditFolder: (folderId: string, name: string) => void;
  onDropOnFolder?: (e: React.DragEvent, folderId: string | null) => void;
  notes?: Note[];
  onAddNotesToFolder?: (noteIds: string[], folderId: string) => void;
  onRemoveNoteFromFolder?: (noteId: string) => void;
}

const folderColors = [
  '#3c78f0', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
];

const CLICKS_TO_SHOW_ACTIONS = 3;

export const FolderManager = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onEditFolder,
  onDropOnFolder,
  notes = [],
  onAddNotesToFolder,
  onRemoveNoteFromFolder,
}: FolderManagerProps) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAddNotesOpen, setIsAddNotesOpen] = useState(false);
  const [isRemoveNotesOpen, setIsRemoveNotesOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(folderColors[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [folderClickCounts, setFolderClickCounts] = useState<Record<string, number>>({});
  const [showActionsForFolder, setShowActionsForFolder] = useState<string | null>(null);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [selectedRemoveNoteIds, setSelectedRemoveNoteIds] = useState<string[]>([]);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const availableNotes = notes.filter(note => note.folderId !== selectedFolderId);
  const folderNotes = notes.filter(note => note.folderId === selectedFolderId);

  const handleCreate = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), selectedColor);
      setNewFolderName('');
      setSelectedColor(folderColors[0]);
      setIsCreateOpen(false);
    }
  };

  const handleEdit = (folderId: string) => {
    if (editName.trim()) {
      onEditFolder(folderId, editName.trim());
      setEditingId(null);
      setEditName('');
      setShowActionsForFolder(null);
      setFolderClickCounts(prev => ({ ...prev, [folderId]: 0 }));
    }
  };

  const handleDelete = (folderId: string) => {
    onDeleteFolder(folderId);
    setShowActionsForFolder(null);
    setFolderClickCounts(prev => ({ ...prev, [folderId]: 0 }));
  };

  const handleFolderClick = (folderId: string) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    const currentCount = (folderClickCounts[folderId] || 0) + 1;
    setFolderClickCounts(prev => ({ ...prev, [folderId]: currentCount }));

    onSelectFolder(folderId);

    if (currentCount >= CLICKS_TO_SHOW_ACTIONS) {
      setShowActionsForFolder(folderId);
    }

    clickTimeoutRef.current = setTimeout(() => {
      setFolderClickCounts(prev => ({ ...prev, [folderId]: 0 }));
      setShowActionsForFolder(null);
    }, 1500);
  };

  const handleSelectAllNotes = () => {
    onSelectFolder(null);
    setShowActionsForFolder(null);
    setFolderClickCounts({});
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDropOnFolder) {
      onDropOnFolder(e, folderId);
    }
  };

  const handleToggleNoteSelection = (noteId: string) => {
    setSelectedNoteIds(prev =>
      prev.includes(noteId)
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  };

  const handleAddSelectedNotes = () => {
    if (selectedFolderId && onAddNotesToFolder && selectedNoteIds.length > 0) {
      onAddNotesToFolder(selectedNoteIds, selectedFolderId);
      setSelectedNoteIds([]);
      setIsAddNotesOpen(false);
    }
  };

  const handleToggleRemoveNoteSelection = (noteId: string) => {
    setSelectedRemoveNoteIds(prev =>
      prev.includes(noteId)
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  };

  const handleRemoveSelectedNotes = () => {
    if (onRemoveNoteFromFolder && selectedRemoveNoteIds.length > 0) {
      selectedRemoveNoteIds.forEach(noteId => {
        onRemoveNoteFromFolder(noteId);
      });
      setSelectedRemoveNoteIds([]);
      setIsRemoveNotesOpen(false);
    }
  };

  const selectedFolder = folders.find(f => f.id === selectedFolderId);
  const isCustomFolder = selectedFolder && !selectedFolder.isDefault;

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FolderIcon className="w-5 h-5" />
          Folders
        </h2>
        <div className="flex items-center gap-1">
          {isCustomFolder && onAddNotesToFolder && availableNotes.length > 0 && (
            <Dialog open={isAddNotesOpen} onOpenChange={setIsAddNotesOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  title="Add existing notes to this folder"
                >
                  <FolderPlus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Notes to "{selectedFolder?.name}"</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Select notes to add to this folder:
                  </p>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                      {availableNotes.map((note) => (
                        <div
                          key={note.id}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleToggleNoteSelection(note.id)}
                        >
                          <Checkbox
                            checked={selectedNoteIds.includes(note.id)}
                            onCheckedChange={() => handleToggleNoteSelection(note.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{note.title || 'Untitled'}</p>
                            <p className="text-xs text-muted-foreground capitalize">{note.type} note</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <Button
                    onClick={handleAddSelectedNotes}
                    className="w-full"
                    disabled={selectedNoteIds.length === 0}
                  >
                    Add {selectedNoteIds.length} Note{selectedNoteIds.length !== 1 ? 's' : ''} to Folder
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {isCustomFolder && onRemoveNoteFromFolder && folderNotes.length > 0 && (
            <Dialog open={isRemoveNotesOpen} onOpenChange={setIsRemoveNotesOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  title="Remove notes from this folder"
                >
                  <FolderMinus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Remove Notes from "{selectedFolder?.name}"</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Select notes to move back to All Notes:
                  </p>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                      {folderNotes.map((note) => (
                        <div
                          key={note.id}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleToggleRemoveNoteSelection(note.id)}
                        >
                          <Checkbox
                            checked={selectedRemoveNoteIds.includes(note.id)}
                            onCheckedChange={() => handleToggleRemoveNoteSelection(note.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{note.title || 'Untitled'}</p>
                            <p className="text-xs text-muted-foreground capitalize">{note.type} note</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <Button
                    onClick={handleRemoveSelectedNotes}
                    className="w-full"
                    disabled={selectedRemoveNoteIds.length === 0}
                    variant="destructive"
                  >
                    Remove {selectedRemoveNoteIds.length} Note{selectedRemoveNoteIds.length !== 1 ? 's' : ''} from Folder
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
                <div>
                  <label className="text-sm font-medium mb-2 block">Color</label>
                  <div className="flex gap-2">
                    {folderColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className="w-10 h-10 rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: color,
                          borderColor: selectedColor === color ? color : 'transparent',
                          transform: selectedColor === color ? 'scale(1.1)' : 'scale(1)',
                        }}
                      />
                    ))}
                  </div>
                </div>
                <Button onClick={handleCreate} className="w-full">
                  Create Folder
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={handleSelectAllNotes}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, null)}
          className="flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all"
          style={{
            backgroundColor: selectedFolderId === null ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
            color: selectedFolderId === null ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
          }}
        >
          <FolderOpen className="w-4 h-4" />
          All Notes
        </button>

        {folders.map((folder) => (
          <div key={folder.id} className="relative">
            {editingId === folder.id ? (
              <div className="flex items-center gap-1 px-2 py-2 rounded-full bg-muted">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEdit(folder.id);
                    if (e.key === 'Escape') {
                      setEditingId(null);
                      setShowActionsForFolder(null);
                      setFolderClickCounts(prev => ({ ...prev, [folder.id]: 0 }));
                    }
                  }}
                  className="h-6 text-sm w-24"
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => handleEdit(folder.id)}
                >
                  ✓
                </Button>
              </div>
            ) : (
              <button
                onClick={() => handleFolderClick(folder.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, folder.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all"
                style={{
                  backgroundColor: selectedFolderId === folder.id ? folder.color : 'hsl(var(--muted))',
                  color: selectedFolderId === folder.id ? '#ffffff' : 'hsl(var(--foreground))',
                }}
              >
                <FolderIcon className="w-4 h-4" />
                {folder.name}
              </button>
            )}

            {!folder.isDefault && editingId !== folder.id && showActionsForFolder === folder.id && (
              <div className="absolute -top-2 -right-2 flex gap-1 animate-fade-in">
                <button
                  onClick={() => {
                    setEditingId(folder.id);
                    setEditName(folder.name);
                  }}
                  className="w-6 h-6 rounded-full bg-background border shadow-sm flex items-center justify-center hover:bg-muted"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleDelete(folder.id)}
                  className="w-6 h-6 rounded-full bg-background border shadow-sm flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
