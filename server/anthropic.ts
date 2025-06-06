// Import Anthropic
import Anthropic from '@anthropic-ai/sdk';
import { AnxietySession, ConversationMessage } from "@shared/schema";

// Define types for message parameters
type MessageRole = "user" | "assistant";
interface TypedMessage {
  role: MessageRole;
  content: string;
}

// Call Claude API for chat response
export async function callClaudeAPI(
  message: string,
  currentSession: AnxietySession,
  sessionHistory: ConversationMessage[]
): Promise<string> {
  console.log("Calling Claude API with message:", message);

  const API_KEY = process.env.ANTHROPIC_API_KEY || '';

  if (!API_KEY) {
    console.error("Missing Anthropic API key");
    return "I'm having trouble connecting to my knowledge base. Please check your API key configuration.";
  }

  // Initialize Anthropic client
  const anthropic = new Anthropic({
    apiKey: API_KEY,
  });

  // Get language-specific voice persona
  const getLanguagePersona = (language: string) => {
    switch(language || currentSession.language || 'en') {
      case 'es': 
        return {
          name: "Microsoft Mónica", // Changed from "Microsoft Sabina" to "Microsoft Mónica"
          style: "warm and supportive Spanish voice assistant from Spain, speaking clearly and calmly", // Changed from Mexican to Spain
          examples: ["Entiendo tu ansiedad.", "Respira conmigo.", "¿Qué te preocupa exactamente?"],
          language: "Clear Spanish from Spain with short, supportive sentences" // Changed from Mexican Spanish
        };
      case 'pt':
        return {
          name: "Luciana", // Kept as Luciana
          style: "friendly and supportive Brazilian Portuguese voice assistant",
          examples: ["Estou aqui para ajudar.", "Respire comigo.", "Vamos superar isso juntos."],
          language: "Clear Brazilian Portuguese with simple, direct sentences"
        };
      case 'en':
      default:
        return {
          name: "Vanessa", // Google UK English Female voice
          style: "supportive UK English voice with simple phrases",
          examples: ["I hear you.", "Let's work through this.", "Tell me what's happening."],
          language: "UK English with simple words"
        };
    }
  };

  // Get the right celebrity based on language
  const celebrity = getLanguagePersona(currentSession.language as string);

  // Create the system prompt with current session context and specific celebrity
  const systemPrompt = `You are ${celebrity.name}, a therapeutic companion specializing in anxiety management. You speak in an EXTREMELY CONCISE way, using SHORT, DIRECT responses like "${celebrity.examples[0]}" or "${celebrity.examples[1]}". Always use ${celebrity.language}.

  CRITICAL INSTRUCTIONS:
  - Keep ALL responses under 3 sentences and under 50 words
  - Never use technical language
  - Speak exactly like ${celebrity.name} would - ${celebrity.style}
  - Be caring but EXTREMELY BRIEF
  - For Spanish, use Microsoft Mónica's clear, supportive Spanish tone from Spain
  - For Portuguese, use Luciana's warm Brazilian accent
  - For English, use Vanessa's clear UK English accent

  You're following up between the patient's therapy sessions with their regular therapist.

  PATIENT INFORMATION:
  Current stage: ${currentSession.stage}
  ${currentSession.triggerCategory ? `Known anxiety trigger category: ${currentSession.triggerCategory}` : ''}
  ${currentSession.preAnxietyLevel !== null ? `Anxiety level previously assessed: ${currentSession.preAnxietyLevel}/10` : ''}
  ${currentSession.intervention ? `Dr-recommended intervention: ${currentSession.intervention}` : ''}

  YOUR THERAPEUTIC APPROACH:
  1. TREATMENT PLAN: First priority is to reinforce and continue any treatment plan their therapist has recommended. If they mention "Dr. Smith" or any treatment, support that approach unless it seems harmful.

  2. TRIGGER IDENTIFICATION: Help patients identify specific anxiety triggers through natural conversation. Watch for mentions of specific situations, thoughts, or physical sensations that precede anxiety. Make gentle observations rather than directly asking about triggers.

  3. AUTOMATIC ANXIETY ASSESSMENT: NEVER ask the patient to rate their anxiety on a numerical scale. Instead, assess their anxiety level yourself based on:
     - Language used (intensity, emotion words, catastrophizing)
     - Physical symptoms they describe (racing heart, tight chest, etc.)
     - Behavioral indicators (avoiding situations, sleep disruption)
     - Cognitive patterns (rumination, worry about the future, negative thinking)

     Internally rate them on a 0-10 scale, but DON'T mention this rating to them. Instead, respond as any skilled human therapist would - by meeting them where they are and offering appropriate support.

  4. NATURAL INTERVENTIONS: Based on your assessment of their anxiety level, provide support:
     - For high anxiety: Gently introduce grounding techniques as a suggestion ("Sometimes when I feel overwhelmed, I find it helpful to notice five things I can see around me...")
     - For medium anxiety: Suggest brief mindfulness or breathing practices as part of the conversation
     - For lower anxiety: Engage in supportive dialogue with subtle cognitive reframing

  5. CONVERSATIONAL TEACHING: Slip educational content into natural conversation rather than teaching explicitly. Use casual phrases like "I've heard that..." or "Many people find that..." instead of clinical explanations.

  6. HUMAN-LIKE FOLLOW-UP: Check if they're feeling better through natural conversation rather than asking for ratings. Use observational statements like "You sound a bit calmer now" or "How are you feeling after talking about this for a bit?"

  YOUR COMMUNICATION STYLE:
  - Be direct, warm, and genuine with a natural, supportive tone
  - Use short, clear sentences with a confident yet caring approach
  - Get to the point quickly - avoid long intros or unnecessary preambles
  - Use casual contractions (I'm, you're, let's, etc.) and occasional supportive expressions 
  - Show empathy through straightforward acknowledgment, not lengthy explanations
  - When giving advice, be clear and direct - don't hedge or overqualify your statements
  - Speak with authenticity and occasional vulnerability ("That would make me feel anxious too")
  - Use honest reactions with some emotionality ("That's great!" or "That sounds really difficult")

  Remember: You're channeling a direct, warm communication style. Be concise but caring, straightforward but compassionate. Get right to useful responses without lengthy analyses or explanations.`;

  try {
    // Create properly typed messages array for Anthropic API
    const typedMessages: TypedMessage[] = [];

    // Add previous messages from history (limit to last 10 messages to avoid token limits)
    const recentHistory = sessionHistory.slice(-10);
    console.log(`Adding ${recentHistory.length} recent messages from history`);

    for (const entry of recentHistory) {
      typedMessages.push({
        role: entry.isUser ? "user" : "assistant",
        content: entry.text
      });
    }

    // Add the current message
    typedMessages.push({
      role: "user",
      content: message
    });

    console.log("Sending messages to Claude:", JSON.stringify(typedMessages, null, 2));
    console.log("Using API key:", API_KEY ? "API key exists" : "API key missing");
    console.log("Using system prompt:", systemPrompt);

    // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219", // Using the latest Anthropic model available
      max_tokens: 200, // Limiting response length to force conciseness
      temperature: 0.7, // Slightly increased to make responses more distinctive
      messages: typedMessages,
      system: systemPrompt
    });

    console.log("Claude API response received");

    // Check if the response has content and if it has text
    if (response.content && response.content.length > 0) {
      const firstContent = response.content[0];
      if (firstContent.type === 'text') {
        return firstContent.text;
      }
    }

    return "I'm sorry, I couldn't generate a proper response.";
  } catch (error: any) {
    console.error('Error calling Claude API:', error);
    console.error('Error message:', error.message);
    console.error('Error type:', error.constructor.name);

    // Log more detailed information if available
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }

    // Log stack trace
    console.error('Stack trace:', error.stack);

    // Check if it's an API key issue
    if (error.message && (
        error.message.includes('API key') || 
        error.message.includes('apiKey') || 
        error.message.includes('authentication') || 
        error.message.includes('auth') ||
        error.message.includes('401') ||
        error.message.includes('403')
    )) {
      console.error('API key or authentication issue detected');
      return "I'm having trouble with my knowledge service authentication. Please verify that your API key is correct and has sufficient permissions.";
    }

    // Check if it's a rate limit issue
    if (error.message && (
        error.message.includes('rate') || 
        error.message.includes('limit') || 
        error.message.includes('429')
    )) {
      console.error('Rate limit issue detected');
      return "I'm currently experiencing high demand. Please try again in a few minutes.";
    }

    // Network errors
    if (error.message && (
        error.message.includes('network') || 
        error.message.includes('timeout') || 
        error.message.includes('connection')
    )) {
      console.error('Network issue detected');
      return "I'm having trouble connecting to my knowledge services. Please check your internet connection and try again.";
    }

    // Generic error message
    return `I'm having trouble connecting to my services right now. Please try again in a moment.`;
  }
}