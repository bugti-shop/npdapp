import { GOOGLE_CLIENT_ID } from '@/lib/firebase';
import { TodoItem } from '@/types/note';
import { Capacitor } from '@capacitor/core';

const GOOGLE_ACCESS_TOKEN_KEY = 'googleAccessToken';
const GOOGLE_REFRESH_TOKEN_KEY = 'googleRefreshToken';
const GOOGLE_TOKEN_EXPIRY_KEY = 'googleTokenExpiry';
const GOOGLE_CALENDAR_ENABLED_KEY = 'googleCalendarEnabled';
const GOOGLE_AUTH_RETURN_TO_KEY = 'googleAuthReturnTo';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
].join(' ');

export interface GoogleCalendar {
  id: string;
  summary: string;
  backgroundColor?: string;
  primary?: boolean;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
}

class GoogleCalendarAuth {
  private static instance: GoogleCalendarAuth;

  private constructor() {}

  static getInstance(): GoogleCalendarAuth {
    if (!GoogleCalendarAuth.instance) {
      GoogleCalendarAuth.instance = new GoogleCalendarAuth();
    }
    return GoogleCalendarAuth.instance;
  }

  isEnabled(): boolean {
    return localStorage.getItem(GOOGLE_CALENDAR_ENABLED_KEY) === 'true';
  }

  setEnabled(enabled: boolean): void {
    localStorage.setItem(GOOGLE_CALENDAR_ENABLED_KEY, String(enabled));
  }

  getAccessToken(): string | null {
    const token = localStorage.getItem(GOOGLE_ACCESS_TOKEN_KEY);
    const expiry = localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY);
    
    if (!token || !expiry) return null;
    
    // Check if token is expired
    if (new Date().getTime() > parseInt(expiry)) {
      this.clearTokens();
      return null;
    }
    
    return token;
  }

  setAccessToken(token: string, expiresIn: number): void {
    localStorage.setItem(GOOGLE_ACCESS_TOKEN_KEY, token);
    localStorage.setItem(GOOGLE_TOKEN_EXPIRY_KEY, String(new Date().getTime() + expiresIn * 1000));
  }

  clearTokens(): void {
    localStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
    localStorage.removeItem(GOOGLE_REFRESH_TOKEN_KEY);
    localStorage.removeItem(GOOGLE_TOKEN_EXPIRY_KEY);
    this.setEnabled(false);
  }

  setReturnTo(path: string): void {
    localStorage.setItem(GOOGLE_AUTH_RETURN_TO_KEY, path);
  }

  getReturnTo(): string {
    return localStorage.getItem(GOOGLE_AUTH_RETURN_TO_KEY) || '/settings';
  }

  clearReturnTo(): void {
    localStorage.removeItem(GOOGLE_AUTH_RETURN_TO_KEY);
  }

  getAuthUrl(returnTo?: string): string {
    // Store where to return after auth
    if (returnTo) {
      this.setReturnTo(returnTo);
    }

    // Determine the redirect URI based on platform
    let redirectUri: string;
    
    if (Capacitor.isNativePlatform()) {
      // For native Android/iOS, use the app's custom URL scheme
      redirectUri = 'app.nota.com://auth/google/callback';
    } else {
      // For web, use the current origin
      redirectUri = `${window.location.origin}/auth/google/callback`;
    }
    
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'token',
      scope: SCOPES,
      include_granted_scopes: 'true',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  handleAuthCallback(): boolean {
    const hash = window.location.hash;
    if (!hash) return false;

    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    const expiresIn = params.get('expires_in');

    if (accessToken && expiresIn) {
      this.setAccessToken(accessToken, parseInt(expiresIn));
      this.setEnabled(true);
      
      // Clear the hash from URL
      window.history.replaceState(null, '', window.location.pathname);
      return true;
    }

    return false;
  }

  async fetchCalendars(): Promise<GoogleCalendar[]> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated with Google');
    }

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        this.clearTokens();
        throw new Error('Google authentication expired. Please reconnect.');
      }
      throw new Error('Failed to fetch calendars');
    }

    const data = await response.json();
    return data.items || [];
  }

  async fetchEvents(calendarId: string, timeMin: Date, timeMax: Date): Promise<CalendarEvent[]> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated with Google');
    }

    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '100',
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        this.clearTokens();
        throw new Error('Google authentication expired. Please reconnect.');
      }
      throw new Error('Failed to fetch events');
    }

    const data = await response.json();
    return data.items || [];
  }

  async importEventsAsTasks(calendarIds: string[]): Promise<{ tasks: TodoItem[]; count: number }> {
    const tasks: TodoItem[] = [];
    
    const now = new Date();
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 3);

    for (const calendarId of calendarIds) {
      try {
        const events = await this.fetchEvents(calendarId, now, futureDate);
        
        for (const event of events) {
          if (!event.summary) continue;

          const task: TodoItem = {
            id: `gcal-${event.id}`,
            text: event.summary,
            completed: false,
            description: event.description || '',
            location: event.location,
            dueDate: event.start?.dateTime 
              ? new Date(event.start.dateTime)
              : event.start?.date 
              ? new Date(event.start.date)
              : undefined,
            googleCalendarEventId: event.id,
          };

          tasks.push(task);
        }
      } catch (error) {
        console.error(`Error importing from calendar ${calendarId}:`, error);
      }
    }

    return { tasks, count: tasks.length };
  }

  disconnect(): void {
    this.clearTokens();
  }
}

export const googleCalendarAuth = GoogleCalendarAuth.getInstance();