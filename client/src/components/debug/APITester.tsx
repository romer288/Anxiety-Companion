import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { submitMessage } from "../../lib/session-utils";
import { createAnxietySession } from "../../lib/session-utils";
import { useToast } from "../../hooks/use-toast";

export default function APITester() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Create a test session
  const handleCreateSession = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Creating test session");
      const session = await createAnxietySession("test-user-debug");
      console.log("Test session created:", session);
      setSessionId(session.id);
      toast({
        title: "Session created",
        description: `Created session with ID ${session.id}`
      });
    } catch (err: any) {
      console.error("Error creating session:", err);
      setError(err.message || "Failed to create session");
      toast({
        variant: "destructive",
        title: "Error creating session",
        description: err.message || "An error occurred"
      });
    } finally {
      setLoading(false);
    }
  };

  // Send a test message
  const handleSendMessage = async () => {
    if (!sessionId) {
      setError("No session ID. Create a session first.");
      return;
    }
    
    if (!message.trim()) {
      setError("Please enter a message to send");
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    
    try {
      console.log(`Sending test message to session ${sessionId}: "${message}"`);
      const result = await submitMessage(sessionId, message, true);
      console.log("Message response:", result);
      setResponse(result);
      toast({
        title: "Message sent",
        description: "Successfully received response from API"
      });
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError(err.message || "Failed to send message");
      toast({
        variant: "destructive",
        title: "Error sending message",
        description: err.message || "An error occurred"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto mb-8">
      <CardHeader>
        <CardTitle>API Tester</CardTitle>
        <CardDescription>Test API connections directly</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Session ID</Label>
            <Button 
              onClick={handleCreateSession} 
              disabled={loading}
              variant="outline" 
              size="sm"
            >
              Create Test Session
            </Button>
          </div>
          <Input 
            value={sessionId || ''} 
            onChange={(e) => setSessionId(Number(e.target.value))} 
            placeholder="Session ID" 
            disabled={loading}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Message</Label>
          <div className="flex space-x-2">
            <Input 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder="Enter message to send" 
              disabled={loading}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={loading || !sessionId || !message.trim()}
            >
              Send
            </Button>
          </div>
        </div>
        
        {response && (
          <div className="space-y-2 mt-4">
            <Label>Response</Label>
            <div className="bg-gray-100 p-4 rounded-md overflow-auto max-h-64">
              <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(response, null, 2)}</pre>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-gray-500">
        This component is for debugging purposes only.
      </CardFooter>
    </Card>
  );
}