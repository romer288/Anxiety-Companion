import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import Anthropic from '@anthropic-ai/sdk';
import { z } from "zod";
import { insertAnxietySessionSchema, insertConversationMessageSchema, ConversationMessage, AnxietySession } from "@shared/schema";

// Define types for message parameters
type MessageRole = "user" | "assistant";
interface TypedMessage {
  role: MessageRole;
  content: string;
}

// Enhanced Multiple Trigger Detection System
interface MultipleTriggerResult {
  allTriggers: Array<{
    trigger: string;
    score: string;
    category: string;
    description: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
  primaryTrigger: {
    trigger: string;
    score: string;
    category: string;
    description: string;
    confidence: 'high' | 'medium' | 'low';
  } | null;
  secondaryTriggers: Array<{
    trigger: string;
    score: string;
    category: string;
    description: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
  triggersByCategory: Record<string, Array<{
    trigger: string;
    score: number;
    description: string;
  }>>;
  compoundPatterns: Array<{
    name: string;
    description: string;
    triggers: string[];
  }>;
  summary: {
    totalTriggers: number;
    categories: string[];
    highConfidenceTriggers: number;
    hasCompoundPattern: boolean;
  };
  details: Record<string, any>;
}

// ======== ENHANCED ANXIETY DETECTION SYSTEM ========
function detectAnxietyLevelFixed(message: string, history: ConversationMessage[]): number | null {
  const text = message.toLowerCase();

  // Emergency risk patterns with multilingual support
  const emergencyRiskPatterns = [
    { pattern: /(?:i\s+(?:want|need|going|plan|thinking|wish)\s+to\s+(?:kill|end|hurt|harm)\s+(?:myself|my\s+life))/i, weight: 10, label: "Direct suicidal ideation" },
    { pattern: /(?:suicide|suicidal|end\s+it\s+all|take\s+my\s+(?:own\s+)?life|better\s+off\s+dead)/i, weight: 10, label: "Suicidal terminology" },
    { pattern: /(?:no\s+(?:point|reason)\s+(?:in\s+)?(?:living|going\s+on)|tired\s+of\s+living|done\s+with\s+(?:life|everything))/i, weight: 9, label: "Life meaninglessness" },
    { pattern: /(?:can'?t\s+(?:go\s+on|take\s+(?:it|this)\s+anymore)|at\s+(?:my|the)\s+breaking\s+point)/i, weight: 8, label: "Crisis state" },

    // Spanish emergency patterns
    { pattern: /(?:quiero|voy\s+a|pienso|necesito)\s+(?:suicidarme|matarme|quitarme\s+la\s+vida|acabar\s+conmigo)/i, weight: 10, label: "Spanish suicidal ideation" },
    { pattern: /(?:no\s+quiero\s+vivir|mejor\s+estar(?:ía)?\s+muerto|ya\s+no\s+(?:puedo|aguanto)\s+más)/i, weight: 9, label: "Spanish hopelessness" },

    // Portuguese emergency patterns
    { pattern: /(?:quero|vou|preciso)\s+(?:me\s+matar|suicidar|acabar\s+com\s+(?:minha\s+)?vida)/i, weight: 10, label: "Portuguese suicidal ideation" },
    { pattern: /(?:não\s+quero\s+viver|melhor\s+estar\s+morto|não\s+aguento\s+mais)/i, weight: 9, label: "Portuguese hopelessness" }
  ];

  // Check emergency patterns first
  for (const risk of emergencyRiskPatterns) {
    if (risk.pattern.test(text)) {
      console.log(`EMERGENCY: ${risk.label} detected - Score: ${risk.weight}`);
      return risk.weight;
    }
  }

  // ENHANCED: Add detection for MODERATE emotional distress patterns
  const moderateDistressPatterns = [
    { pattern: /(?:feel\s+(?:bad|terrible|awful|horrible|miserable))/i, weight: 1.5, label: "General negative feelings" },
    { pattern: /(?:don'?t\s+feel\s+(?:good|understood|heard|valued))/i, weight: 1.3, label: "Feeling invalidated" },
    { pattern: /(?:frustrated|upset|bothered|troubled)/i, weight: 1.2, label: "Moderate distress" },
    { pattern: /(?:stressed|worried|concerned)/i, weight: 1.0, label: "Mild anxiety indicators" }
  ];

  // BEHAVIORAL INDICATORS that suggest higher anxiety than reported
  const behavioralAnxietyPatterns = [
    { pattern: /(?:please\s+listen|don't\s+stop|hear\s+me\s+out)/i, weight: 1.8, label: "Urgent communication need" },
    { pattern: /(?:said\s+that\s+I.*said\s+that\s+I)/i, weight: 1.5, label: "Repetitive messaging pattern" },
    { pattern: /(?:nobody\s+(?:listens|understands)|feel\s+ignored)/i, weight: 1.6, label: "Social disconnection" }
  ];

  // COMMUNICATION PATTERN ANALYSIS
  const communicationDistressPatterns = [
    { pattern: /(?:listen\s+to\s+me|pay\s+attention|understand\s+me)/i, weight: 1.4, label: "Need for validation" },
    { pattern: /(?:feel\s+like\s+nobody|no\s+one\s+(?:cares|listens|understands))/i, weight: 1.7, label: "Isolation feelings" }
  ];

  // Multi-dimensional anxiety assessment
  const anxietyDimensions = {
    physical: {
      severe: [
        { pattern: /(?:panic\s+attack|can'?t\s+breathe|hyperventilat|chest\s+(?:pain|tight|pressure))/i, weight: 3.0 },
        { pattern: /(?:heart\s+(?:racing|pounding|beating\s+fast)|palpitations)/i, weight: 2.5 },
        { pattern: /(?:trembling|shaking|tremors|dizzy|faint|nauseous)/i, weight: 2.0 }
      ],
      moderate: [
        { pattern: /(?:headache|muscle\s+tension|restless|jittery|sweating)/i, weight: 1.5 },
        { pattern: /(?:stomach\s+(?:ache|knots|butterflies)|tight\s+throat)/i, weight: 1.0 }
      ]
    },

    cognitive: {
      severe: [
        { pattern: /(?:can'?t\s+(?:focus|concentrate|think\s+straight)|mind\s+(?:racing|blank|fog))/i, weight: 2.5 },
        { pattern: /(?:catastroph|worst\s+case|terrible\s+things|spiraling|obsess)/i, weight: 2.0 },
        { pattern: /(?:going\s+crazy|losing\s+my\s+mind|unreal|detached|paranoi)/i, weight: 3.0 }
      ],
      moderate: [
        { pattern: /(?:worried|overthinking|ruminating|distract|forgetful)/i, weight: 1.0 },
        { pattern: /(?:indecisive|uncertain|confused|doubt)/i, weight: 0.8 }
      ]
    },

    emotional: {
      severe: [
        { pattern: /(?:terrified|petrified|horrified|desperate|overwhelm)/i, weight: 2.5 },
        { pattern: /(?:hopeless|helpless|trapped|doomed|unbearable)/i, weight: 2.8 },
        { pattern: /(?:breaking\s+down|falling\s+apart|losing\s+control|can'?t\s+(?:handle|cope|bear))/i, weight: 3.0 }
      ],
      moderate: [
        { pattern: /(?:anxious|nervous|scared|afraid|frightened|uneasy|on\s+edge)/i, weight: 1.2 },
        { pattern: /(?:stressed|worry|concern|distress|uncomfortable|irritable)/i, weight: 1.0 }
      ],
      mild: [
        { pattern: /(?:apprehensive|bothered|unsettled|troubled|annoyed)/i, weight: 0.5 }
      ]
    },

    behavioral: {
      severe: [
        { pattern: /(?:avoid|can'?t\s+(?:go|do|face|handle)|cancel|escape|hiding)/i, weight: 2.0 },
        { pattern: /(?:isolation|shut\s+down|frozen|paralyzed|compulsion)/i, weight: 2.5 }
      ],
      moderate: [
        { pattern: /(?:procrastinat|putting\s+off|reluctant|pacing|fidget)/i, weight: 1.0 },
        { pattern: /(?:nail\s+biting|hair\s+pulling|reassurance\s+seeking)/i, weight: 1.2 }
      ]
    },

    sleep: {
      severe: [
        { pattern: /(?:can'?t\s+sleep|insomnia|awake\s+all\s+night|nightmares)/i, weight: 2.0 },
        { pattern: /(?:completely\s+exhausted|total\s+fatigue|drained)/i, weight: 1.8 }
      ],
      moderate: [
        { pattern: /(?:trouble\s+sleeping|restless\s+sleep|tired|low\s+energy)/i, weight: 1.0 }
      ]
    }
  };

  let totalScore = 0;
  let detectedPatterns: string[] = [];

  // Check all pattern categories (including new moderate patterns)
  const allPatterns = [
    ...moderateDistressPatterns,
    ...behavioralAnxietyPatterns, 
    ...communicationDistressPatterns
  ];

  for (const { pattern, weight, label } of allPatterns) {
    if (pattern.test(text)) {
      totalScore += weight;
      detectedPatterns.push(label);
      console.log(`ANXIETY PATTERN: ${label} (weight: ${weight})`);
    }
  }

  // Check original anxiety dimensions
  for (const [dimension, severityLevels] of Object.entries(anxietyDimensions)) {
    for (const [severity, patterns] of Object.entries(severityLevels)) {
      for (const { pattern, weight } of patterns) {
        if (pattern.test(text)) {
          totalScore += weight;
          detectedPatterns.push(`${dimension}/${severity}`);
          console.log(`${dimension}/${severity}: ${pattern} (weight: ${weight})`);
        }
      }
    }
  }

  // CONVERSATION CONTEXT ANALYSIS
  if (history.length > 0) {
    const recentUserMessages = history.filter(msg => msg.isUser).slice(-3);

    // Check for escalating pattern
    const currentMessageLength = text.length;
    const avgPreviousLength = recentUserMessages.length > 0 ? 
      recentUserMessages.reduce((sum, msg) => sum + msg.text.length, 0) / recentUserMessages.length : 0;

    if (currentMessageLength > avgPreviousLength * 1.5) {
      totalScore += 0.8;
      detectedPatterns.push("Escalating message length");
      console.log("ESCALATION: Message length increased significantly");
    }

    // Check for repetitive themes
    const combinedPreviousText = recentUserMessages.map(msg => msg.text.toLowerCase()).join(' ');
    if (combinedPreviousText.includes('job') && text.includes('job')) {
      totalScore += 0.5;
      detectedPatterns.push("Persistent job-related concern");
    }
  }

  // Duration and intensity modifiers
  const durationModifiers = [
    { pattern: /(?:constant|all\s+the\s+time|every\s+day|never\s+stops|chronic|for\s+(?:weeks|months|years))/i, multiplier: 1.5 },
    { pattern: /(?:often|frequently|regular|most\s+days|several\s+times)/i, multiplier: 1.2 },
    { pattern: /(?:sometimes|occasionally|comes\s+and\s+goes|on\s+and\s+off)/i, multiplier: 0.8 },
    { pattern: /(?:first\s+time|just\s+started|recent|new|temporary)/i, multiplier: 0.9 }
  ];

  let durationMultiplier = 1.0;
  for (const { pattern, multiplier } of durationModifiers) {
    if (pattern.test(text)) {
      durationMultiplier = Math.max(durationMultiplier, multiplier);
    }
  }

  const intensityModifiers = [
    { pattern: /(?:extreme|intense|severe|overwhelming|unbearable|excruciating)/i, multiplier: 1.4 },
    { pattern: /(?:really|very|so|extremely|incredibly|absolutely)/i, multiplier: 1.2 },
    { pattern: /(?:mild|slight|bit\s+of|little|somewhat|sort\s+of|kind\s+of)/i, multiplier: 0.7 }
  ];

  let intensityMultiplier = 1.0;
  for (const { pattern, multiplier } of intensityModifiers) {
    if (pattern.test(text)) {
      intensityMultiplier = Math.max(intensityMultiplier, multiplier);
    }
  }

  // Major life stressors - Enhanced with more patterns
  const lifeStressors = [
    { pattern: /(?:job\s+loss|fired|laid\s+off|unemployed|lost\s+my\s+job)/i, baseScore: 6, label: "Job loss" },
    { pattern: /(?:could\s+(?:fire|get\s+fired)|might\s+(?:lose|fire)|fear\s+(?:of\s+)?(?:losing|firing))/i, baseScore: 5, label: "Job loss threat" },
    { pattern: /(?:financial\s+(?:crisis|trouble|emergency)|can'?t\s+pay\s+bills|bankruptcy|debt)/i, baseScore: 5, label: "Financial crisis" },
    { pattern: /(?:don'?t\s+have\s+money|no\s+money|can'?t\s+afford|broke)/i, baseScore: 4, label: "Financial strain" },
    { pattern: /(?:crashed\s+(?:my\s+)?car|car\s+accident|accident\s+today)/i, baseScore: 5, label: "Car accident" },
    { pattern: /(?:don'?t\s+have\s+(?:anybody|anyone)|no\s+one\s+(?:to\s+)?(?:rely\s+on|help))/i, baseScore: 4, label: "No support system" },
    { pattern: /(?:divorce|breakup|relationship\s+(?:ending|over)|separation)/i, baseScore: 4, label: "Relationship ending" },
    { pattern: /(?:death|died|funeral|grief|loss|mourning)/i, baseScore: 5, label: "Bereavement" },
    { pattern: /(?:illness|disease|diagnosis|hospital|medical\s+emergency)/i, baseScore: 4, label: "Health crisis" },
    { pattern: /(?:eviction|foreclosure|homeless|losing\s+(?:home|house))/i, baseScore: 6, label: "Housing crisis" }
  ];

  let stressorBonus = 0;
  let stressorCount = 0;
  for (const { pattern, baseScore, label } of lifeStressors) {
    if (pattern.test(text)) {
      stressorBonus += baseScore; // Add scores instead of just taking max
      stressorCount++;
      console.log(`Major life stressor detected: ${label} (bonus: ${baseScore})`);
    }
  }
  
  // Apply compound stressor multiplier for multiple serious life events
  if (stressorCount >= 3) {
    stressorBonus *= 1.4; // Very severe compound crisis
    console.log(`COMPOUND CRISIS: ${stressorCount} major stressors detected, applying 1.4x multiplier`);
  } else if (stressorCount >= 2) {
    stressorBonus *= 1.2; // Multiple serious stressors
    console.log(`MULTIPLE STRESSORS: ${stressorCount} major stressors detected, applying 1.2x multiplier`);
  }

  // Conversation history analysis for escalation
  let escalationFactor = 1.0;
  if (history.length > 2) {
    const recentMessages = history.slice(-3).filter(msg => msg.isUser);

    const currentIntensity = (text.match(/!|CAPS|very|so|really|extremely/gi) || []).length;
    if (recentMessages.length > 0) {
      const previousIntensity = (recentMessages[recentMessages.length - 1].text.match(/!|CAPS|very|so|really|extremely/gi) || []).length;
      if (currentIntensity > previousIntensity * 1.5) {
        escalationFactor = 1.3;
        console.log("Escalating intensity detected");
      }
    }
  }

  // MINIMUM BASELINE: If expressing distress but no patterns caught
  const hasEmotionalContent = /(?:feel|feeling|felt)/.test(text) && 
                             /(?:bad|sad|upset|frustrated|terrible|awful)/.test(text);

  if (hasEmotionalContent && totalScore < 1.5) {
    totalScore = Math.max(totalScore, 1.5); // Minimum for emotional distress
    detectedPatterns.push("General emotional distress baseline");
  }

  // Final score calculation
  if (detectedPatterns.length === 0 && stressorBonus === 0) {
    const generalDistress = ['sad', 'upset', 'down', 'bad', 'terrible', 'awful', 'horrible', 'miserable'];
    if (generalDistress.some(emotion => text.includes(emotion))) {
      console.log("General emotional distress detected");
      return 2;
    }
    return null;
  }

  let finalScore = totalScore * durationMultiplier * intensityMultiplier * escalationFactor;
  finalScore += stressorBonus;

  if (detectedPatterns.length >= 3) {
    finalScore *= 1.3;
  } else if (detectedPatterns.length >= 5) {
    finalScore *= 1.5;
  }

  // Enhanced scaling for crisis situations
  let scaledScore;
  if (finalScore === 0) {
    scaledScore = null; // No anxiety detected
  } else if (finalScore <= 0.5) {
    scaledScore = 1;
  } else if (finalScore <= 1.0) {
    scaledScore = 2;
  } else if (finalScore <= 1.8) {
    scaledScore = 3;
  } else if (finalScore <= 2.5) {
    scaledScore = 4;
  } else if (finalScore <= 3.5) {
    scaledScore = 5;
  } else if (finalScore <= 5.0) {
    scaledScore = 6;
  } else if (finalScore <= 8.0) {
    scaledScore = 7;
  } else if (finalScore <= 12.0) {
    scaledScore = 8;
  } else if (finalScore <= 18.0) {
    scaledScore = 9;  
  } else {
    scaledScore = 10;
  }

  console.log(`ENHANCED ANXIETY ANALYSIS: Raw score: ${finalScore.toFixed(2)}, Scaled: ${scaledScore}, Patterns: [${detectedPatterns.join(', ')}]`);

  return scaledScore;
}

// ======== ENHANCED MULTIPLE TRIGGER DETECTION SYSTEM ====

function detectAllTriggers(message: string, history: ConversationMessage[]): MultipleTriggerResult {
  const text = message.toLowerCase();
  const fullConversation = history.map(msg => msg.text).join(' ').toLowerCase();

  // Comprehensive trigger patterns with enhanced coverage
  const triggerPatterns = {
    // Job/Work Related Triggers
    work_dissatisfaction: {
      patterns: [
        { pattern: /(?:don'?t\s+like\s+(?:my\s+)?(?:current\s+)?job|hate\s+(?:my\s+)?(?:current\s+)?job)/i, weight: 2.2 },
        { pattern: /(?:job\s+(?:sucks|is\s+terrible|is\s+awful|makes\s+me\s+miserable))/i, weight: 2.0 },
        { pattern: /(?:want\s+to\s+(?:quit|leave)\s+(?:my\s+)?job|thinking\s+about\s+quitting)/i, weight: 2.1 },
        { pattern: /(?:feel\s+(?:bad|terrible|awful|horrible|miserable)\s+(?:about\s+)?(?:my\s+)?(?:current\s+)?job)/i, weight: 2.0 }
      ],
      category: "work",
      description: "Job dissatisfaction and workplace unhappiness"
    },

    work_communication: {
      patterns: [
        { pattern: /(?:not\s+(?:heard|understood|listened\s+to)\s+at\s+work)/i, weight: 1.9 },
        { pattern: /(?:don'?t\s+feel\s+understood\s+(?:at\s+work)?)/i, weight: 1.8 },
        { pattern: /(?:nobody\s+listens\s+(?:at\s+work|to\s+me))/i, weight: 1.7 },
        { pattern: /(?:feel\s+ignored\s+(?:at\s+work)?)/i, weight: 1.6 },
        { pattern: /(?:boss\s+(?:doesn'?t\s+listen|ignores\s+me)|nobody\s+listens\s+at\s+work)/i, weight: 1.8 }
      ],
      category: "work",
      description: "Workplace communication and feeling heard"
    },

    work_performance: {
      patterns: [
        { pattern: /(?:not\s+good\s+enough\s+at\s+work|bad\s+at\s+(?:my\s+)?job)/i, weight: 2.0 },
        { pattern: /(?:incompetent|inadequate\s+at\s+work|terrible\s+employee)/i, weight: 1.9 },
        { pattern: /(?:imposter\s+syndrome|don'?t\s+belong\s+(?:at\s+work|here))/i, weight: 1.8 },
        { pattern: /(?:everyone\s+else\s+is\s+better|others\s+are\s+more|I'm\s+the\s+worst)/i, weight: 1.9 }
      ],
      category: "work", 
      description: "Work performance anxiety and professional self-doubt"
    },

    work_environment: {
      patterns: [
        { pattern: /(?:toxic\s+workplace|bad\s+boss|office\s+politics|workplace\s+bullying)/i, weight: 1.5 },
        { pattern: /(?:fired|laid\s+off|terminated|let\s+go|downsizing)/i, weight: 1.8 },
        { pattern: /(?:job\s+security|unstable\s+work|contract\s+ending)/i, weight: 1.4 },
        { pattern: /(?:could\s+(?:fire|get\s+fired)|might\s+(?:lose|fire)|fear\s+(?:of\s+)?(?:losing|firing))/i, weight: 2.2 },
        { pattern: /(?:risk\s+(?:of\s+)?(?:being\s+)?fired|job\s+(?:at\s+)?risk)/i, weight: 2.0 }
      ],
      category: "work",
      description: "External work circumstances and job security"
    },

    // Self-Worth and Identity Triggers
    self_worth: {
      patterns: [
        { pattern: /(?:feel\s+(?:less\s+than|inferior|worthless|useless|inadequate)|not\s+good\s+enough)/i, weight: 2.5 },
        { pattern: /(?:everyone\s+(?:else\s+)?is\s+(?:better|smarter|more\s+successful)|I'm\s+(?:the\s+)?worst)/i, weight: 2.3 },
        { pattern: /(?:don'?t\s+(?:deserve|belong|measure\s+up)|waste\s+of\s+space|failure)/i, weight: 2.4 },
        { pattern: /(?:compare\s+myself|others\s+have\s+it\s+figured\s+out|behind\s+in\s+life)/i, weight: 2.0 },
        { pattern: /(?:hate\s+myself|I'm\s+(?:a\s+)?failure|feel\s+like\s+(?:a\s+)?loser)/i, weight: 2.4 }
      ],
      category: "identity",
      description: "Core self-esteem and identity issues"
    },

    // Academic/Educational regret
    educational_regret: {
      patterns: [
        { pattern: /(?:(?:master'?s?|degree|mba|phd|education|diploma)\s+(?:is\s+)?(?:useless|worthless|waste|pointless))/i, weight: 2.2 },
        { pattern: /(?:wrong\s+(?:degree|major|field|career\s+path)|should\s+have\s+studied)/i, weight: 2.0 },
        { pattern: /(?:wasted\s+(?:time|years|money)\s+(?:on\s+)?(?:school|college|university|degree))/i, weight: 2.1 },
        { pattern: /(?:overqualified|too\s+educated|degree\s+(?:doesn'?t|won'?t)\s+help)/i, weight: 1.8 }
      ],
      category: "life_path",
      description: "Regret about educational choices and career path alignment"
    },

    // Career direction confusion
    career_direction: {
      patterns: [
        { pattern: /(?:don'?t\s+know\s+what\s+(?:to\s+do|I\s+want)|career\s+(?:confusion|crisis|lost))/i, weight: 1.8 },
        { pattern: /(?:wrong\s+(?:career|path|field)|not\s+meant\s+for\s+this)/i, weight: 1.7 },
        { pattern: /(?:passion|purpose|calling|what\s+I'm\s+supposed\s+to\s+do)/i, weight: 1.5 }
      ],
      category: "life_path",
      description: "Uncertainty about life direction and purpose"
    },

    // Communication and Social Triggers  
    social_disconnection: {
      patterns: [
        { pattern: /(?:nobody\s+(?:understands|listens\s+to)\s+me)/i, weight: 1.8 },
        { pattern: /(?:feel\s+(?:alone|lonely|isolated|disconnected))/i, weight: 1.7 },
        { pattern: /(?:no\s+one\s+(?:cares|gets\s+it|understands))/i, weight: 1.9 },
        { pattern: /(?:nobody|no\s+one|don'?t\s+have\s+anybody)\s+(?:to\s+rely\s+on|that\s+I\s+can\s+rely\s+on)/i, weight: 2.5 }
      ],
      category: "social",
      description: "Social isolation and communication difficulties"
    },

    validation_seeking: {
      patterns: [
        { pattern: /(?:please\s+listen|need\s+(?:someone\s+to\s+)?(?:listen|understand))/i, weight: 1.6 },
        { pattern: /(?:hear\s+me\s+out|pay\s+attention\s+to\s+me)/i, weight: 1.5 },
        { pattern: /(?:validate\s+(?:my\s+)?feelings|need\s+validation)/i, weight: 1.4 },
        { pattern: /(?:don'?t\s+stop|keep\s+listening)/i, weight: 1.3 }
      ],
      category: "social",
      description: "Need for validation and being heard"
    },

    // Social comparison and belonging
    social_comparison: {
      patterns: [
        { pattern: /(?:everyone\s+(?:else\s+)?(?:has|got|is)|peers\s+are|friends\s+are\s+more)/i, weight: 1.6 },
        { pattern: /(?:behind\s+(?:in\s+life|everyone)|late\s+bloomer|not\s+where\s+I\s+should\s+be)/i, weight: 1.8 },
        { pattern: /(?:social\s+media|instagram|facebook|linkedin)\s*(?:makes\s+me|shows\s+everyone)/i, weight: 1.4 }
      ],
      category: "social",
      description: "Social comparison and fear of being left behind"
    },

    // Emotional State Triggers
    emotional_distress: {
      patterns: [
        { pattern: /(?:feel\s+(?:bad|terrible|awful|horrible|miserable))/i, weight: 1.5 },
        { pattern: /(?:emotionally\s+(?:drained|exhausted)|can'?t\s+handle)/i, weight: 1.8 },
        { pattern: /(?:frustrated|upset|bothered|distressed)/i, weight: 1.3 },
        { pattern: /(?:don'?t\s+feel\s+(?:good|understood|heard|valued))/i, weight: 1.3 },
        { pattern: /(?:feel\s+(?:really|very|so|extremely)\s+(?:bad|terrible|awful|sad|anxious))/i, weight: 2.0 },
        { pattern: /(?:also\s+(?:anxious|worried|scared)|and\s+(?:anxious|worried|scared))/i, weight: 1.7 }
      ],
      category: "emotional",
      description: "General emotional distress and negative feelings"
    },

    // Financial (Only when explicitly about money) - More specific
    financial_security: {
      patterns: [
        { pattern: /(?:can'?t\s+afford\s+(?:bills|rent|food|groceries|mortgage))/i, weight: 1.8 },
        { pattern: /(?:financial\s+(?:crisis|emergency|trouble|stress))/i, weight: 1.7 },
        { pattern: /(?:broke|bankruptcy|debt\s+problems|money\s+problems)/i, weight: 1.6 },
        { pattern: /(?:lost\s+(?:my\s+)?house|eviction|foreclosure)/i, weight: 2.0 },
        { pattern: /(?:don'?t\s+have\s+money|can'?t\s+pay|need\s+money\s+for)/i, weight: 1.9 }
      ],
      category: "practical",
      description: "Financial security and money concerns"
    },

    // Transportation and practical issues
    transportation_crisis: {
      patterns: [
        { pattern: /(?:car\s+accident|crashed\s+(?:my\s+)?car|accident\s+today)/i, weight: 2.2 },
        { pattern: /(?:need\s+(?:to\s+)?(?:find|buy)\s+(?:a\s+)?new\s+car|have\s+to\s+(?:find|buy)\s+(?:a\s+)?(?:new\s+)?car)/i, weight: 1.8 },
        { pattern: /(?:car\s+(?:broke|damaged|totaled)|without\s+(?:a\s+)?car)/i, weight: 1.7 }
      ],
      category: "practical",
      description: "Transportation and mobility concerns"
    },

    // Future uncertainty 
    future_anxiety: {
      patterns: [
        { pattern: /(?:what\s+(?:if|will\s+happen)|future|uncertain|don'?t\s+know\s+what)/i, weight: 1.2 },
        { pattern: /(?:career\s+(?:prospects|future|options)|job\s+market|employment\s+outlook)/i, weight: 1.4 },
        { pattern: /(?:don'?t\s+know\s+where\s+(?:to\s+find|I\s+can\s+find)|don'?t\s+know\s+where)/i, weight: 1.6 }
      ],
      category: "existential",
      description: "Uncertainty about future outcomes and planning"
    },

    // Family and Relationship Triggers
    family_expectations: {
      patterns: [
        { pattern: /(?:family\s+(?:expects|disappointed|pressure)|parents\s+(?:think|expect|invested))/i, weight: 1.6 },
        { pattern: /(?:let\s+(?:everyone|family|parents)\s+down|disappointed\s+(?:family|parents))/i, weight: 1.7 }
      ],
      category: "social",
      description: "Family expectations and pressure"
    }
  };

  // DETECT ALL TRIGGERS - Not just the highest scoring one
  const detectedTriggers: Record<string, number> = {};
  const triggerDetails: Record<string, any> = {};

  console.log("=== SCANNING FOR ALL POSSIBLE TRIGGERS ===");

  // Check every trigger pattern
  for (const [triggerKey, triggerData] of Object.entries(triggerPatterns)) {
    let triggerScore = 0;
    let matchedPatterns: string[] = [];

    // Check current message
    for (const { pattern, weight } of triggerData.patterns) {
      if (pattern.test(text)) {
        triggerScore += weight;
        matchedPatterns.push(`Current: ${pattern.toString()}`);
        console.log(`✓ TRIGGER DETECTED: ${triggerKey} - ${pattern} (weight: ${weight})`);
      }

      // Also check conversation history for context
      if (pattern.test(fullConversation)) {
        triggerScore += weight * 0.3; // Lower weight for historical context
        matchedPatterns.push(`History: ${pattern.toString()}`);
      }
    }

    // Include trigger if it has ANY score above threshold
    if (triggerScore >= 0.5) { // Lower threshold to catch more triggers
      detectedTriggers[triggerKey] = triggerScore;
      triggerDetails[triggerKey] = {
        score: triggerScore,
        category: triggerData.category,
        description: triggerData.description,
        matchedPatterns: matchedPatterns
      };

      console.log(`📋 TRIGGER CONFIRMED: ${triggerKey} - Score: ${triggerScore.toFixed(2)}`);
    }
  }

  // RANK ALL TRIGGERS by score
  const rankedTriggers = Object.entries(detectedTriggers)
    .sort(([,a], [,b]) => b - a) // Sort by score descending
    .map(([trigger, score]) => ({
      trigger,
      score: score.toFixed(2),
      category: triggerDetails[trigger].category,
      description: triggerDetails[trigger].description,
      confidence: score >= 2.0 ? 'high' : score >= 1.0 ? 'medium' : 'low'
    }));

  // CATEGORIZE TRIGGERS by type
  const triggersByCategory: Record<string, Array<{trigger: string; score: number; description: string}>> = {};
  for (const [trigger, details] of Object.entries(triggerDetails)) {
    const category = details.category;
    if (!triggersByCategory[category]) {
      triggersByCategory[category] = [];
    }
    triggersByCategory[category].push({
      trigger,
      score: details.score,
      description: details.description
    });
  }

  // IDENTIFY COMPOUND PATTERNS (multiple triggers in same message)
  const compoundPatterns: Array<{name: string; description: string; triggers: string[]}> = [];
  if (rankedTriggers.length >= 2) {
    // Check for specific compound patterns
    const triggerNames = rankedTriggers.map(t => t.trigger);

    if (triggerNames.includes('work_dissatisfaction') && triggerNames.includes('work_communication')) {
      compoundPatterns.push({
        name: 'job_communication_frustration',
        description: 'Job dissatisfaction combined with communication issues',
        triggers: ['work_dissatisfaction', 'work_communication']
      });
    }

    if (triggerNames.includes('emotional_distress') && triggerNames.includes('validation_seeking')) {
      compoundPatterns.push({
        name: 'distress_validation_seeking',
        description: 'Emotional distress with need for validation',
        triggers: ['emotional_distress', 'validation_seeking']
      });
    }

    if (triggerNames.includes('work_environment') && triggerNames.includes('financial_security')) {
      compoundPatterns.push({
        name: 'job_loss_financial_anxiety',
        description: 'Job loss creating financial security concerns',
        triggers: ['work_environment', 'financial_security']
      });
    }

    if (triggerNames.includes('transportation_crisis') && (triggerNames.includes('financial_security') || triggerNames.includes('work_environment'))) {
      compoundPatterns.push({
        name: 'accident_financial_job_crisis',
        description: 'Car accident creating cascading financial and job concerns',
        triggers: triggerNames.filter(t => ['transportation_crisis', 'financial_security', 'work_environment'].includes(t))
      });
    }

    if (triggerNames.includes('social_disconnection') && triggerNames.length >= 2) {
      compoundPatterns.push({
        name: 'isolated_multi_stressor',
        description: 'Multiple stressors combined with social isolation',
        triggers: triggerNames
      });
    }
  }

  console.log("\n=== MULTIPLE TRIGGER DETECTION RESULTS ===");
  console.log(`Total triggers detected: ${rankedTriggers.length}`);
  console.log("All triggers:", rankedTriggers.map(t => `${t.trigger} (${t.confidence})`).join(', '));
  console.log("Categories affected:", Object.keys(triggersByCategory).join(', '));
  console.log("Compound patterns:", compoundPatterns.map(p => p.name).join(', '));

  return {
    // ALL detected triggers
    allTriggers: rankedTriggers,

    // Primary trigger (highest scoring)
    primaryTrigger: rankedTriggers.length > 0 ? rankedTriggers[0] : null,

    // Secondary triggers
    secondaryTriggers: rankedTriggers.slice(1),

    // Triggers organized by category
    triggersByCategory,

    // Compound trigger patterns
    compoundPatterns,

    // Summary stats
    summary: {
      totalTriggers: rankedTriggers.length,
      categories: Object.keys(triggersByCategory),
      highConfidenceTriggers: rankedTriggers.filter(t => t.confidence === 'high').length,
      hasCompoundPattern: compoundPatterns.length > 0
    },

    // Detailed breakdown for debugging
    details: triggerDetails
  };
}

// Enhanced anxiety detection that considers trigger context
function detectAnxietyLevelWithTriggerContext(
  message: string, 
  history: ConversationMessage[], 
  triggers: MultipleTriggerResult
): number | null {
  const text = message.toLowerCase();

  // Base anxiety detection (from enhanced system)
  let baseAnxietyScore = detectAnxietyLevelFixed(message, history);

  if (baseAnxietyScore === null) {
    baseAnxietyScore = 1; // Minimum baseline if triggers are present
  }

  // Adjust anxiety score based on trigger complexity
  let triggerComplexityMultiplier = 1.0;

  // Multiple triggers increase anxiety
  const totalTriggers = triggers.summary.totalTriggers;

  if (totalTriggers >= 4) {
    triggerComplexityMultiplier = 1.5; // Very complex trigger situation
  } else if (totalTriggers >= 2) {
    triggerComplexityMultiplier = 1.3; // Multiple interconnected triggers
  }

  // Specific trigger patterns that indicate higher anxiety
  const highAnxietyTriggers = ['self_worth', 'educational_regret', 'career_direction', 'work_environment', 'transportation_crisis', 'social_disconnection'];
  const hasHighAnxietyTrigger = triggers.primaryTrigger && highAnxietyTriggers.includes(triggers.primaryTrigger.trigger) ||
                               triggers.secondaryTriggers.some(t => highAnxietyTriggers.includes(t.trigger));

  if (hasHighAnxietyTrigger) {
    triggerComplexityMultiplier *= 1.2;
  }

  // Compound triggers suggest deeper psychological impact
  if (triggers.compoundPatterns.length > 0) {
    triggerComplexityMultiplier *= 1.4;
  }

  // Calculate final anxiety score
  let finalScore = Math.round(baseAnxietyScore * triggerComplexityMultiplier);
  finalScore = Math.min(finalScore, 10); // Cap at 10

  console.log(`Enhanced anxiety calculation: base=${baseAnxietyScore}, multiplier=${triggerComplexityMultiplier.toFixed(2)}, final=${finalScore}`);

  return finalScore;
}

// Generate therapeutic recommendations based on trigger analysis
function generateTherapeuticRecommendations(triggers: MultipleTriggerResult, anxietyLevel: number | null): string[] {
  const recommendations: string[] = [];

  // Recommendations based on trigger complexity
  if (triggers.summary.totalTriggers >= 4) {
    recommendations.push("Multi-modal crisis intervention required for complex trigger situation");
    recommendations.push("Address interconnected stressors systematically");
  } else if (triggers.summary.totalTriggers >= 2) {
    recommendations.push("Integrated therapeutic approach for multiple triggers");
  }

  // Compound pattern specific recommendations
  if (triggers.compoundPatterns.some(p => p.name === 'accident_financial_job_crisis')) {
    recommendations.push("Emergency practical support needed for cascading crisis");
    recommendations.push("Address immediate safety and stability concerns");
  }

  if (triggers.compoundPatterns.some(p => p.name === 'isolated_multi_stressor')) {
    recommendations.push("Social support network building critical for coping");
    recommendations.push("Address isolation as both trigger and barrier to healing");
  }

  // Anxiety level based recommendations
  if (anxietyLevel && anxietyLevel >= 7) {
    recommendations.push("High anxiety level requires immediate intervention");
    recommendations.push("Consider crisis stabilization techniques");
  }

  return recommendations;
}

// Enhanced processing function for complex scenarios
async function enhancedChatProcessing(message: string, session: AnxietySession, history: ConversationMessage[]) {
  // Comprehensive trigger analysis
  const triggerAnalysis = detectAllTriggers(message, history);
  
  // Context-aware anxiety detection
  const anxietyLevel = detectAnxietyLevelWithTriggerContext(message, history, triggerAnalysis);
  
  // Enhanced session tracking
  await storage.updateSessionState(session.id, message, "");
  
  return { triggerAnalysis, anxietyLevel };
}

// Validate API key first
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("❌ CRITICAL ERROR: ANTHROPIC_API_KEY environment variable is not set!");
  console.error("Please set your Anthropic API key in your environment variables");
  throw new Error("Missing ANTHROPIC_API_KEY - Server cannot start without it");
}

console.log("✅ ANTHROPIC_API_KEY found:", process.env.ANTHROPIC_API_KEY.substring(0, 10) + "...");

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Enhanced Claude API call with multiple trigger awareness
async function callEnhancedClaudeAPI(
  message: string,
  currentSession: AnxietySession,
  sessionHistory: ConversationMessage[],
  triggerAnalysis: MultipleTriggerResult,
  anxietyLevel: number | null
): Promise<string> {

  const getMultiTriggerPersona = (language: string, anxietyLevel: number | null, triggerAnalysis: MultipleTriggerResult) => {
    const basePersona = {
      name: language === 'es' ? "Mónica" : language === 'pt' ? "Luciana" : "Vanessa",
      accent: language === 'es' ? "a warm, understanding Spanish accent" : 
              language === 'pt' ? "a caring Brazilian Portuguese accent" : 
              "a supportive British English accent"
    };

    const triggerComplexity = triggerAnalysis.summary.totalTriggers;

    let psychologicalUnderstanding = "";
    let therapeuticPriorities = "";
    let specificInsights = "";

    if (triggerComplexity >= 4) {
      psychologicalUnderstanding = `This person is experiencing a VERY COMPLEX psychological situation with ${triggerComplexity} interconnected triggers across multiple life domains (${triggerAnalysis.summary.categories.join(', ')}). This represents a genuine multi-dimensional crisis requiring sophisticated therapeutic understanding.`;
      
      therapeuticPriorities = `CRITICAL: Do not oversimplify this complex situation. Address the interconnected nature of their triggers. This is not a simple single-issue case - it requires comprehensive, multi-faceted support that acknowledges how their various concerns amplify each other.`;
    } else if (triggerComplexity >= 2) {
      psychologicalUnderstanding = `This person has multiple interconnected concerns (${triggerAnalysis.allTriggers.map(t => t.trigger).join(', ')}) that are affecting them simultaneously. The complexity requires integrated therapeutic attention.`;
      
      therapeuticPriorities = `Address multiple triggers simultaneously rather than focusing on just one. Show understanding of how their concerns connect to each other.`;
    } else if (triggerComplexity === 1) {
      psychologicalUnderstanding = `Primary concern: ${triggerAnalysis.primaryTrigger?.description}. Focus therapeutic attention on this main trigger while remaining alert for related issues.`;
      
      therapeuticPriorities = `Provide targeted support for their primary concern while building therapeutic rapport.`;
    } else {
      psychologicalUnderstanding = `General emotional distress without clear trigger patterns detected.`;
      
      therapeuticPriorities = `Explore underlying concerns through supportive questioning and validation.`;
    }

    // Compound pattern specific insights
    if (triggerAnalysis.compoundPatterns.some(p => p.name === 'distress_validation_seeking')) {
      specificInsights += `KEY INSIGHT: Emotional distress with urgent need for validation. The repetitive "please listen" pattern indicates they feel unheard. Provide immediate validation while addressing underlying distress. `;
    }

    if (triggerAnalysis.compoundPatterns.some(p => p.name === 'accident_financial_job_crisis')) {
      specificInsights += `KEY INSIGHT: Cascading crisis situation - car accident creating financial strain and job security concerns. This is a genuine multi-domain emergency requiring comprehensive support. `;
    }

    if (triggerAnalysis.compoundPatterns.some(p => p.name === 'isolated_multi_stressor')) {
      specificInsights += `KEY INSIGHT: Multiple major stressors COMBINED with social isolation. The lack of support system makes all other problems more severe. Address both the practical issues AND the isolation. `;
    }

    return {
      ...basePersona,
      psychologicalUnderstanding,
      therapeuticPriorities,
      specificInsights,
      triggerComplexity
    };
  };

  const persona = getMultiTriggerPersona(
    currentSession.language as string, 
    anxietyLevel,
    triggerAnalysis
  );

  // Create highly sophisticated system prompt
  const systemPrompt = `You are ${persona.name}, an advanced therapeutic AI companion with deep psychological insight. You speak with a natural British accent - never mention the accent itself in responses. Respond conversationally without describing speech characteristics.

=== CURRENT PSYCHOLOGICAL ASSESSMENT ===
${persona.psychologicalUnderstanding}

ANXIETY LEVEL: ${anxietyLevel || 'Not assessed'}/10

=== THERAPEUTIC UNDERSTANDING ===
${persona.therapeuticPriorities}

${persona.specificInsights}

=== RESPONSE GUIDELINES BASED ON TRIGGER COMPLEXITY ===

${persona.triggerComplexity >= 4 ? `
VERY HIGH COMPLEXITY SITUATION - Multiple Interconnected Triggers:
- DO NOT oversimplify by focusing on just one issue
- Acknowledge the complexity: "I can see there are several interconnected things affecting you"
- Address the DEEPER psychological patterns, not just surface issues
- Help them understand how their concerns connect to each other
- Use phrases like "What you're describing involves multiple areas of your life"
- Validate that this is genuinely complex and difficult
- Provide comprehensive support that addresses multiple dimensions
` : persona.triggerComplexity >= 2 ? `
MODERATE-HIGH COMPLEXITY - Multiple Related Triggers:
- Acknowledge multiple concerns simultaneously
- Help connect the different issues
- Don't treat each trigger separately - show the connections
- Use integrative therapeutic approaches
` : `
SINGLE TRIGGER SITUATION:
- Focus directly on the primary concern
- Provide targeted intervention
- Monitor for related issues
`}

SPECIFIC THERAPEUTIC APPROACHES:

${triggerAnalysis.compoundPatterns.some(p => p.name === 'accident_financial_job_crisis') ? `
🔑 CASCADING CRISIS PATTERN - CAR ACCIDENT + FINANCIAL + JOB:
- This is a genuine multi-domain emergency situation
- Acknowledge the overwhelming nature: "You're dealing with multiple major challenges all at once"
- Address immediate safety and stability needs first
- Validate that this level of stress is genuinely difficult to handle
- Don't minimize - this warrants high anxiety and requires comprehensive support
` : ''}

${triggerAnalysis.compoundPatterns.some(p => p.name === 'isolated_multi_stressor') ? `
🔑 ISOLATED MULTI-STRESSOR PATTERN:
- Multiple major problems PLUS no support system
- This makes everything exponentially more difficult
- Address the isolation as both a trigger and a barrier to coping
- Validate how much harder everything is without support
- Focus on both practical help AND connection building
` : ''}

${triggerAnalysis.triggersByCategory.practical && triggerAnalysis.triggersByCategory.practical.length >= 2 ? `
🔑 MULTIPLE PRACTICAL CRISIS TRIGGERS:
- Concrete life problems requiring both emotional support AND practical solutions
- Address both the emotional impact AND offer practical guidance
- Acknowledge that practical problems create real stress and anxiety
` : ''}

VOICE AND COMMUNICATION:
- For Spanish: Use Microsoft Mónica's clear, supportive Spanish tone from Spain (es-ES)
- For Portuguese: Use Luciana's warm Brazilian accent (pt-BR)  
- For English: Use Vanessa's clear UK English accent (en-GB)

CRITICAL RESPONSE REQUIREMENTS:
1. Match the psychological complexity - don't oversimplify complex situations
2. Address ALL major triggers, not just the primary one
3. Acknowledge interconnections between triggers when present
4. Provide depth appropriate to the trigger complexity
5. Use validation that matches the situation's actual complexity
6. For compound patterns, address BOTH elements simultaneously
7. For high anxiety situations (7+/10), acknowledge the genuine severity

EXAMPLE COMPLEX RESPONSE PATTERN FOR MULTIPLE TRIGGERS:
"I can hear that you're dealing with several interconnected concerns here - you're worried about potentially losing your job, you've had a car accident that's created financial stress, and you're feeling like you don't have anyone to rely on for support. These challenges are all affecting each other and creating a really difficult situation. Let me address both the practical concerns you're facing and the emotional impact of going through all of this without adequate support..."

Remember: Multiple trigger situations require sophisticated responses that acknowledge the interconnected nature of human psychological experience and address all major concerns simultaneously. High anxiety scores (7-9/10) for multiple major life stressors are realistic and appropriate.`;

  try {
    // Enhanced message preparation with multiple trigger context
    const typedMessages: TypedMessage[] = [];

    // Add conversation history with trigger awareness
    const recentHistory = sessionHistory.slice(-6);

    for (const entry of recentHistory) {
      typedMessages.push({
        role: entry.isUser ? "user" : "assistant",
        content: entry.text
      });
    }

    // Add current message
    typedMessages.push({
      role: "user",
      content: message
    });

    console.log("Enhanced multiple-trigger context sent to Claude:", JSON.stringify({
      messageCount: typedMessages.length,
      anxietyLevel: anxietyLevel,
      totalTriggers: triggerAnalysis.summary.totalTriggers,
      primaryTrigger: triggerAnalysis.primaryTrigger?.trigger,
      secondaryTriggers: triggerAnalysis.secondaryTriggers.map(t => t.trigger),
      compoundPatterns: triggerAnalysis.compoundPatterns.map(p => p.name),
      triggerCategories: triggerAnalysis.summary.categories,
      triggerComplexity: persona.triggerComplexity,
      language: currentSession.language
    }));

    // API call with complexity-adjusted parameters
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022", // the newest Anthropic model is "claude-3-5-sonnet-20241022" which was released after your knowledge cutoff
      max_tokens: persona.triggerComplexity >= 4 ? 500 : persona.triggerComplexity >= 2 ? 400 : 300, // More tokens for complex situations
      temperature: 0.8, // Higher for more nuanced responses to complex situations
      messages: typedMessages,
      system: systemPrompt
    });

    console.log("Enhanced multiple-trigger Claude API response received");

    if (response.content && response.content.length > 0) {
      const firstContent = response.content[0];
      if (firstContent.type === 'text') {
        return firstContent.text;
      }
    }

    return "I'm sorry, I couldn't generate a proper response.";
  } catch (error: any) {
    console.error('Enhanced multiple-trigger Claude API error:', error);

    if (error.message?.includes('API key') || error.message?.includes('authentication')) {
      return "I'm having trouble with my knowledge service authentication. Please verify that your API key is correct.";
    }

    if (error.message?.includes('rate') || error.message?.includes('limit')) {
      return "I'm currently experiencing high demand. Please try again in a few minutes.";
    }

    if (error.message?.includes('network') || error.message?.includes('timeout')) {
      return "I'm having trouble connecting to my knowledge services. Please check your internet connection.";
    }

    return "I'm having trouble connecting to my services right now. Please try again in a moment.";
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Add CORS support for mobile apps (ADD THIS HERE)
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Enhanced Chat API endpoint with proper frontend-compatible analytics
  app.post("/api/chat", async (req, res) => {
    try {
      console.log("=== CHAT API REQUEST DEBUG ===");
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      console.log("API Key present:", !!process.env.ANTHROPIC_API_KEY);
      console.log("Request headers:", req.headers);
      const { sessionId, text, language } = req.body;

      if (!sessionId || !text) {
        console.log("Invalid request - missing sessionId or text:", req.body);
        return res.status(400).json({
          success: false,
          message: "Missing sessionId or text in request"
        });
      }

      console.log(`Processing enhanced multiple-trigger chat message for session ${sessionId}: ${text}`);

      // Get session and history
      const session = await storage.getAnxietySession(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found"
        });
      }

      const sessionHistory = await storage.getConversationHistory(sessionId);

      // Enhanced processing with multiple trigger analysis
      const { triggerAnalysis, anxietyLevel } = await enhancedChatProcessing(text, session, sessionHistory);

      // Store user message
      await storage.addConversationMessage({
        sessionId: sessionId,
        text: text,
        isUser: true,
        timestamp: new Date()
      });

      // Generate enhanced response
      const aiResponse = await callEnhancedClaudeAPI(
        text,
        session,
        sessionHistory,
        triggerAnalysis,
        anxietyLevel
      );

      // Store AI response
      await storage.addConversationMessage({
        sessionId: sessionId,
        text: aiResponse,
        isUser: false,
        timestamp: new Date()
      });

      // Update session with enhanced analytics
      await storage.updateAnxietySession(sessionId, {
        preAnxietyLevel: anxietyLevel,
        stage: 'assessment'
      });

      console.log("Enhanced multiple-trigger Claude API response received");

      res.json({
        success: true,
        message: {
          type: "message",
          text: aiResponse,
          anxietyLevel: anxietyLevel,
          triggerAnalysis: triggerAnalysis
        },
        analytics: {
          anxietyLevel: anxietyLevel,
          triggers: triggerAnalysis?.allTriggers?.map(t => t.trigger) || [],
          stressFactors: triggerAnalysis?.compoundPatterns || []
        }
      });

    } catch (error: any) {
      console.error("Enhanced multiple-trigger chat API error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process enhanced chat request",
        error: error.message
      });
    }
  });

  // Enhanced Session Management
  app.post("/api/sessions", async (req, res) => {
    try {
      console.log("Creating enhanced multiple-trigger session with data:", req.body);
      
      const sessionData = {
        userId: req.body.userId || "temp-user",
        language: req.body.language || "en",
        startTime: new Date(),
        stage: "idle",
        triggerCategory: null,
        triggerDescription: null,
        preAnxietyLevel: null,
        intervention: null,
        interventionType: null,
        postAnxietyLevel: null,
        notes: null
      };

      const parsedSessionData = insertAnxietySessionSchema.parse(sessionData);
      const session = await storage.createAnxietySession(parsedSessionData);

      console.log("Enhanced multiple-trigger session created:", session);
      res.status(201).json(session);
    } catch (error: any) {
      console.error("Session creation error:", error);
      
      let errorResponse: any = { 
        message: "Invalid session data"
      };

      if (error.errors) {
        errorResponse.errors = error.errors;
      } else if (error.message) {
        errorResponse.error = error.message;
      }

      res.status(400).json(errorResponse);
    }
  });

  app.get("/api/sessions", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const sessions = await storage.getAnxietySessionsByUserId(userId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving sessions" });
    }
  });

  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const session = await storage.getAnxietySession(id);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving session" });
    }
  });

  app.put("/api/sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const sessionUpdateSchema = insertAnxietySessionSchema.partial();
      const parsedBody = sessionUpdateSchema.parse(req.body);

      const updatedSession = await storage.updateAnxietySession(id, parsedBody);

      if (!updatedSession) {
        return res.status(404).json({ message: "Session not found" });
      }

      res.json(updatedSession);
    } catch (error) {
      res.status(400).json({ message: "Invalid session data" });
    }
  });

  // Enhanced Conversation Messages API
  app.get("/api/sessions/:id/messages", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const messages = await storage.getConversationHistory(sessionId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving messages" });
    }
  });

  app.post("/api/sessions/:id/messages", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const messageData = {
        ...req.body,
        sessionId,
        timestamp: new Date()
      };

      const parsedBody = insertConversationMessageSchema.parse(messageData);
      const message = await storage.addConversationMessage(parsedBody);

      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  // Enhanced Analytics API with Multiple Trigger Analysis
  app.get("/api/sessions/:id/analytics", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getAnxietySession(sessionId);
      const messages = await storage.getConversationHistory(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Calculate enhanced session analytics
      const userMessages = messages.filter(msg => msg.isUser);
      const fullConversation = userMessages.map(msg => msg.text).join(' ');

      // Run multiple trigger analysis on the full conversation
      const overallTriggerAnalysis = detectAllTriggers(fullConversation, messages);

      // Calculate anxiety progression
      const anxietyDetections = userMessages.map(msg => ({
        message: msg.text,
        anxietyLevel: detectAnxietyLevelWithTriggerContext(msg.text, messages, overallTriggerAnalysis),
        timestamp: msg.timestamp
      })).filter(detection => detection.anxietyLevel !== null);

      const analytics = {
        sessionId,
        totalMessages: messages.length,
        userMessages: userMessages.length,
        aiMessages: messages.length - userMessages.length,

        // Enhanced multiple trigger analysis
        triggerAnalysis: {
          totalTriggers: overallTriggerAnalysis.summary.totalTriggers,
          primaryTrigger: overallTriggerAnalysis.primaryTrigger,
          secondaryTriggers: overallTriggerAnalysis.secondaryTriggers,
          allTriggers: overallTriggerAnalysis.allTriggers,
          triggersByCategory: overallTriggerAnalysis.triggersByCategory,
          compoundPatterns: overallTriggerAnalysis.compoundPatterns,
          triggerCategories: overallTriggerAnalysis.summary.categories,
          highConfidenceTriggers: overallTriggerAnalysis.summary.highConfidenceTriggers,
          hasCompoundPattern: overallTriggerAnalysis.summary.hasCompoundPattern,
          triggerComplexity: overallTriggerAnalysis.summary.totalTriggers
        },

        // Anxiety tracking
        anxietyProgression: {
          detections: anxietyDetections.length,
          initialLevel: session.preAnxietyLevel,
          currentLevel: session.postAnxietyLevel,
          progression: anxietyDetections.map(d => ({
            level: d.anxietyLevel,
            timestamp: d.timestamp
          }))
        },

        // Session metadata
        sessionStage: session.stage,
        sessionDuration: session.startTime ? new Date().getTime() - new Date(session.startTime).getTime() : null,

        // Therapeutic recommendations
        therapeuticRecommendations: generateTherapeuticRecommendations(
          overallTriggerAnalysis, 
          session.postAnxietyLevel || session.preAnxietyLevel
        )
      };

      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving enhanced analytics" });
    }
  });

  // Enhanced Support APIs
  app.get("/api/triggers", (req, res) => {
    const triggers = [
      // Primary psychological triggers
      { id: "work_dissatisfaction", name: "Job Dissatisfaction", category: "work" },
      { id: "work_communication", name: "Workplace Communication Issues", category: "work" },
      { id: "work_performance", name: "Work Performance Anxiety", category: "work" },  
      { id: "work_environment", name: "Job Security Concerns", category: "work" },
      { id: "self_worth", name: "Self-Worth Issues", category: "identity" },
      { id: "educational_regret", name: "Educational Path Concerns", category: "life_path" },
      { id: "career_direction", name: "Career Direction Uncertainty", category: "life_path" },
      { id: "social_disconnection", name: "Social Isolation", category: "social" },
      { id: "validation_seeking", name: "Need for Validation", category: "social" },
      { id: "social_comparison", name: "Social Comparison", category: "social" },
      { id: "emotional_distress", name: "General Emotional Distress", category: "emotional" },
      { id: "financial_security", name: "Financial Crisis", category: "practical" },
      { id: "transportation_crisis", name: "Car Accident", category: "practical" },
      { id: "future_anxiety", name: "Future Uncertainty", category: "existential" },
      { id: "family_expectations", name: "Family Expectations", category: "social" },

      // Compound trigger patterns
      { id: "job_communication_frustration", name: "Job + Communication Issues", category: "compound" },
      { id: "distress_validation_seeking", name: "Distress + Validation Needs", category: "compound" },
      { id: "work_identity_crisis", name: "Work + Identity Crisis", category: "compound" },
      { id: "accident_financial_job_crisis", name: "Car Accident + Financial + Job Crisis", category: "compound" },
      { id: "isolated_multi_stressor", name: "Multiple Stressors + Social Isolation", category: "compound" },
      { id: "education_career_mismatch", name: "Education + Career Mismatch", category: "compound" },
      { id: "comparative_self_worth", name: "Comparative Self-Worth Issues", category: "compound" },
      { id: "job_loss_financial_anxiety", name: "Job Loss + Financial Crisis", category: "compound" },
      { id: "educational_family_pressure", name: "Educational + Family Pressure", category: "compound" }
    ];
    res.json({ triggers });
  });

  app.get("/api/interventions", (req, res) => {
    const interventions = [
      // Multiple trigger specific interventions
      {
        id: "multiple_trigger_cognitive_restructuring",
        name: "Multiple Trigger Cognitive Restructuring",
        description: "Address interconnected negative thought patterns across multiple life domains",
        complexity: "high"
      },
      {
        id: "crisis_management_cascading_stressors",
        name: "Crisis Management for Cascading Stressors",
        description: "Emergency intervention for multiple major life stressors occurring simultaneously",
        complexity: "high"
      },
      {
        id: "comprehensive_trigger_mapping",
        name: "Comprehensive Trigger Mapping",
        description: "Visualize and address all interconnected trigger patterns simultaneously",
        complexity: "high"
      },
      {
        id: "category_based_intervention",
        name: "Category-Based Intervention Planning",
        description: "Address triggers by psychological category (work, social, emotional, practical)",
        complexity: "moderate"
      },
      {
        id: "compound_pattern_therapy",
        name: "Compound Pattern Therapy",
        description: "Specialized approach for compound trigger patterns like job+communication issues",
        complexity: "high"
      },
      {
        id: "priority_based_trigger_treatment",
        name: "Priority-Based Trigger Treatment",
        description: "Address high-confidence triggers first, then work through secondary triggers",
        complexity: "moderate"
      },
      {
        id: "identity_work_integration",
        name: "Identity-Work Integration Therapy",
        description: "Separate personal identity from professional circumstances",
        complexity: "high"
      },
      {
        id: "validation_communication_training",
        name: "Validation & Communication Training",
        description: "For cases with validation-seeking and communication triggers",
        complexity: "moderate"
      },
      {
        id: "educational_reframing",
        name: "Educational Experience Reframing",
        description: "Transform educational regret into transferable skill recognition",
        complexity: "moderate"
      },
      {
        id: "multi_modal_anxiety_management",
        name: "Multi-Modal Anxiety Management",
        description: "Comprehensive anxiety treatment for multiple trigger situations",
        complexity: "high"
      },
      {
        id: "trauma_informed_crisis_intervention",
        name: "Trauma-Informed Crisis Intervention",
        description: "For situations involving accidents, job loss, and multiple major stressors",
        complexity: "high"
      },
      {
        id: "social_support_network_building",
        name: "Social Support Network Building",
        description: "Address isolation while managing multiple practical and emotional stressors",
        complexity: "moderate"
      }
    ];
    res.json({ interventions });
  });

  return httpServer;
}