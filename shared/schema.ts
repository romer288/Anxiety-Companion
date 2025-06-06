import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: text("email").unique(),
  password: text("password"),
  fullName: text("full_name"),
  zipCode: text("zip_code"),
  city: text("city"),
  age: integer("age"),
  instagramHandle: text("instagram_handle").unique(),
  preferredLanguage: text("preferred_language").default("en").notNull(),
  isTherapist: boolean("is_therapist").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    // Add additional validations
    email: z.string().email("Please provide a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    zipCode: z.string().optional(),
    age: z.number().min(13, "You must be at least 13 years old").optional(),
    preferredLanguage: z.enum(["en", "es", "pt"], {
      invalid_type_error: "Language must be one of: English, Spanish, or Portuguese",
    }).default("en"),
  });

// Anxiety Session schema
export const anxietySessions = pgTable("anxiety_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  triggerCategory: text("trigger_category"),
  triggerDescription: text("trigger_description"),
  // Additional trigger tracking data
  triggerEvents: jsonb("trigger_events"),
  triggerLocation: text("trigger_location"),
  triggerTime: text("trigger_time"),
  triggerPeople: jsonb("trigger_people"),
  triggerFrequency: text("trigger_frequency"),
  // Anxiety measurements
  preAnxietyLevel: integer("pre_anxiety_level"),
  physicalSymptoms: jsonb("physical_symptoms"),
  emotionalSymptoms: jsonb("emotional_symptoms"),
  // Interventions
  intervention: text("intervention"),
  interventionType: text("intervention_type"),
  postAnxietyLevel: integer("post_anxiety_level"),
  interventionEffectiveness: integer("intervention_effectiveness"),
  // Session metadata
  notes: text("notes"),
  stage: text("stage").notNull(),
  language: text("language").default("en").notNull(),
  aiDetectedInsights: jsonb("ai_detected_insights"),
});

// Create a modified schema that accepts ISO string dates
export const insertAnxietySessionSchema = createInsertSchema(anxietySessions)
  .omit({
    id: true,
  })
  .extend({
    startTime: z.string().or(z.date()),
    endTime: z.string().or(z.date()).nullable().optional(),
    triggerEvents: z.array(z.string()).optional(),
    triggerPeople: z.array(z.string()).optional(),
    physicalSymptoms: z.array(z.string()).optional(),
    emotionalSymptoms: z.array(z.string()).optional(),
    aiDetectedInsights: z.record(z.any()).optional(),
    language: z.enum(["en", "es", "pt"]).default("en"),
  });

// Conversation history schema
export const conversationMessages = pgTable("conversation_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  isUser: boolean("is_user").notNull(),
  text: text("text").notNull(),
  language: text("language").default("en").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  // Sentiment analysis and trigger detection for AI responses
  detectedSentiment: text("detected_sentiment"),
  detectedTriggers: jsonb("detected_triggers"),
  detectedAnxietyLevel: integer("detected_anxiety_level"),
  voiceRecorded: boolean("voice_recorded").default(false),
});

export const insertConversationMessageSchema = createInsertSchema(conversationMessages)
  .omit({
    id: true,
  })
  .extend({
    timestamp: z.string().or(z.date()),
    language: z.enum(["en", "es", "pt"]).default("en"),
    detectedTriggers: z.array(z.string()).optional(),
    detectedSentiment: z.enum(["positive", "negative", "neutral"]).optional(),
  });

