import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Note, TodoItem, Folder } from '@/types/note';

interface NotaDBSchema extends DBSchema {
  notes: {
    key: string;
    value: Note;
    indexes: { 'by-folder': string; 'by-updated': Date };
  };
  todos: {
    key: string;
    value: TodoItem;
    indexes: { 'by-folder': string; 'by-due-date': Date };
  };
  folders: {
    key: string;
    value: Folder;
  };
  syncQueue: {
    key: number;
    value: {
      id: number;
      type: 'create' | 'update' | 'delete';
      entity: 'note' | 'todo' | 'folder';
      entityId: string;
      data: any;
      timestamp: Date;
      synced: boolean;
    };
  };
  cache: {
    key: string;
    value: {
      key: string;
      data: any;
      timestamp: Date;
      expiresAt?: Date;
    };
  };
}

const DB_NAME = 'nota-offline-db';
const DB_VERSION = 1;

class OfflineStorageManager {
  private static instance: OfflineStorageManager;
  private db: IDBPDatabase<NotaDBSchema> | null = null;
  private isOnline = navigator.onLine;
  private syncInProgress = false;
  private listeners: ((online: boolean) => void)[] = [];

  private constructor() {
    this.setupNetworkListeners();
  }

  static getInstance(): OfflineStorageManager {
    if (!OfflineStorageManager.instance) {
      OfflineStorageManager.instance = new OfflineStorageManager();
    }
    return OfflineStorageManager.instance;
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.isOnline));
  }

  onNetworkChange(callback: (online: boolean) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  async initialize(): Promise<void> {
    try {
      this.db = await openDB<NotaDBSchema>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Notes store
          if (!db.objectStoreNames.contains('notes')) {
            const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
            notesStore.createIndex('by-folder', 'folderId');
            notesStore.createIndex('by-updated', 'updatedAt');
          }

          // Todos store
          if (!db.objectStoreNames.contains('todos')) {
            const todosStore = db.createObjectStore('todos', { keyPath: 'id' });
            todosStore.createIndex('by-folder', 'folderId');
            todosStore.createIndex('by-due-date', 'dueDate');
          }

          // Folders store
          if (!db.objectStoreNames.contains('folders')) {
            db.createObjectStore('folders', { keyPath: 'id' });
          }

          // Sync queue store
          if (!db.objectStoreNames.contains('syncQueue')) {
            db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          }

          // Cache store
          if (!db.objectStoreNames.contains('cache')) {
            db.createObjectStore('cache', { keyPath: 'key' });
          }
        },
      });

      // Migrate from localStorage to IndexedDB if needed
      await this.migrateFromLocalStorage();

      console.log('Offline storage initialized');
    } catch (error) {
      console.error('Failed to initialize offline storage:', error);
    }
  }

  private async migrateFromLocalStorage(): Promise<void> {
    if (!this.db) return;

    const migrated = localStorage.getItem('indexeddb-migrated');
    if (migrated === 'true') return;

    try {
      // Migrate notes
      const notesJson = localStorage.getItem('notes');
      if (notesJson) {
        const notes = JSON.parse(notesJson);
        for (const note of notes) {
          await this.db.put('notes', note);
        }
      }

      // Migrate todos
      const todosJson = localStorage.getItem('nota-todo-items');
      if (todosJson) {
        const todos = JSON.parse(todosJson);
        for (const todo of todos) {
          await this.db.put('todos', todo);
        }
      }

      // Migrate folders
      const foldersJson = localStorage.getItem('folders');
      if (foldersJson) {
        const folders = JSON.parse(foldersJson);
        for (const folder of folders) {
          await this.db.put('folders', folder);
        }
      }

      localStorage.setItem('indexeddb-migrated', 'true');
      console.log('Migration from localStorage complete');
    } catch (error) {
      console.error('Migration error:', error);
    }
  }

  isNetworkOnline(): boolean {
    return this.isOnline;
  }

  // Notes operations
  async saveNote(note: Note): Promise<void> {
    if (!this.db) return;
    await this.db.put('notes', note);
    
    // Also update localStorage for backward compatibility
    const notes = await this.getAllNotes();
    localStorage.setItem('notes', JSON.stringify(notes));

    // Queue for sync if offline
    if (!this.isOnline) {
      await this.addToSyncQueue('update', 'note', note.id, note);
    }
  }

  async getNote(id: string): Promise<Note | undefined> {
    if (!this.db) return undefined;
    return await this.db.get('notes', id);
  }

  async getAllNotes(): Promise<Note[]> {
    if (!this.db) {
      // Fallback to localStorage
      const notesJson = localStorage.getItem('notes');
      return notesJson ? JSON.parse(notesJson) : [];
    }
    return await this.db.getAll('notes');
  }

  async deleteNote(id: string): Promise<void> {
    if (!this.db) return;
    await this.db.delete('notes', id);
    
    const notes = await this.getAllNotes();
    localStorage.setItem('notes', JSON.stringify(notes));

    if (!this.isOnline) {
      await this.addToSyncQueue('delete', 'note', id, null);
    }
  }

  // Todos operations
  async saveTodo(todo: TodoItem): Promise<void> {
    if (!this.db) return;
    await this.db.put('todos', todo);
    
    const todos = await this.getAllTodos();
    localStorage.setItem('nota-todo-items', JSON.stringify(todos));

    if (!this.isOnline) {
      await this.addToSyncQueue('update', 'todo', todo.id, todo);
    }
  }

  async getTodo(id: string): Promise<TodoItem | undefined> {
    if (!this.db) return undefined;
    return await this.db.get('todos', id);
  }

  async getAllTodos(): Promise<TodoItem[]> {
    if (!this.db) {
      const todosJson = localStorage.getItem('nota-todo-items');
      return todosJson ? JSON.parse(todosJson) : [];
    }
    return await this.db.getAll('todos');
  }

  async getTodaysTodos(): Promise<TodoItem[]> {
    const todos = await this.getAllTodos();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return todos.filter(todo => {
      if (!todo.dueDate) return false;
      const dueDate = new Date(todo.dueDate);
      return dueDate >= today && dueDate < tomorrow && !todo.completed;
    });
  }

  async deleteTodo(id: string): Promise<void> {
    if (!this.db) return;
    await this.db.delete('todos', id);
    
    const todos = await this.getAllTodos();
    localStorage.setItem('nota-todo-items', JSON.stringify(todos));

    if (!this.isOnline) {
      await this.addToSyncQueue('delete', 'todo', id, null);
    }
  }

  // Folders operations
  async saveFolder(folder: Folder): Promise<void> {
    if (!this.db) return;
    await this.db.put('folders', folder);
    
    const folders = await this.getAllFolders();
    localStorage.setItem('folders', JSON.stringify(folders));
  }

  async getAllFolders(): Promise<Folder[]> {
    if (!this.db) {
      const foldersJson = localStorage.getItem('folders');
      return foldersJson ? JSON.parse(foldersJson) : [];
    }
    return await this.db.getAll('folders');
  }

  // Sync queue operations
  private async addToSyncQueue(
    type: 'create' | 'update' | 'delete',
    entity: 'note' | 'todo' | 'folder',
    entityId: string,
    data: any
  ): Promise<void> {
    if (!this.db) return;
    
    await this.db.add('syncQueue', {
      id: Date.now(),
      type,
      entity,
      entityId,
      data,
      timestamp: new Date(),
      synced: false,
    });
  }

  async processSyncQueue(): Promise<void> {
    if (!this.db || !this.isOnline || this.syncInProgress) return;

    this.syncInProgress = true;

    try {
      const tx = this.db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const items = await store.getAll();

      for (const item of items) {
        if (item.synced) continue;

        try {
          // Here you would sync with your backend/Firebase
          // For now, we just mark as synced
          item.synced = true;
          await store.put(item);
        } catch (error) {
          console.error('Failed to sync item:', error);
        }
      }

      // Clean up old synced items
      const allItems = await store.getAll();
      for (const item of allItems) {
        if (item.synced) {
          await store.delete(item.id);
        }
      }

      await tx.done;
      console.log('Sync queue processed');
    } catch (error) {
      console.error('Error processing sync queue:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  async getPendingSyncCount(): Promise<number> {
    if (!this.db) return 0;
    const items = await this.db.getAll('syncQueue');
    return items.filter(item => !item.synced).length;
  }

  // Cache operations
  async setCache(key: string, data: any, ttlMinutes?: number): Promise<void> {
    if (!this.db) return;
    
    const expiresAt = ttlMinutes 
      ? new Date(Date.now() + ttlMinutes * 60 * 1000)
      : undefined;

    await this.db.put('cache', {
      key,
      data,
      timestamp: new Date(),
      expiresAt,
    });
  }

  async getCache(key: string): Promise<any | null> {
    if (!this.db) return null;
    
    const cached = await this.db.get('cache', key);
    if (!cached) return null;

    if (cached.expiresAt && new Date() > cached.expiresAt) {
      await this.db.delete('cache', key);
      return null;
    }

    return cached.data;
  }

  async clearCache(): Promise<void> {
    if (!this.db) return;
    await this.db.clear('cache');
  }
}

export const offlineStorage = OfflineStorageManager.getInstance();