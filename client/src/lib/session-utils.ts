import { apiRequest } from "./queryClient";
import { AnxietySession } from "./types";

// Create a new anxiety session
export async function createAnxietySession(userId: string): Promise<AnxietySession> {
  try {
    console.log("Creating new session with userId:", userId);
    
    const sessionData = {
      userId,
      language: "en", // Default language, can be changed by user
      startTime: new Date().toISOString(), // Convert Date to ISO string format to avoid serialization issues
      stage: "idle",
      triggerCategory: null,
      triggerDescription: null,
      preAnxietyLevel: null,
      intervention: null,
      interventionType: null,
      postAnxietyLevel: null,
      notes: null,
    };
    
    console.log("Session data:", JSON.stringify(sessionData));
    
    const res = await apiRequest("POST", "/api/sessions", sessionData);
    
    if (!res.ok) {
      console.error("Failed to create session:", res.status, res.statusText);
      const errorText = await res.text();
      console.error("Error response:", errorText);
      throw new Error(`Failed to create session: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log("Created session:", JSON.stringify(data));
    return data;
  } catch (error) {
    console.error("Error in createAnxietySession:", error);
    // Throw the error instead of creating a fake session
    throw new Error("Failed to create anxiety session. Please try again.");
  }
}

// Update an anxiety session
export async function updateAnxietySession(
  sessionId: number, 
  data: Partial<AnxietySession>
): Promise<AnxietySession> {
  try {
    console.log(`Updating session ${sessionId} with data:`, JSON.stringify(data));
    
    const res = await apiRequest("PUT", `/api/sessions/${sessionId}`, data);
    
    if (!res.ok) {
      console.error("Failed to update session:", res.status, res.statusText);
      const errorText = await res.text();
      console.error("Error response:", errorText);
      throw new Error(`Failed to update session: ${res.status} ${res.statusText}`);
    }
    
    const updatedSession = await res.json();
    console.log("Updated session:", JSON.stringify(updatedSession));
    return updatedSession;
  } catch (error) {
    console.error("Error updating anxiety session:", error);
    throw new Error("Failed to update anxiety session. Please try again.");
  }
}

// Get a specific anxiety session
export async function getAnxietySession(sessionId: number): Promise<AnxietySession> {
  try {
    console.log(`Fetching session with ID: ${sessionId}`);
    
    const res = await apiRequest("GET", `/api/sessions/${sessionId}`, undefined);
    
    if (!res.ok) {
      console.error("Failed to fetch session:", res.status, res.statusText);
      const errorText = await res.text();
      console.error("Error response:", errorText);
      throw new Error(`Failed to fetch session: ${res.status} ${res.statusText}`);
    }
    
    const session = await res.json();
    console.log("Fetched session:", JSON.stringify(session));
    return session;
  } catch (error) {
    console.error("Error getting anxiety session:", error);
    throw new Error("Failed to retrieve anxiety session. Please try again.");
  }
}

// Get anxiety sessions by user ID
export async function getAnxietySessionsByUserId(userId: string): Promise<AnxietySession[]> {
  const res = await apiRequest("GET", `/api/sessions?userId=${userId}`, undefined);
  return await res.json();
}

// Get conversation history for a session
export async function getConversationHistory(sessionId: number): Promise<any[]> {
  try {
    console.log(`Fetching conversation history for session: ${sessionId}`);
    
    const res = await apiRequest("GET", `/api/sessions/${sessionId}/messages`, undefined);
    
    if (!res.ok) {
      console.error("Failed to fetch conversation history:", res.status, res.statusText);
      const errorText = await res.text();
      console.error("Error response:", errorText);
      throw new Error(`Failed to fetch conversation history: ${res.status} ${res.statusText}`);
    }
    
    const messages = await res.json();
    console.log(`Fetched ${messages.length} messages for session ${sessionId}`);
    return messages;
  } catch (error) {
    console.error("Error getting conversation history:", error);
    throw new Error("Failed to retrieve conversation history. Please try again.");
  }
}

// Submit a message to a session
export async function submitMessage(sessionId: number, text: string, isUser: boolean): Promise<any> {
  // If it's a user message, use the chat API to get AI response
  if (isUser) {
    try {
      console.log(`Submitting message to chat API for session ${sessionId}: "${text}"`);
      
      // Create request payload
      const payload = {
        sessionId,
        text
      };
      
      console.log("Request payload:", JSON.stringify(payload));
      
      // Send the request
      const res = await apiRequest("POST", "/api/chat", payload);
      
      if (!res.ok) {
        console.error(`Chat API request failed with status: ${res.status}`);
        const errorText = await res.text();
        console.error("Error response:", errorText);
        throw new Error(`Chat API request failed: ${res.status} ${res.statusText}`);
      }
      
      const responseData = await res.json();
      console.log("Chat API response:", JSON.stringify(responseData));
      return responseData;
    } catch (error) {
      console.error("Error submitting message to chat API:", error);
      throw error;
    }
  } else {
    // If it's an AI message, just save it to the database
    const res = await apiRequest("POST", `/api/sessions/${sessionId}/messages`, {
      text,
      isUser,
    });
    
    return await res.json();
  }
}

// End a session
export async function endSession(sessionId: number): Promise<AnxietySession> {
  return updateAnxietySession(sessionId, {
    endTime: new Date().toISOString(),
    stage: "completed",
  });
}