// Define common anxiety triggers with multilingual support
export const triggerCategories = [
  { 
    id: "work", 
    label: {
      en: "Work/Performance",
      es: "Trabajo/Rendimiento",
      pt: "Trabalho/Desempenho"
    }
  },
  { 
    id: "social", 
    label: {
      en: "Social Situations",
      es: "Situaciones Sociales",
      pt: "Situações Sociais"
    }
  },
  { 
    id: "health", 
    label: {
      en: "Health Concerns",
      es: "Problemas de Salud",
      pt: "Problemas de Saúde"
    }
  },
  { 
    id: "financial", 
    label: {
      en: "Financial Stress",
      es: "Estrés Financiero",
      pt: "Estresse Financeiro"
    }
  },
  { 
    id: "relationship", 
    label: {
      en: "Relationship Issues",
      es: "Problemas de Relación",
      pt: "Problemas de Relacionamento"
    }
  },
  { 
    id: "family", 
    label: {
      en: "Family Conflicts",
      es: "Conflictos Familiares",
      pt: "Conflitos Familiares"
    }
  },
  { 
    id: "academic", 
    label: {
      en: "Academic Pressure",
      es: "Presión Académica",
      pt: "Pressão Acadêmica"
    }
  },
  { 
    id: "uncertainty", 
    label: {
      en: "Uncertainty/Future",
      es: "Incertidumbre/Futuro",
      pt: "Incerteza/Futuro"
    }
  },
  { 
    id: "trauma", 
    label: {
      en: "Past Trauma",
      es: "Trauma Pasado",
      pt: "Trauma Passado"
    }
  },
  { 
    id: "environmental", 
    label: {
      en: "Environmental Stressors",
      es: "Estresores Ambientales",
      pt: "Estressores Ambientais"
    }
  },
  { 
    id: "other", 
    label: {
      en: "Other",
      es: "Otro",
      pt: "Outro"
    }
  },
];

// Define interventions by type with multilingual support
export const interventionTypes = [
  {
    id: "grounding",
    label: {
      en: "Grounding Techniques",
      es: "Técnicas de Conexión con el Presente",
      pt: "Técnicas de Aterramento"
    }
  },
  {
    id: "breathing",
    label: {
      en: "Breathing Exercises",
      es: "Ejercicios de Respiración",
      pt: "Exercícios de Respiração"
    }
  },
  {
    id: "cognitive",
    label: {
      en: "Cognitive Techniques",
      es: "Técnicas Cognitivas",
      pt: "Técnicas Cognitivas"
    }
  },
  {
    id: "mindfulness",
    label: {
      en: "Mindfulness Practices",
      es: "Prácticas de Atención Plena",
      pt: "Práticas de Atenção Plena"
    }
  },
  {
    id: "physical",
    label: {
      en: "Physical Activities",
      es: "Actividades Físicas",
      pt: "Atividades Físicas"
    }
  }
];

