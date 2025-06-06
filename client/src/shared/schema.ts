// This is a simplified version of the schema.ts file from the shared directory
// In a real implementation, these types would be shared between client and server

export type SupportedLanguage = "en" | "es" | "pt";

export interface AnxietySession {
  id?: number;
  userId: string;
  language: SupportedLanguage;
  startTime: string;
  endTime?: string | null;
  stage: 'idle' | 'assessment' | 'analysis' | 'intervention' | 'complete';
  triggerCategory: string | null;
  triggerDescription: string | null;
  preAnxietyLevel: number | null;
  intervention: string | null;
  interventionType: string | null;
  postAnxietyLevel: number | null;
  notes: string | null;
}

export interface Message {
  id?: number;
  sessionId?: number;
  type: 'message' | 'system';
  content: string;
  isUser: boolean;
  timestamp: string;
}

export interface ConversationMessage {
  id: number;
  sessionId: number;
  text: string;
  isUser: boolean;
  timestamp: string;
  type: string;
}