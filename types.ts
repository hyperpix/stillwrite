
export type FontType = 'sans' | 'lato' | 'serif' | 'mono';

export interface AppSettings {
  fontSize: number;
  fontFamily: FontType;
  theme: 'light' | 'dark';
  isZenMode: boolean;
}

export interface NoteEntry {
  id: string;
  content: string;
  createdAt: number;
  snippet: string;
  updatedAt?: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
