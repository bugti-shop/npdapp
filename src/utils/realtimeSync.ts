import { realtimeDb, auth } from '@/lib/firebase';
import { ref, set, get, onValue, off, remove, update } from 'firebase/database';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';

const STORAGE_KEYS = {
  NOTES: 'notes',
  FOLDERS: 'folders',
  TODO_ITEMS: 'nota-todo-items',
  SYNC_ENABLED: 'firebase-sync-enabled',
  DEVICE_ID: 'firebase-device-id',
  LAST_SYNC: 'firebase-last-sync',
  AUTO_SYNC: 'firebase-auto-sync',
};

const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
  }
  return deviceId;
};

class RealtimeSyncManager {
  private static instance: RealtimeSyncManager;
  private userId: string | null = null;
  private userEmail: string | null = null;
  private syncListeners: ((data: any) => void)[] = [];
  private authListeners: ((user: User | null) => void)[] = [];
  private syncDebounceTimer: NodeJS.Timeout | null = null;
  private unsubscribeCallbacks: (() => void)[] = [];

  private constructor() {
    this.initAuth();
  }

  static getInstance(): RealtimeSyncManager {
    if (!RealtimeSyncManager.instance) {
      RealtimeSyncManager.instance = new RealtimeSyncManager();
    }
    return RealtimeSyncManager.instance;
  }

