export interface User {
  id: string;
  email: string | null;
  password: string | null;
  fullName?: string | null;
  zipCode?: string | null;
  city?: string | null;
  age?: number | null;
  instagramHandle?: string | null;
  preferredLanguage: string;
  isTherapist: boolean | null;
}

export interface AnxietySession {
  id: number;
  userId: string;
  language: string;
  startTime: string;
  endTime?: string | null;
  triggerCategory: string | null;
  triggerDescription: string | null;
  triggerEvents?: any;
  triggerLocation?: string | null;
  preAnxietyLevel: number | null;
  intervention: string | null;
  interventionType: string | null;
  postAnxietyLevel: number | null;
  notes: string | null;
  stage: string;
  aiDetectedInsights?: Record<string, any>;
}

export interface Message {
  type: "message" | "system" | "error" | "typing";
  text: string | React.ReactNode;
  isUser?: boolean;
  timestamp: string;
}

export interface TriggerCategory {
  id: string;
  label: string;
}

export interface Intervention {
  id: string;
  name: string;
  description: string;
  forTriggers: string[];
  type?: string;
}
