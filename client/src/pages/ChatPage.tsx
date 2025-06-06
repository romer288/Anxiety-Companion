import { useEffect, useState } from 'react';
import ChatInterface from '../components/ChatInterface';
import { useSession } from '../context/SessionContext';
import { useAuthStore } from '../context/auth-store';
import { Spinner } from '../components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function ChatPage() {
  const { currentSession, isSessionActive, startNewSession } = useSession();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create session on component mount if needed
  useEffect(() => {
    const createSessionIfNeeded = async () => {
      // Skip if session already exists or if we're already loading
      if (isSessionActive || loading) return;
      
      // Need a user to create a session
      if (!user?.id) {
        // If not logged in use a temporary ID
        const tempUserId = 'temp-user-' + Date.now();
        try {
          setLoading(true);
          setError(null);
          console.log('Creating new session for temp user:', tempUserId);
          await startNewSession(tempUserId);
        } catch (err: any) {
          console.error('Error creating session:', err);
          setError(err.message || 'Failed to create a chat session');
        } finally {
          setLoading(false);
        }
      } else {
        try {
          setLoading(true);
          setError(null);
          console.log('Creating new session for user:', user.id);
          await startNewSession(user.id);
        } catch (err: any) {
          console.error('Error creating session:', err);
          setError(err.message || 'Failed to create a chat session');
        } finally {
          setLoading(false);
        }
      }
    };

    createSessionIfNeeded();
  }, [isSessionActive, loading, user, startNewSession]);

  return (
    <div className="container mx-auto h-full max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Chat with Anxiety Companion</h1>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="h-[calc(100vh-200px)]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size="lg" />
            <span className="ml-3">Creating session...</span>
          </div>
        ) : (
          <ChatInterface />
        )}
      </div>
    </div>
  );
}