  private initAuth() {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.userId = user.uid;
        this.userEmail = user.email;
        if (this.isSyncEnabled()) {
          this.setupRealtimeListeners();
        }
      } else {
        this.userId = null;
        this.userEmail = null;
        this.cleanup();
      }
      this.authListeners.forEach(cb => cb(user));
    });
  }

  onAuthChange(callback: (user: User | null) => void) {
    this.authListeners.push(callback);
    if (auth.currentUser) {
      callback(auth.currentUser);
    }
    return () => {
      this.authListeners = this.authListeners.filter(cb => cb !== callback);
    };
  }

  async signUp(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      this.userId = result.user.uid;
      this.userEmail = result.user.email;
      return { success: true };
    } catch (error: any) {
      console.error('Firebase sign up error:', error);
      let errorMessage = 'Sign up failed';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      }
      return { success: false, error: errorMessage };
    }
  }

  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      this.userId = result.user.uid;
      this.userEmail = result.user.email;
      return { success: true };
    } catch (error: any) {
      console.error('Firebase sign in error:', error);
      let errorMessage = 'Sign in failed';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later';
      }
      return { success: false, error: errorMessage };
    }
  }

  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
      this.userId = null;
      this.userEmail = null;
      this.cleanup();
      this.setSyncEnabled(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  isAuthenticated(): boolean {
    return this.userId !== null;
  }

  getUserEmail(): string | null {
    return this.userEmail;
  }

  getUserId(): string | null {
    return this.userId;
  }

  isSyncEnabled(): boolean {
    return localStorage.getItem(STORAGE_KEYS.SYNC_ENABLED) === 'true';
  }

  setSyncEnabled(enabled: boolean) {
    localStorage.setItem(STORAGE_KEYS.SYNC_ENABLED, enabled.toString());
    if (enabled && this.userId) {
      this.setupRealtimeListeners();
    } else {
      this.cleanup();
    }
  }

  isAutoSyncEnabled(): boolean {
    return localStorage.getItem(STORAGE_KEYS.AUTO_SYNC) !== 'false';
  }

  setAutoSyncEnabled(enabled: boolean) {
    localStorage.setItem(STORAGE_KEYS.AUTO_SYNC, enabled.toString());
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

  triggerAutoSync() {
    if (!this.isSyncEnabled() || !this.isAutoSyncEnabled() || !this.userId) return;
    
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }
    
    this.syncDebounceTimer = setTimeout(() => {
      this.syncAllData();
    }, 2000);
  }

  private setupRealtimeListeners() {
    if (!this.userId) return;
    
    this.cleanup();

    // Listen to notes
    const notesRef = ref(realtimeDb, `users/${this.userId}/notes`);
    const notesCallback = onValue(notesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const notes = Object.values(data);
        localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
        this.notifyListeners({ type: 'notes', data: notes });
      }
    });
    this.unsubscribeCallbacks.push(() => off(notesRef));

    // Listen to folders
    const foldersRef = ref(realtimeDb, `users/${this.userId}/folders`);
    const foldersCallback = onValue(foldersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const folders = Object.values(data);
        localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
        this.notifyListeners({ type: 'folders', data: folders });
      }
    });
    this.unsubscribeCallbacks.push(() => off(foldersRef));

    // Listen to todos
    const todosRef = ref(realtimeDb, `users/${this.userId}/todos`);
    const todosCallback = onValue(todosRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const todos = Object.values(data);
        localStorage.setItem(STORAGE_KEYS.TODO_ITEMS, JSON.stringify(todos));
        this.notifyListeners({ type: 'todos', data: todos });
      }
    });
    this.unsubscribeCallbacks.push(() => off(todosRef));
  }

  cleanup() {
    this.unsubscribeCallbacks.forEach(unsub => unsub());
    this.unsubscribeCallbacks = [];
  }

  async syncAllData(): Promise<{ success: boolean; error?: string }> {
    if (!this.userId) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      await this.pushNotes();
      await this.pushFolders();
      await this.pushTodos();
      
      this.setLastSyncTime();
      this.notifyListeners({ type: 'sync_complete' });
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
    const updates: Record<string, any> = {};
    
    for (const note of notes) {
      updates[`users/${this.userId}/notes/${note.id}`] = {
        ...note,
        deviceId: getDeviceId(),
        updatedAt: new Date().toISOString()
      };
    }
    
    await update(ref(realtimeDb), updates);
  }

  private async pushFolders() {
    if (!this.userId) return;
    
    const foldersJson = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    if (!foldersJson) return;
    
    const folders = JSON.parse(foldersJson);
    const updates: Record<string, any> = {};
    
    for (const folder of folders) {
      updates[`users/${this.userId}/folders/${folder.id}`] = {
        ...folder,
        deviceId: getDeviceId(),
        updatedAt: new Date().toISOString()
      };
    }
    
    await update(ref(realtimeDb), updates);
  }

  private async pushTodos() {
    if (!this.userId) return;
    
    const todosJson = localStorage.getItem(STORAGE_KEYS.TODO_ITEMS);
    if (!todosJson) return;
    
    const todos = JSON.parse(todosJson);
    const updates: Record<string, any> = {};
    
    for (const todo of todos) {
      updates[`users/${this.userId}/todos/${todo.id}`] = {
        ...todo,
        deviceId: getDeviceId(),
        updatedAt: new Date().toISOString()
      };
    }
    
    await update(ref(realtimeDb), updates);
  }

  async pullAllData(): Promise<{ success: boolean; error?: string }> {
    if (!this.userId) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Pull notes
      const notesSnapshot = await get(ref(realtimeDb, `users/${this.userId}/notes`));
      if (notesSnapshot.exists()) {
        const notes = Object.values(notesSnapshot.val());
        localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
      }

      // Pull folders
      const foldersSnapshot = await get(ref(realtimeDb, `users/${this.userId}/folders`));
      if (foldersSnapshot.exists()) {
        const folders = Object.values(foldersSnapshot.val());
        localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
      }

      // Pull todos
      const todosSnapshot = await get(ref(realtimeDb, `users/${this.userId}/todos`));
      if (todosSnapshot.exists()) {
        const todos = Object.values(todosSnapshot.val());
        localStorage.setItem(STORAGE_KEYS.TODO_ITEMS, JSON.stringify(todos));
      }

      this.setLastSyncTime();
      this.notifyListeners({ type: 'all', data: {} });
      
      return { success: true };
    } catch (error) {
      console.error('Pull error:', error);
      return { success: false, error: 'Pull failed' };
    }
  }

  async deleteNote(noteId: string): Promise<void> {
    if (!this.userId) return;
    await remove(ref(realtimeDb, `users/${this.userId}/notes/${noteId}`));
  }

  async deleteFolder(folderId: string): Promise<void> {
    if (!this.userId) return;
    await remove(ref(realtimeDb, `users/${this.userId}/folders/${folderId}`));
  }

  async deleteTodo(todoId: string): Promise<void> {
    if (!this.userId) return;
    await remove(ref(realtimeDb, `users/${this.userId}/todos/${todoId}`));
  }
}

export const realtimeSyncManager = RealtimeSyncManager.getInstance();