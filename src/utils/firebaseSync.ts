import { db, auth } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  writeBatch,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const STORAGE_KEYS = {
  NOTES: 'nota-notes',
  FOLDERS: 'nota-folders',
  TODO_ITEMS: 'nota-todo-items',
  SYNC_ENABLED: 'firebase-sync-enabled',
  DEVICE_ID: 'firebase-device-id',
  LAST_SYNC: 'firebase-last-sync',
};

// Generate unique device ID
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
  }
  return deviceId;
};

class FirebaseSyncManager {
  private static instance: FirebaseSyncManager;
  private userId: string | null = null;
  private unsubscribers: Unsubscribe[] = [];
  private syncListeners: ((data: any) => void)[] = [];

  private constructor() {
    this.initAuth();
  }

  static getInstance(): FirebaseSyncManager {
    if (!FirebaseSyncManager.instance) {
      FirebaseSyncManager.instance = new FirebaseSyncManager();
    }
    return FirebaseSyncManager.instance;
  }

  private async initAuth() {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.userId = user.uid;
        if (this.isSyncEnabled()) {
          this.setupRealtimeListeners();
        }
      } else {
        this.userId = null;
      }
    });
  }

  async signIn(): Promise<boolean> {
    try {
      const result = await signInAnonymously(auth);
      this.userId = result.user.uid;
      return true;
    } catch (error) {
      console.error('Firebase sign in error:', error);
      return false;
    }
  }

  isSyncEnabled(): boolean {
    return localStorage.getItem(STORAGE_KEYS.SYNC_ENABLED) === 'true';
  }

  setSyncEnabled(enabled: boolean) {
    localStorage.setItem(STORAGE_KEYS.SYNC_ENABLED, enabled.toString());
    if (enabled) {
      this.setupRealtimeListeners();
    } else {
      this.cleanup();
    }
  }

  getLastSyncTime(): Date | null {
    const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    return lastSync ? new Date(lastSync) : null;
  }

  private setLastSyncTime() {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  }

  onDataChange(callback: (data: any) => void) {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
    };
  }

  private notifyListeners(data: any) {
    this.syncListeners.forEach(cb => cb(data));
  }

  private setupRealtimeListeners() {
    if (!this.userId) return;
    
    this.cleanup();

    // Listen to notes
    const notesRef = collection(db, 'users', this.userId, 'notes');
    const notesUnsub = onSnapshot(notesRef, (snapshot) => {
      const notes: any[] = [];
      snapshot.forEach((doc) => {
        notes.push({ id: doc.id, ...doc.data() });
      });
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
      this.notifyListeners({ type: 'notes', data: notes });
    });
    this.unsubscribers.push(notesUnsub);

    // Listen to folders
    const foldersRef = collection(db, 'users', this.userId, 'folders');
    const foldersUnsub = onSnapshot(foldersRef, (snapshot) => {
      const folders: any[] = [];
      snapshot.forEach((doc) => {
        folders.push({ id: doc.id, ...doc.data() });
      });
      localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
      this.notifyListeners({ type: 'folders', data: folders });
    });
    this.unsubscribers.push(foldersUnsub);

    // Listen to todos
    const todosRef = collection(db, 'users', this.userId, 'todos');
    const todosUnsub = onSnapshot(todosRef, (snapshot) => {
      const todos: any[] = [];
      snapshot.forEach((doc) => {
        todos.push({ id: doc.id, ...doc.data() });
      });
      localStorage.setItem(STORAGE_KEYS.TODO_ITEMS, JSON.stringify(todos));
      this.notifyListeners({ type: 'todos', data: todos });
    });
    this.unsubscribers.push(todosUnsub);
  }

  cleanup() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }

  async syncAllData(): Promise<{ success: boolean; error?: string }> {
    if (!this.userId) {
      const signedIn = await this.signIn();
      if (!signedIn) {
        return { success: false, error: 'Failed to authenticate' };
      }
    }

    try {
      // Push local data to Firebase
      await this.pushNotes();
      await this.pushFolders();
      await this.pushTodos();
      
      this.setLastSyncTime();
      return { success: true };
    } catch (error) {
      console.error('Sync error:', error);
      return { success: false, error: 'Sync failed' };
    }
  }

  private async pushNotes() {
    if (!this.userId) return;
    
    const notesJson = localStorage.getItem(STORAGE_KEYS.NOTES);
    if (!notesJson) return;
    
    const notes = JSON.parse(notesJson);
    const batch = writeBatch(db);
    
    for (const note of notes) {
      const noteRef = doc(db, 'users', this.userId, 'notes', note.id);
      batch.set(noteRef, {
        ...note,
        deviceId: getDeviceId(),
        updatedAt: new Date().toISOString()
      });
    }
    
    await batch.commit();
  }

  private async pushFolders() {
    if (!this.userId) return;
    
    const foldersJson = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    if (!foldersJson) return;
    
    const folders = JSON.parse(foldersJson);
    const batch = writeBatch(db);
    
    for (const folder of folders) {
      const folderRef = doc(db, 'users', this.userId, 'folders', folder.id);
      batch.set(folderRef, {
        ...folder,
        deviceId: getDeviceId(),
        updatedAt: new Date().toISOString()
      });
    }
    
    await batch.commit();
  }

  private async pushTodos() {
    if (!this.userId) return;
    
    const todosJson = localStorage.getItem(STORAGE_KEYS.TODO_ITEMS);
    if (!todosJson) return;
    
    const todos = JSON.parse(todosJson);
    const batch = writeBatch(db);
    
    for (const todo of todos) {
      const todoRef = doc(db, 'users', this.userId, 'todos', todo.id);
      batch.set(todoRef, {
        ...todo,
        deviceId: getDeviceId(),
        updatedAt: new Date().toISOString()
      });
    }
    
    await batch.commit();
  }

  async pullAllData(): Promise<{ success: boolean; error?: string }> {
    if (!this.userId) {
      const signedIn = await this.signIn();
      if (!signedIn) {
        return { success: false, error: 'Failed to authenticate' };
      }
    }

    try {
      // Pull notes
      const notesSnapshot = await getDocs(collection(db, 'users', this.userId!, 'notes'));
      const notes: any[] = [];
      notesSnapshot.forEach((doc) => {
        notes.push({ id: doc.id, ...doc.data() });
      });
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));

      // Pull folders
      const foldersSnapshot = await getDocs(collection(db, 'users', this.userId!, 'folders'));
      const folders: any[] = [];
      foldersSnapshot.forEach((doc) => {
        folders.push({ id: doc.id, ...doc.data() });
      });
      localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));

      // Pull todos
      const todosSnapshot = await getDocs(collection(db, 'users', this.userId!, 'todos'));
      const todos: any[] = [];
      todosSnapshot.forEach((doc) => {
        todos.push({ id: doc.id, ...doc.data() });
      });
      localStorage.setItem(STORAGE_KEYS.TODO_ITEMS, JSON.stringify(todos));

      this.setLastSyncTime();
      this.notifyListeners({ type: 'all', data: { notes, folders, todos } });
      
      return { success: true };
    } catch (error) {
      console.error('Pull error:', error);
      return { success: false, error: 'Pull failed' };
    }
  }

  async deleteNote(noteId: string): Promise<void> {
    if (!this.userId) return;
    await deleteDoc(doc(db, 'users', this.userId, 'notes', noteId));
  }

  async deleteFolder(folderId: string): Promise<void> {
    if (!this.userId) return;
    await deleteDoc(doc(db, 'users', this.userId, 'folders', folderId));
  }

  async deleteTodo(todoId: string): Promise<void> {
    if (!this.userId) return;
    await deleteDoc(doc(db, 'users', this.userId, 'todos', todoId));
  }

  getUserId(): string | null {
    return this.userId;
  }
}

export const firebaseSyncManager = FirebaseSyncManager.getInstance();
