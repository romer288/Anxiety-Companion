import { 
  users, 
  anxietySessions, 
  conversationMessages, 
  triggerCategories, 
  therapistApprovedInterventions,
  type User, 
  type InsertUser, 
  type AnxietySession, 
  type InsertAnxietySession,
  type ConversationMessage,
  type InsertConversationMessage
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByInstagramHandle(instagramHandle: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;

  // Anxiety Session methods
  createAnxietySession(session: InsertAnxietySession): Promise<AnxietySession>;
  getAnxietySession(id: number): Promise<AnxietySession | undefined>;
  getAnxietySessionsByUserId(userId: string): Promise<AnxietySession[]>;
  updateAnxietySession(id: number, data: Partial<InsertAnxietySession>): Promise<AnxietySession | undefined>;
  updateSessionState(id: number, userMessage: string, aiResponse: string): Promise<AnxietySession | undefined>;

  // Conversation methods
  addConversationMessage(message: InsertConversationMessage): Promise<ConversationMessage>;
  getConversationHistory(sessionId: number): Promise<ConversationMessage[]>;

  // Utility methods
  getTriggerCategories(): typeof triggerCategories;
  getTherapistApprovedInterventions(): typeof therapistApprovedInterventions;
  selectAppropriateIntervention(triggerCategory: string | null, anxietyLevel: number | null, language?: string): any;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private anxietySessions: Map<number, AnxietySession>;
  private messages: Map<number, ConversationMessage>;
  
  private userId: number;
  private sessionId: number;
  private messageId: number;

  constructor() {
    this.users = new Map();
    this.anxietySessions = new Map();
    this.messages = new Map();
    
    this.userId = 1;
    this.sessionId = 1;
    this.messageId = 1;

    // Create default user
    this.createUser({
      username: "user@example.com",
      password: "password123",
      fullName: "Sarah Johnson",
      isTherapist: false
    });

    // Create example therapist
    this.createUser({
      username: "therapist@example.com",
      password: "therapist123",
      fullName: "Dr. Mark Wilson",
      isTherapist: true
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Anxiety Session methods
  async createAnxietySession(sessionData: InsertAnxietySession): Promise<AnxietySession> {
    const id = this.sessionId++;
    const session: AnxietySession = { ...sessionData, id };
    this.anxietySessions.set(id, session);
    return session;
  }

  async getAnxietySession(id: number): Promise<AnxietySession | undefined> {
    return this.anxietySessions.get(id);
  }

  async getAnxietySessionsByUserId(userId: number): Promise<AnxietySession[]> {
    return Array.from(this.anxietySessions.values())
      .filter(session => session.userId === userId)
      .sort((a, b) => {
        // Sort by start time, newest first
        return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
      });
  }

  async updateAnxietySession(id: number, data: Partial<InsertAnxietySession>): Promise<AnxietySession | undefined> {
    const session = this.anxietySessions.get(id);
    
    if (!session) {
      return undefined;
    }
    
    const updatedSession = { ...session, ...data };
    this.anxietySessions.set(id, updatedSession);
    
    return updatedSession;
  }

  async updateSessionState(id: number, userMessage: string, aiResponse: string): Promise<AnxietySession | undefined> {
    const session = this.anxietySessions.get(id);
    
    if (!session) {
      return undefined;
    }
    
    // Update session based on conversation flow
    let updatedData: Partial<InsertAnxietySession> = {};
    
    // If session is idle, start a new session when user messages
    if (session.stage === 'idle' || session.stage === 'completed') {
      updatedData = {
        stage: "assessing"
      };
    }
    
    // Example: Detecting trigger selection
    if (session.stage === 'assessing' && aiResponse.includes("what's triggering your anxiety")) {
      updatedData = {
        stage: 'selecting-trigger'
      };
    }
    
    if (session.stage === 'selecting-trigger') {
      for (const trigger of triggerCategories) {
        if (userMessage.toLowerCase().includes(trigger.id) || 
            userMessage.toLowerCase().includes(trigger.label.toLowerCase())) {
          updatedData = {
            triggerCategory: trigger.id,
            stage: 'trigger-description'
          };
          break;
        }
      }
    }
    
    // Example: Detecting anxiety rating request
    if (aiResponse.includes("scale of 0-10") && session.stage === 'trigger-description') {
      updatedData = {
        triggerDescription: userMessage,
        stage: 'anxiety-rating'
      };
    }
    
    // Example: Detecting anxiety rating
    if (session.stage === 'anxiety-rating') {
      const numberMatch = userMessage.match(/\d+/);
      if (numberMatch) {
        const rating = parseInt(numberMatch[0]);
        if (rating >= 0 && rating <= 10) {
          // Select intervention based on rating
          const selectedIntervention = this.selectAppropriateIntervention(
            session.triggerCategory,
            rating
          );
          
          updatedData = {
            preAnxietyLevel: rating,
            intervention: selectedIntervention.id,
            interventionType: selectedIntervention.type,
            stage: 'delivering-intervention'
          };
        }
      }
    }
    
    // Check if AI is transitioning to intervention
    if ((aiResponse.includes("guide you through") || aiResponse.includes("let's try")) && 
        session.preAnxietyLevel !== null && 
        session.stage === 'anxiety-rating') {
      updatedData = {
        stage: 'delivering-intervention'
      };
    }
    
    // Check if AI is asking for post-assessment
    if (aiResponse.includes("how would you rate your anxiety now") && 
        session.stage === 'delivering-intervention') {
      updatedData = {
        stage: 'post-assessment'
      };
    }
    
    // Example: Detecting post-intervention anxiety rating
    if (session.stage === 'post-assessment') {
      const numberMatch = userMessage.match(/\d+/);
      if (numberMatch) {
        const rating = parseInt(numberMatch[0]);
        if (rating >= 0 && rating <= 10) {
          updatedData = {
            postAnxietyLevel: rating,
            stage: 'feedback'
          };
        }
      }
    }
    
    // Example: Capturing feedback
    if (session.stage === 'feedback' && 
        (aiResponse.includes("what did you find helpful") || aiResponse.includes("how was this exercise"))) {
      updatedData = {
        notes: userMessage
      };
      
      // Check if the AI is closing the session
      if (aiResponse.includes("Thank you for sharing") || 
          aiResponse.includes("saved this information")) {
        updatedData = {
          ...updatedData,
          stage: 'completed',
          endTime: new Date()
        };
      }
    }
    
    // Update the session
    if (Object.keys(updatedData).length > 0) {
      return this.updateAnxietySession(id, updatedData);
    }
    
    return session;
  }

  // Conversation methods
  async addConversationMessage(messageData: InsertConversationMessage): Promise<ConversationMessage> {
    const id = this.messageId++;
    const message: ConversationMessage = { ...messageData, id };
    this.messages.set(id, message);
    return message;
  }

  async getConversationHistory(sessionId: number): Promise<ConversationMessage[]> {
    return Array.from(this.messages.values())
      .filter(msg => msg.sessionId === sessionId)
      .sort((a, b) => {
        // Sort by timestamp
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });
  }

  // Utility methods
  getTriggerCategories(): typeof triggerCategories {
    return triggerCategories;
  }

  getTherapistApprovedInterventions(): typeof therapistApprovedInterventions {
    return therapistApprovedInterventions;
  }

  selectAppropriateIntervention(triggerCategory: string | null, anxietyLevel: number | null): any {
    if (anxietyLevel === null) {
      return therapistApprovedInterventions.cognitive[0];
    }
    
    // Determine intervention type based on anxiety level
    let interventionType: string;
    
    if (anxietyLevel >= 7) {
      interventionType = "grounding";
    } else if (anxietyLevel >= 4) {
      interventionType = "breathing";
    } else {
      interventionType = "cognitive";
    }
    
    // Get interventions of this type
    const availableInterventions = therapistApprovedInterventions[interventionType as keyof typeof therapistApprovedInterventions];
    
    // Find one that's appropriate for this trigger
    for (const intervention of availableInterventions) {
      if (triggerCategory && 
          (intervention.forTriggers.includes(triggerCategory) || 
          intervention.forTriggers.includes("general"))) {
        return {
          ...intervention,
          type: interventionType
        };
      }
    }
    
    // Default to the first one if no match
    return {
      ...availableInterventions[0],
      type: interventionType
    };
  }
}

export const storage = new MemStorage();
