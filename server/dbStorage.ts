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
  type InsertConversationMessage,
  type SupportedLanguage
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByInstagramHandle(instagramHandle: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.instagramHandle, instagramHandle));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    // Add updatedAt timestamp
    const updateData = {
      ...data,
      updatedAt: new Date()
    };

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }

  // Anxiety Session methods
  async createAnxietySession(sessionData: InsertAnxietySession): Promise<AnxietySession> {
    // Ensure we have the required fields
    const newSession = {
      ...sessionData,
      language: sessionData.language || 'en',
      stage: sessionData.stage || 'idle',
      startTime: new Date(sessionData.startTime)
    };

    const [session] = await db
      .insert(anxietySessions)
      .values(newSession)
      .returning();
    
    return session;
  }

  async getAnxietySession(id: number): Promise<AnxietySession | undefined> {
    const [session] = await db
      .select()
      .from(anxietySessions)
      .where(eq(anxietySessions.id, id));
    
    return session;
  }

  async getAnxietySessionsByUserId(userId: string): Promise<AnxietySession[]> {
    const sessions = await db
      .select()
      .from(anxietySessions)
      .where(eq(anxietySessions.userId, userId))
      .orderBy(desc(anxietySessions.startTime));
    
    return sessions;
  }

  async updateAnxietySession(id: number, data: Partial<InsertAnxietySession>): Promise<AnxietySession | undefined> {
    const [updatedSession] = await db
      .update(anxietySessions)
      .set(data)
      .where(eq(anxietySessions.id, id))
      .returning();
    
    return updatedSession;
  }

  async updateSessionState(id: number, userMessage: string, aiResponse: string): Promise<AnxietySession | undefined> {
    // Get current session
    const [session] = await db
      .select()
      .from(anxietySessions)
      .where(eq(anxietySessions.id, id));
    
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
    
    // Check for trigger selection in user message
    if (session.stage === 'selecting-trigger') {
      // Get language-specific trigger labels
      const language = (session.language || 'en') as SupportedLanguage;
      
      for (const trigger of triggerCategories) {
        // Get label in appropriate language
        const label = typeof trigger.label === 'object' 
          ? trigger.label[language] || trigger.label.en
          : trigger.label;
          
        if (userMessage.toLowerCase().includes(trigger.id) || 
            userMessage.toLowerCase().includes(label.toLowerCase())) {
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
          // Select intervention based on rating and language
          const selectedIntervention = this.selectAppropriateIntervention(
            session.triggerCategory,
            rating,
            session.language
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
    
    // Check if intervention was completed and we're asking for post-intervention rating
    if (session.stage === 'delivering-intervention' && 
        (aiResponse.includes("How do you feel now") || 
         aiResponse.includes("rate your anxiety now") || 
         aiResponse.includes("how would you rate"))) {
      updatedData = {
        stage: 'post-rating'
      };
    }
    
    // Extract post-intervention anxiety level
    if (session.stage === 'post-rating') {
      const numberMatch = userMessage.match(/\d+/);
      if (numberMatch) {
        const rating = parseInt(numberMatch[0]);
        if (rating >= 0 && rating <= 10) {
          updatedData = {
            postAnxietyLevel: rating,
            stage: 'completed'
          };
        }
      }
    }
    
    // If we have updates to make
    if (Object.keys(updatedData).length > 0) {
      const [updatedSession] = await db
        .update(anxietySessions)
        .set(updatedData)
        .where(eq(anxietySessions.id, id))
        .returning();
      
      return updatedSession;
    }
    
    return session;
  }

  // Conversation methods
  async addConversationMessage(messageData: InsertConversationMessage): Promise<ConversationMessage> {
    // Ensure timestamp is properly handled
    const newMessage = {
      ...messageData,
      timestamp: new Date(messageData.timestamp)
    };

    const [message] = await db
      .insert(conversationMessages)
      .values(newMessage)
      .returning();
    
    return message;
  }

  async getConversationHistory(sessionId: number): Promise<ConversationMessage[]> {
    const messages = await db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.sessionId, sessionId))
      .orderBy(conversationMessages.timestamp);
    
    return messages;
  }

  // Utility methods
  getTriggerCategories(): typeof triggerCategories {
    return triggerCategories;
  }

  getTherapistApprovedInterventions(): typeof therapistApprovedInterventions {
    return therapistApprovedInterventions;
  }

  selectAppropriateIntervention(triggerCategory: string | null, anxietyLevel: number | null, language: string = 'en'): any {
    // Default intervention if we can't determine
    let defaultIntervention = {
      id: 'box_breathing',
      type: 'breathing',
      name: {
        en: 'Box Breathing',
        es: 'Respiración Cuadrada',
        pt: 'Respiração Quadrada'
      },
      description: {
        en: 'A calming breathing technique',
        es: 'Una técnica calmante de respiración',
        pt: 'Uma técnica calmante de respiração'
      },
      voicePrompt: {
        en: "Let's try box breathing together.",
        es: "Intentemos la respiración cuadrada juntos.",
        pt: "Vamos tentar a respiração quadrada juntos."
      },
      forTriggers: ['general']
    };
    
    // Get interventions by type
    const allInterventions = this.getTherapistApprovedInterventions();
    let possibleInterventions = [];
    
    // Match by category
    if (triggerCategory) {
      // Collect all interventions that match the trigger category
      for (const [type, interventionsList] of Object.entries(allInterventions)) {
        const matchingInterventions = interventionsList.filter(
          intervention => intervention.forTriggers.includes(triggerCategory) || 
                         intervention.forTriggers.includes('general')
        );
        
        if (matchingInterventions.length > 0) {
          possibleInterventions.push(
            ...matchingInterventions.map(intervention => ({
              ...intervention,
              type
            }))
          );
        }
      }
    }
    
    // If we couldn't find interventions by category or no category provided
    if (possibleInterventions.length === 0) {
      // Select based on anxiety level
      if (anxietyLevel !== null) {
        if (anxietyLevel >= 7) {
          // For high anxiety, focus on grounding and breathing
          const groundingInterventions = allInterventions.grounding.map(
            intervention => ({ ...intervention, type: 'grounding' })
          );
          const breathingInterventions = allInterventions.breathing.map(
            intervention => ({ ...intervention, type: 'breathing' })
          );
          possibleInterventions = [...groundingInterventions, ...breathingInterventions];
        } else if (anxietyLevel >= 4) {
          // For medium anxiety, consider all types with preference for mindfulness
          const mindfulnessInterventions = allInterventions.mindfulness?.map(
            intervention => ({ ...intervention, type: 'mindfulness' })
          ) || [];
          
          // If mindfulness interventions exist, add them with others
          if (mindfulnessInterventions.length > 0) {
            possibleInterventions = [...mindfulnessInterventions];
            
            // Add other types
            for (const [type, interventionsList] of Object.entries(allInterventions)) {
              if (type !== 'mindfulness') {
                possibleInterventions.push(
                  ...interventionsList.map(intervention => ({
                    ...intervention,
                    type
                  }))
                );
              }
            }
          }
        } else {
          // For low anxiety, cognitive techniques may be more effective
          const cognitiveInterventions = allInterventions.cognitive.map(
            intervention => ({ ...intervention, type: 'cognitive' })
          );
          possibleInterventions = [...cognitiveInterventions];
          
          // Add physical exercises as well
          if (allInterventions.physical) {
            const physicalInterventions = allInterventions.physical.map(
              intervention => ({ ...intervention, type: 'physical' })
            );
            possibleInterventions.push(...physicalInterventions);
          }
        }
      }
    }
    
    // Still no matching interventions, use all available
    if (possibleInterventions.length === 0) {
      for (const [type, interventionsList] of Object.entries(allInterventions)) {
        possibleInterventions.push(
          ...interventionsList.map(intervention => ({
            ...intervention,
            type
          }))
        );
      }
    }
    
    // Select a random intervention from the possible ones
    if (possibleInterventions.length > 0) {
      const selectedIntervention = possibleInterventions[
        Math.floor(Math.random() * possibleInterventions.length)
      ];
      return selectedIntervention;
    }
    
    // Fallback to default
    return defaultIntervention;
  }
}