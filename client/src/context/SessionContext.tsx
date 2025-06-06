import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AnxietySession, SupportedLanguage } from '../shared/schema';
import { useAuthStore } from './auth-store';
import { useToast } from '../hooks/use-toast';

// Define the context interface
interface SessionContextType {
  userId: string;
  user: { id: string } | null;
  currentSession: AnxietySession;
  isSessionActive: boolean;
  startNewSession: (userId: string) => Promise<AnxietySession>;
  endCurrentSession: () => Promise<void>;
  updateSession: (data: Partial<AnxietySession>) => Promise<void>;
}

// Create default values
const defaultSession: AnxietySession = {
  userId: '',
  language: 'en' as SupportedLanguage,
  startTime: new Date().toISOString(),
  stage: 'idle',
  triggerCategory: null,
  triggerDescription: null,
  preAnxietyLevel: null,
  intervention: null,
  interventionType: null,
  postAnxietyLevel: null,
  notes: null
};

// Create the context
const SessionContext = createContext<SessionContextType>({
  userId: '',
  user: null,
  currentSession: defaultSession,
  isSessionActive: false,
  startNewSession: async () => defaultSession,
  endCurrentSession: async () => {},
  updateSession: async () => {},
});

// Provider component
export const SessionProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { user, profile } = useAuthStore();
  const { toast } = useToast();
  const [currentSession, setCurrentSession] = useState<AnxietySession>(defaultSession);
  const [isSessionActive, setIsSessionActive] = useState(false);
  
  // Keep track of initialization to avoid multiple session creations
  const [initialized, setInitialized] = useState(false);
  
  // Start a new anxiety session - define with useCallback to avoid circular dependency
  const startNewSession = useCallback(async (userId: string): Promise<AnxietySession> => {
    try {
      // Create session data
      const sessionData: AnxietySession = {
        ...defaultSession,
        userId,
        language: profile?.language || 'en',
        startTime: new Date().toISOString(),
        stage: 'idle',
      };
      
      // Check if we already have an active session to avoid duplication
      if (isSessionActive && currentSession.id) {
        console.log('Session already exists:', currentSession);
        return currentSession;
      }
      
      // Call the API to create a session
      console.log('Creating session with data:', sessionData);
      
      // Use the real API endpoint
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status} ${response.statusText}`);
      }
      
      const newSession = await response.json();
      
      // Save to state and localStorage for persistence
      setCurrentSession(newSession);
      setIsSessionActive(true);
      localStorage.setItem('anxiety_session', JSON.stringify(newSession));
      
      console.log('Session created:', newSession);
      return newSession;
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: 'Error',
        description: 'Failed to start session',
        variant: 'destructive',
      });
      throw error;
    }
  }, [profile?.language, isSessionActive, currentSession.id, toast]);
  
  // Initialize session when the component mounts - but don't auto-create
  useEffect(() => {
    if (initialized) return;
    
    const initializeSession = async () => {
      console.log('Initializing session management...');
      setInitialized(true);
      
      // Just mark as initialized - let ChatInterface create session when needed
      localStorage.removeItem('anxiety_session');
    };
    
    initializeSession();
  }, [initialized]);
  
  // Update language preference when profile changes
  useEffect(() => {
    if (profile?.language && currentSession) {
      setCurrentSession(prev => ({
        ...prev,
        language: profile.language
      }));
    }
  }, [profile?.language]);
  
  // End the current session
  const endCurrentSession = async (): Promise<void> => {
    if (!currentSession.id) return;
    
    try {
      const updateData = {
        stage: 'complete',
        endTime: new Date().toISOString(),
      };
      
      // Call the API to update the session
      console.log(`Ending session ${currentSession.id} with data:`, updateData);
      
      // Use the real API endpoint
      const response = await fetch(`/api/sessions/${currentSession.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to end session: ${response.status} ${response.statusText}`);
      }
      
      const endedSession = await response.json();
      
      // Update state and localStorage
      setCurrentSession(endedSession);
      setIsSessionActive(false);
      localStorage.setItem('anxiety_session', JSON.stringify(endedSession));
      
      toast({
        title: 'Session Ended',
        description: 'Your session has been saved',
      });
    } catch (error) {
      console.error('Error ending session:', error);
      toast({
        title: 'Error',
        description: 'Failed to end session',
        variant: 'destructive',
      });
      throw error;
    }
  };
  
  // Update session data
  const updateSession = async (data: Partial<AnxietySession>): Promise<void> => {
    if (!currentSession.id) {
      console.error('No active session to update');
      return;
    }
    
    try {
      // Call the API to update the session
      console.log(`Updating session ${currentSession.id} with data:`, data);
      
      // Use the real API endpoint
      const response = await fetch(`/api/sessions/${currentSession.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update session: ${response.status} ${response.statusText}`);
      }
      
      const updatedSession = await response.json();
      
      // Update state and localStorage
      setCurrentSession(updatedSession);
      localStorage.setItem('anxiety_session', JSON.stringify(updatedSession));
    } catch (error) {
      console.error('Error updating session:', error);
      toast({
        title: 'Error',
        description: 'Failed to update session',
        variant: 'destructive',
      });
      throw error;
    }
  };
  
  // Provide value to consumers
  const contextValue: SessionContextType = {
    userId: user?.id || '',
    user: user ? { id: user.id } : null,
    currentSession,
    isSessionActive,
    startNewSession,
    endCurrentSession,
    updateSession,
  };
  
  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
};

// Custom hook for using session context
export function useSession() {
  return useContext(SessionContext);
}