export const therapistApprovedInterventions = {
  grounding: [
    {
      id: "54321",
      name: {
        en: "5-4-3-2-1 Technique",
        es: "Técnica 5-4-3-2-1",
        pt: "Técnica 5-4-3-2-1"
      },
      description: {
        en: "Name 5 things you can see, 4 things you can touch, 3 things you can hear, 2 things you can smell, and 1 thing you can taste.",
        es: "Nombra 5 cosas que puedas ver, 4 cosas que puedas tocar, 3 cosas que puedas oír, 2 cosas que puedas oler y 1 cosa que puedas saborear.",
        pt: "Nomeie 5 coisas que você pode ver, 4 coisas que pode tocar, 3 coisas que pode ouvir, 2 coisas que pode cheirar e 1 coisa que pode provar."
      },
      forTriggers: ["general", "panic", "work", "social"],
      voicePrompt: {
        en: "Let's try a grounding exercise together. Look around and name five things you can see right now.",
        es: "Intentemos un ejercicio de conexión con el presente. Mira a tu alrededor y nombra cinco cosas que puedas ver ahora mismo.",
        pt: "Vamos tentar um exercício de aterramento juntos. Olhe ao redor e nomeie cinco coisas que você pode ver agora."
      }
    },
    {
      id: "body_scan",
      name: {
        en: "Body Scan",
        es: "Escaneo Corporal",
        pt: "Escaneamento Corporal"
      },
      description: {
        en: "Mentally scan your body from head to toe, noting any sensations without judgment.",
        es: "Escanea mentalmente tu cuerpo de la cabeza a los pies, notando cualquier sensación sin juzgarla.",
        pt: "Mentalmente, escaneie seu corpo da cabeça aos pés, notando qualquer sensação sem julgamento."
      },
      forTriggers: ["general", "health", "trauma"],
      voicePrompt: {
        en: "Let's do a body scan together. Start by focusing on the top of your head and notice any sensations there.",
        es: "Hagamos un escaneo corporal juntos. Comienza por concentrarte en la parte superior de tu cabeza y nota cualquier sensación allí.",
        pt: "Vamos fazer um escaneamento corporal juntos. Comece focando no topo da sua cabeça e perceba quaisquer sensações lá."
      }
    },
  ],
  breathing: [
    {
      id: "box_breathing",
      name: {
        en: "Box Breathing",
        es: "Respiración Cuadrada",
        pt: "Respiração Quadrada"
      },
      description: {
        en: "Inhale for 4 counts, hold for 4 counts, exhale for 4 counts, hold for 4 counts. Repeat.",
        es: "Inhala durante 4 tiempos, mantén durante 4 tiempos, exhala durante 4 tiempos, mantén durante 4 tiempos. Repite.",
        pt: "Inspire por 4 tempos, segure por 4 tempos, expire por 4 tempos, segure por 4 tempos. Repita."
      },
      forTriggers: ["general", "work", "uncertainty"],
      voicePrompt: {
        en: "Let's try box breathing together. I'll guide you through each step. First, let's inhale slowly for 4 counts.",
        es: "Intentemos la respiración cuadrada juntos. Te guiaré a través de cada paso. Primero, inhalemos lentamente durante 4 tiempos.",
        pt: "Vamos tentar a respiração quadrada juntos. Vou guiá-lo por cada etapa. Primeiro, vamos inspirar lentamente por 4 tempos."
      }
    },
    {
      id: "478_breathing",
      name: {
        en: "4-7-8 Breathing",
        es: "Respiración 4-7-8",
        pt: "Respiração 4-7-8"
      },
      description: {
        en: "Inhale for 4 counts, hold for 7 counts, exhale for 8 counts. Repeat.",
        es: "Inhala durante 4 tiempos, mantén durante 7 tiempos, exhala durante 8 tiempos. Repite.",
        pt: "Inspire por 4 tempos, segure por 7 tempos, expire por 8 tempos. Repita."
      },
      forTriggers: ["general", "health", "financial"],
      voicePrompt: {
        en: "Let's practice the 4-7-8 breathing technique. First, exhale completely through your mouth.",
        es: "Practiquemos la técnica de respiración 4-7-8. Primero, exhala completamente por la boca.",
        pt: "Vamos praticar a técnica de respiração 4-7-8. Primeiro, expire completamente pela boca."
      }
    },
  ],
  cognitive: [
    {
      id: "thought_challenge",
      name: {
        en: "Thought Challenging",
        es: "Desafío de Pensamientos",
        pt: "Desafio de Pensamentos"
      },
      description: {
        en: "Identify negative thoughts and challenge them with evidence.",
        es: "Identifica pensamientos negativos y desafíalos con evidencia.",
        pt: "Identifique pensamentos negativos e desafie-os com evidências."
      },
      forTriggers: ["general", "social", "work", "uncertainty"],
      voicePrompt: {
        en: "Let's work on challenging a negative thought. What's one thought that's causing you anxiety right now?",
        es: "Trabajemos en desafiar un pensamiento negativo. ¿Cuál es un pensamiento que te está causando ansiedad ahora mismo?",
        pt: "Vamos trabalhar em desafiar um pensamento negativo. Qual é um pensamento que está lhe causando ansiedade agora?"
      }
    },
    {
      id: "worry_time",
      name: {
        en: "Scheduled Worry Time",
        es: "Tiempo Programado para Preocuparse",
        pt: "Tempo Programado para Preocupações"
      },
      description: {
        en: "Set aside a specific time each day to address worries, postponing them until then.",
        es: "Reserva un tiempo específico cada día para abordar preocupaciones, posponiéndolas hasta entonces.",
        pt: "Reserve um horário específico todos os dias para lidar com preocupações, adiando-as até lá."
      },
      forTriggers: ["general", "financial", "health", "uncertainty"],
      voicePrompt: {
        en: "Let's set up a scheduled worry time. When would be a good 15-minute period in your day to focus on your worries?",
        es: "Vamos a establecer un tiempo programado para preocuparte. ¿Cuándo sería un buen período de 15 minutos en tu día para concentrarte en tus preocupaciones?",
        pt: "Vamos estabelecer um tempo programado para preocupações. Quando seria um bom período de 15 minutos no seu dia para focar em suas preocupações?"
      }
    },
  ],
  mindfulness: [
    {
      id: "present_moment",
      name: {
        en: "Present Moment Awareness",
        es: "Conciencia del Momento Presente",
        pt: "Consciência do Momento Presente"
      },
      description: {
        en: "Focus your attention fully on the present moment, observing thoughts and sensations without judgment.",
        es: "Centra tu atención completamente en el momento presente, observando pensamientos y sensaciones sin juzgar.",
        pt: "Concentre sua atenção totalmente no momento presente, observando pensamentos e sensações sem julgamento."
      },
      forTriggers: ["general", "uncertainty", "work", "social"],
      voicePrompt: {
        en: "Let's practice being fully in the present moment. Focus on what you can sense right now in this moment.",
        es: "Practiquemos estar completamente en el momento presente. Concéntrate en lo que puedes sentir ahora mismo en este momento.",
        pt: "Vamos praticar estar totalmente no momento presente. Concentre-se no que você pode sentir agora neste momento."
      }
    },
  ],
  physical: [
    {
      id: "progressive_relaxation",
      name: {
        en: "Progressive Muscle Relaxation",
        es: "Relajación Muscular Progresiva",
        pt: "Relaxamento Muscular Progressivo"
      },
      description: {
        en: "Tense and then release each muscle group in your body, from toes to head, to release physical tension.",
        es: "Tensa y luego relaja cada grupo muscular en tu cuerpo, desde los dedos de los pies hasta la cabeza, para liberar la tensión física.",
        pt: "Tensione e depois solte cada grupo muscular do seu corpo, dos dedos dos pés à cabeça, para liberar a tensão física."
      },
      forTriggers: ["general", "health", "trauma", "sleep"],
      voicePrompt: {
        en: "Let's try progressive muscle relaxation. Start by tensing the muscles in your feet for 5 seconds, then release and notice the difference.",
        es: "Probemos la relajación muscular progresiva. Comienza tensando los músculos de tus pies durante 5 segundos, luego suelta y nota la diferencia.",
        pt: "Vamos tentar o relaxamento muscular progressivo. Comece tensionando os músculos dos seus pés por 5 segundos, depois solte e perceba a diferença."
      }
    },
  ],
};

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type AnxietySession = typeof anxietySessions.$inferSelect;
export type InsertAnxietySession = z.infer<typeof insertAnxietySessionSchema>;

export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type InsertConversationMessage = z.infer<typeof insertConversationMessageSchema>;

export type TriggerCategory = typeof triggerCategories[number];
export type InterventionType = typeof interventionTypes[number];

// Language types
export type SupportedLanguage = "en" | "es" | "pt";
export type MultilingualText = {
  en: string;
  es: string;
  pt: string;
};

// Voice preference configuration types
export type VoicePreference = {
  language: SupportedLanguage;
  voiceId: string; // Voice ID to use in TTS
  rate: number; // Speech rate (0.5 to 2.0)
  pitch: number; // Speech pitch (0.5 to 2.0)
};

// Available voices by language for "attractive female" voices
export const availableVoices: Record<SupportedLanguage, VoicePreference[]> = {
  en: [
    // Vanessa - Google UK English Female voice
    { language: "en", voiceId: "Google UK English Female", rate: 1.0, pitch: 1.0 }, // Primary voice - warm, confident, elegant UK English
    { language: "en", voiceId: "en-GB-Neural-F", rate: 1.0, pitch: 1.0 }, // Alternative UK neural voice
    { language: "en", voiceId: "en-GB-Studio-F", rate: 1.0, pitch: 1.0 }, // UK Studio voice fallback
  ],
  es: [
    // Mónica - Spain Spanish voice
    { language: "es", voiceId: "Microsoft Mónica", rate: 0.95, pitch: 1.10 }, // Primary target voice
    { language: "es", voiceId: "Microsoft Helena", rate: 0.88, pitch: 1.10 }, // Fallback Microsoft voice
    { language: "es", voiceId: "es-MX-Neural-A", rate: 0.88, pitch: 1.10 }, // Mexican Spanish fallback
    { language: "es", voiceId: "es-MX-Standard-A", rate: 0.88, pitch: 1.10 }, // Another Mexican voice
    { language: "es", voiceId: "Lupe", rate: 0.85, pitch: 1.08 }, // Polly fallback
  ],
  pt: [
    // Miss Brazil - Brazilian beauty pageant winner characteristics
    { language: "pt", voiceId: "pt-BR-Neural-A", rate: 0.90, pitch: 1.15 }, // Brazilian Portuguese feminine voice
    { language: "pt", voiceId: "pt-BR-Studio-A", rate: 0.92, pitch: 1.15 }, // Studio-quality alternative
    { language: "pt", voiceId: "Camila", rate: 0.90, pitch: 1.12 }, // Polly fallback 
  ]
};