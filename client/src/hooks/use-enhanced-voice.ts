import { useCallback, useEffect, useRef, useState } from "react";
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Capacitor } from '@capacitor/core';
import { SupportedLanguage } from "@shared/schema";

// For web browser fallback
interface WebSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: (event: any) => void;
}

// Language code mappings - Updated to use en-GB for UK English
const LANGUAGE_CODES: Record<SupportedLanguage, string> = {
  en: 'en-GB',  // Vanessa - UK English Female
  es: 'es-ES',  // Mónica - Spanish from Spain
  pt: 'pt-BR'   // Luciana - Brazilian Portuguese
};

// Target the exact voices we want by name - Updated for Google UK English Female
const TARGET_VOICE_NAMES: Record<SupportedLanguage, string[]> = {
  en: ["Google UK English Female", "Vanessa", "en-GB-Neural", "en-GB-Standard-A", "en-GB"],
  es: ["Mónica", "Monica", "Microsoft Mónica", "Microsoft Monica", "es-ES-Neural"],
  pt: ["Luciana", "Microsoft Luciana", "pt-BR-Neural"]
};

// Voice name exclusion - voices to explicitly AVOID
const AVOID_VOICES = ['Sabina', 'Helena', 'es-MX', 'Karen'];

// Voice settings for each language
const VOICE_SETTINGS: Record<SupportedLanguage, { pitch: number, rate: number }> = {
  en: { pitch: 1.0, rate: 0.92 }, // UK English - refined British tone
  es: { pitch: 1.1, rate: 0.95 }, // Mónica (Spanish)
  pt: { pitch: 1.0, rate: 0.97 }  // Luciana (Portuguese)
};

// INTELLIGENT PAUSE DETECTION SETTINGS FOR THERAPEUTIC CONVERSATIONS
const THERAPEUTIC_PAUSE_CONFIG = {
  // SHORT_PAUSE: Natural breathing pause during speech (ignore these completely)
  SHORT_PAUSE_THRESHOLD: 1000, // 1 second - don't interrupt for quick pauses

  // THINKING_PAUSE: User is thinking/formulating thoughts (allow this generously)
  THINKING_PAUSE_THRESHOLD: 3500, // 3.5 seconds - allow thinking time

  // REFLECTION_PAUSE: User may be processing emotions (therapeutic context)
  REFLECTION_PAUSE_THRESHOLD: 5000, // 5 seconds - allow emotional processing

  // COMPLETION_PAUSE: User is likely done speaking
  COMPLETION_PAUSE_THRESHOLD: 6500, // 6.5 seconds - probably done

  // FINAL_COMPLETION: Definitely done speaking
  FINAL_COMPLETION_THRESHOLD: 8000, // 8 seconds - definitely done

  // Minimum transcript length before considering auto-send
  MIN_TRANSCRIPT_LENGTH: 3,

  // How often to check for pauses
  PAUSE_CHECK_INTERVAL: 200 // Check every 200ms (less aggressive)
};

// NEW: Speech chunking configuration for long text
const SPEECH_CHUNK_CONFIG = {
  MAX_CHUNK_LENGTH: 200, // Maximum characters per chunk
  SENTENCE_BOUNDARY_REGEX: /[.!?]+\s+/g, // Split on sentence boundaries
  PAUSE_BETWEEN_CHUNKS: 150, // Milliseconds between chunks
  MAX_RETRY_ATTEMPTS: 3, // How many times to retry failed chunks
  RESUME_CHECK_INTERVAL: 100, // How often to check if speech needs resuming
};

interface SpeakOpts { 
  text: string; 
  lang?: SupportedLanguage;
  pitch?: number;
  rate?: number;
  // NEW: Avatar sync callback
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onAudioData?: (audioData: any) => void; // For lip sync
  // NEW: Progress callbacks for long text
  onProgress?: (current: number, total: number) => void;
  onChunkStart?: (chunk: string, index: number) => void;
  onChunkEnd?: (chunk: string, index: number) => void;
}

// NEW: Speech chunk interface
interface SpeechChunk {
  text: string;
  index: number;
  retryCount: number;
}

// NEW: Speech queue state
interface SpeechQueueState {
  chunks: SpeechChunk[];
  currentIndex: number;
  isPlaying: boolean;
  totalChunks: number;
}

// Helper function to check if a voice should be avoided
const shouldAvoid = (voice: SpeechSynthesisVoice): boolean => {
  return AVOID_VOICES.some(avoid => voice.name.includes(avoid) || voice.lang.includes(avoid));
};

/**
 * Enhanced voice selection with strong filtering to ensure the right voices are used
 */
function pickSpecificVoice(voices: SpeechSynthesisVoice[], lang: SupportedLanguage): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  console.log("DEBUG: All available voices:", voices.map(v => `${v.name} (${v.lang})`));
  console.log(`DEBUG: Selecting voice for ${lang} with language code ${LANGUAGE_CODES[lang]}`);
  console.log(`DEBUG: Target voices: ${TARGET_VOICE_NAMES[lang].join(', ')}`);
  console.log(`DEBUG: Avoiding voices: ${AVOID_VOICES.join(', ')}`);

  // 1. First try exact target match with exact language code
  const exactTarget = voices.find(v => 
    TARGET_VOICE_NAMES[lang].some(name => v.name.includes(name)) && 
    v.lang === LANGUAGE_CODES[lang] &&
    !shouldAvoid(v)
  );

  if (exactTarget) {
    console.log(`DEBUG: Found exact target voice: ${exactTarget.name} (${exactTarget.lang})`);
    return exactTarget;
  }

  // 2. Try target voice with any language variant
  const anyVariantTarget = voices.find(v => 
    TARGET_VOICE_NAMES[lang].some(name => v.name.includes(name)) &&
    v.lang.startsWith(lang) &&
    !shouldAvoid(v)
  );

  if (anyVariantTarget) {
    console.log(`DEBUG: Found target voice with variant: ${anyVariantTarget.name} (${anyVariantTarget.lang})`);
    return anyVariantTarget;
  }

  // Language-specific search strategies with avoid filtering
  if (lang === 'es') {
    // For Spanish: Prioritize Spain Spanish (es-ES), avoid Mexican Spanish (es-MX)

    // Try any Spain Spanish female voice
    const spainFemale = voices.find(v => 
      v.lang === 'es-ES' && 
      !shouldAvoid(v) &&
      (v.name.toLowerCase().includes('female') || 
       v.name.toLowerCase().includes('woman') || 
       v.name.toLowerCase().includes('f'))
    );

    if (spainFemale) {
      console.log(`DEBUG: Using Spain Spanish female voice: ${spainFemale.name}`);
      return spainFemale;
    }

    // Any es-ES voice that is not in the avoid list
    const anySpainVoice = voices.find(v => 
      v.lang === 'es-ES' && !shouldAvoid(v)
    );

    if (anySpainVoice) {
      console.log(`DEBUG: Using any Spain Spanish voice: ${anySpainVoice.name}`);
      return anySpainVoice;
    }

    // Last resort: Any Spanish voice that's not in the avoid list
    const anySafeSpanish = voices.find(v => 
      v.lang.startsWith('es') && !shouldAvoid(v)
    );

    if (anySafeSpanish) {
      console.log(`DEBUG: Using fallback Spanish voice: ${anySafeSpanish.name}`);
      return anySafeSpanish;
    }
  } 
  else if (lang === 'pt') {
    // For Portuguese: Prioritize Brazilian Portuguese (pt-BR)
    const brFemale = voices.find(v => 
      v.lang === 'pt-BR' && 
      !shouldAvoid(v) &&
      (v.name.toLowerCase().includes('female') || 
       v.name.toLowerCase().includes('woman'))
    );

    if (brFemale) {
      console.log(`DEBUG: Using Brazilian Portuguese female voice: ${brFemale.name}`);
      return brFemale;
    }

    // Any Brazilian Portuguese voice
    const anyBrVoice = voices.find(v => 
      v.lang === 'pt-BR' && !shouldAvoid(v)
    );

    if (anyBrVoice) {
      console.log(`DEBUG: Using any Brazilian Portuguese voice: ${anyBrVoice.name}`);
      return anyBrVoice;
    }
  }
  else if (lang === 'en') {
    // For English: Prioritize Google UK English Female
    // First priority: Find Google UK English Female specifically
    const googleUKFemale = voices.find(v => 
      v.name === 'Google UK English Female' && v.lang === 'en-GB'
    );

    if (googleUKFemale) {
      console.log(`DEBUG: Found Google UK English Female specifically: ${googleUKFemale.name} (${googleUKFemale.lang})`);
      return googleUKFemale;
    }

    // Second priority: Any voice with "Google" and "UK" in name
    const anyGoogleUK = voices.find(v => 
      v.name.toLowerCase().includes('google') && 
      v.name.toLowerCase().includes('uk') &&
      v.lang === 'en-GB'
    );

    if (anyGoogleUK) {
      console.log(`DEBUG: Using any Google UK voice: ${anyGoogleUK.name} (${anyGoogleUK.lang})`);
      return anyGoogleUK;
    }

    // Third priority: Any UK English female voice
    const anyUKFemale = voices.find(v => 
      v.lang === 'en-GB' && 
      (v.name.toLowerCase().includes('female') || 
       v.name.toLowerCase().includes('woman')) &&
      !shouldAvoid(v)
    );

    if (anyUKFemale) {
      console.log(`DEBUG: Using UK English female voice: ${anyUKFemale.name} (${anyUKFemale.lang})`);
      return anyUKFemale;
    }

    // Fourth priority: Any UK voice
    const anyUKVoice = voices.find(v => 
      v.lang === 'en-GB' && !shouldAvoid(v)
    );

    if (anyUKVoice) {
      console.log(`DEBUG: Using any UK English voice: ${anyUKVoice.name} (${anyUKVoice.lang})`);
      return anyUKVoice;
    }
  }

  // Last resort: Generic language match that's not in the avoid list
  const langPrefix = lang.split('-')[0]; // 'en', 'es', 'pt'
  const safeLangMatch = voices.find(v => 
    v.lang.startsWith(langPrefix) && !shouldAvoid(v)
  );

  if (safeLangMatch) {
    console.log(`DEBUG: Using safe language match: ${safeLangMatch.name}`);
    return safeLangMatch;
  }

  // Absolute last resort: any non-avoid voice
  const anyVoice = voices.find(v => !shouldAvoid(v)) || voices[0];
  console.log(`DEBUG: Using any available voice: ${anyVoice.name}`);
  return anyVoice;
}

/**
 * NEW: Intelligent text chunking for long speech
 */
function createSpeechChunks(text: string): SpeechChunk[] {
  if (!text || text.trim().length === 0) return [];

  // First, try to split by sentences
  const sentences = text.split(SPEECH_CHUNK_CONFIG.SENTENCE_BOUNDARY_REGEX).filter(s => s.trim().length > 0);

  const chunks: SpeechChunk[] = [];
  let currentChunk = '';
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();

    // If adding this sentence would exceed max chunk length, finalize current chunk
    if (currentChunk.length > 0 && (currentChunk + ' ' + trimmedSentence).length > SPEECH_CHUNK_CONFIG.MAX_CHUNK_LENGTH) {
      chunks.push({
        text: currentChunk.trim(),
        index: chunkIndex++,
        retryCount: 0
      });
      currentChunk = trimmedSentence;
    } else {
      // Add sentence to current chunk
      currentChunk = currentChunk.length > 0 ? currentChunk + ' ' + trimmedSentence : trimmedSentence;
    }

    // If current chunk itself is too long, force split it
    if (currentChunk.length > SPEECH_CHUNK_CONFIG.MAX_CHUNK_LENGTH) {
      // Split by words as fallback
      const words = currentChunk.split(' ');
      let wordChunk = '';

      for (const word of words) {
        if ((wordChunk + ' ' + word).length > SPEECH_CHUNK_CONFIG.MAX_CHUNK_LENGTH && wordChunk.length > 0) {
          chunks.push({
            text: wordChunk.trim(),
            index: chunkIndex++,
            retryCount: 0
          });
          wordChunk = word;
        } else {
          wordChunk = wordChunk.length > 0 ? wordChunk + ' ' + word : word;
        }
      }

      currentChunk = wordChunk;
    }
  }

  // Add final chunk if exists
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      index: chunkIndex,
      retryCount: 0
    });
  }

  // If no sentence boundaries found, split by character limit
  if (chunks.length === 0) {
    for (let i = 0; i < text.length; i += SPEECH_CHUNK_CONFIG.MAX_CHUNK_LENGTH) {
      chunks.push({
        text: text.substring(i, i + SPEECH_CHUNK_CONFIG.MAX_CHUNK_LENGTH).trim(),
        index: chunkIndex++,
        retryCount: 0
      });
    }
  }

  console.log(`📝 Created ${chunks.length} speech chunks from ${text.length} characters`);
  return chunks;
}

/**
 * Enhanced voice hook with intelligent pause detection for therapeutic conversations
 * NOW WITH LONG TEXT SUPPORT AND AVATAR INTEGRATION
 */
export function useEnhancedVoice(initialLang: SupportedLanguage = 'en') {
  // State
  const [language, setLanguage] = useState<SupportedLanguage>(initialLang);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ready, setReady] = useState(false);

  // NEW: Speech queue state
  const [speechProgress, setSpeechProgress] = useState<{ current: number; total: number } | null>(null);

  // References
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const isNative = useRef(Capacitor.isNativePlatform());
  const recogActive = useRef(false);
  const autoSendCallbackRef = useRef<((text: string) => void) | null>(null);

  // NEW: Speech queue references
  const speechQueueRef = useRef<SpeechQueueState>({
    chunks: [],
    currentIndex: 0,
    isPlaying: false,
    totalChunks: 0
  });
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechCallbacksRef = useRef<SpeakOpts>({} as SpeakOpts);
  const resumeCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // NEW: Avatar integration callbacks
  const avatarCallbacksRef = useRef<{
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
    onAudioData?: (audioData: any) => void;
  }>({});

  // ENHANCED THERAPEUTIC PAUSE DETECTION REFERENCES
  const currentTranscript = useRef<string>('');
  const lastSpeechTimestamp = useRef<number>(0);
  const pauseDetectionTimer = useRef<NodeJS.Timeout | null>(null);
  const isProcessingCompletion = useRef<boolean>(false);

  // Duplicate prevention
  const lastSentTranscriptRef = useRef<string>('');
  const lastSentTimestamp = useRef<number>(0);

  // Force clear voice cache at startup
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      // Force a voice reload
      window.speechSynthesis.getVoices();
    }
  }, []);

  // NEW: Avatar integration helper
  const setAvatarCallbacks = useCallback((callbacks: {
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
    onAudioData?: (audioData: any) => void;
  }) => {
    avatarCallbacksRef.current = callbacks;
  }, []);

  // Initialize TTS with enhanced logging
  useEffect(() => {
    const load = () => {
      if (!window.speechSynthesis) return;
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return; // will fire again

      console.log("=== ENHANCED VOICE SELECTION DEBUG ===");
      console.log("All available voices:");
      voices.forEach(voice => {
        console.log(`${voice.name} (${voice.lang}), Default: ${voice.default}, Local: ${voice.localService}`);
      });

      // Set the voice with enhanced selection
      voiceRef.current = pickSpecificVoice(voices, language);
      if (voiceRef.current) {
        console.log(`Voice loaded: ${voiceRef.current.name} (${voiceRef.current.lang})`);
        setReady(true);
      } else {
        console.error("No suitable voice found!");
      }
    };

    load();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = load;
      return () => { window.speechSynthesis.onvoiceschanged = null; };
    }
  }, [language]);

  // NEW: Speech synthesis resume checker (handles browser pause issues)
  const startResumeChecker = useCallback(() => {
    if (resumeCheckIntervalRef.current) return;

    resumeCheckIntervalRef.current = setInterval(() => {
      if (window.speechSynthesis && speechQueueRef.current.isPlaying) {
        if (window.speechSynthesis.paused) {
          console.log("🔄 Speech paused detected, resuming...");
          window.speechSynthesis.resume();
        }
      }
    }, SPEECH_CHUNK_CONFIG.RESUME_CHECK_INTERVAL);
  }, []);

  const stopResumeChecker = useCallback(() => {
    if (resumeCheckIntervalRef.current) {
      clearInterval(resumeCheckIntervalRef.current);
      resumeCheckIntervalRef.current = null;
    }
  }, []);

  // NEW: Play next chunk in queue
  const playNextChunk = useCallback(() => {
    const queue = speechQueueRef.current;

    if (!queue.isPlaying || queue.currentIndex >= queue.chunks.length) {
      // Queue finished
      console.log("🎉 Speech queue completed");

      queue.isPlaying = false;
      setIsSpeaking(false);
      setSpeechProgress(null);
      stopResumeChecker();

      // Trigger completion callbacks
      const callbacks = speechCallbacksRef.current;
      if (callbacks.onSpeechEnd) callbacks.onSpeechEnd();
      if (avatarCallbacksRef.current.onSpeechEnd) {
        avatarCallbacksRef.current.onSpeechEnd();
      }

      return;
    }

    const chunk = queue.chunks[queue.currentIndex];
    const callbacks = speechCallbacksRef.current;

    console.log(`🗣️ Speaking chunk ${chunk.index + 1}/${queue.totalChunks}: "${chunk.text.substring(0, 50)}..."`);

    // Update progress
    setSpeechProgress({ current: chunk.index + 1, total: queue.totalChunks });

    // Trigger chunk start callback
    if (callbacks.onChunkStart) {
      callbacks.onChunkStart(chunk.text, chunk.index);
    }
    if (callbacks.onProgress) {
      callbacks.onProgress(chunk.index + 1, queue.totalChunks);
    }

    try {
      const utter = new SpeechSynthesisUtterance(chunk.text);
      currentUtteranceRef.current = utter;

      // Apply voice and settings
      if (voiceRef.current) {
        utter.voice = voiceRef.current;
      }
      utter.lang = LANGUAGE_CODES[callbacks.lang || language];

      // Apply voice settings
      const settings = VOICE_SETTINGS[callbacks.lang || language];
      utter.pitch = callbacks.pitch ?? settings.pitch;
      utter.rate = callbacks.rate ?? settings.rate;

      // Handle chunk completion
      utter.onend = () => {
        console.log(`✅ Chunk ${chunk.index + 1} completed`);

        // Trigger chunk end callback
        if (callbacks.onChunkEnd) {
          callbacks.onChunkEnd(chunk.text, chunk.index);
        }

        // Move to next chunk
        speechQueueRef.current.currentIndex++;

        // Schedule next chunk with pause
        setTimeout(() => {
          playNextChunk();
        }, SPEECH_CHUNK_CONFIG.PAUSE_BETWEEN_CHUNKS);
      };

      // Handle chunk errors with retry logic
      utter.onerror = (event) => {
        console.error(`❌ Chunk ${chunk.index + 1} error:`, event);

        chunk.retryCount++;

        if (chunk.retryCount < SPEECH_CHUNK_CONFIG.MAX_RETRY_ATTEMPTS) {
          console.log(`🔄 Retrying chunk ${chunk.index + 1} (attempt ${chunk.retryCount + 1})`);

          // Retry after a brief pause
          setTimeout(() => {
            playNextChunk();
          }, 500);
        } else {
          console.error(`💥 Chunk ${chunk.index + 1} failed after ${SPEECH_CHUNK_CONFIG.MAX_RETRY_ATTEMPTS} attempts, skipping`);

          // Skip to next chunk
          speechQueueRef.current.currentIndex++;
          setTimeout(() => {
            playNextChunk();
          }, SPEECH_CHUNK_CONFIG.PAUSE_BETWEEN_CHUNKS);
        }
      };

      // Speak the chunk
      window.speechSynthesis.speak(utter);

    } catch (error) {
      console.error(`💥 Critical error in chunk ${chunk.index + 1}:`, error);

      // Skip to next chunk on critical error
      speechQueueRef.current.currentIndex++;
      setTimeout(() => {
        playNextChunk();
      }, SPEECH_CHUNK_CONFIG.PAUSE_BETWEEN_CHUNKS);
    }
  }, [language, stopResumeChecker]);

  // NEW: Enhanced speak function with chunking support
  const speak = useCallback(({ text, lang = language, pitch, rate, onSpeechStart, onSpeechEnd, onAudioData, onProgress, onChunkStart, onChunkEnd }: SpeakOpts): void => {
    if (!text || !window.speechSynthesis) return;

    console.log(`🎙️ Starting speech: ${text.length} characters`);

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    stopResumeChecker();

    // Store callbacks
    speechCallbacksRef.current = { 
      text, lang, pitch, rate, onSpeechStart, onSpeechEnd, onAudioData, onProgress, onChunkStart, onChunkEnd 
    };

    try {
      // Create chunks for long text
      const chunks = createSpeechChunks(text);

      // Initialize speech queue
      speechQueueRef.current = {
        chunks,
        currentIndex: 0,
        isPlaying: true,
        totalChunks: chunks.length
      };

      // Set speaking state
      setIsSpeaking(true);
      setSpeechProgress({ current: 1, total: chunks.length });

      // Start resume checker for browser compatibility
      startResumeChecker();

      // Trigger speech start callbacks
      if (onSpeechStart) onSpeechStart();
      if (avatarCallbacksRef.current.onSpeechStart) {
        avatarCallbacksRef.current.onSpeechStart();
      }

      // Start playing chunks
      playNextChunk();

    } catch (err) {
      console.error("Speech synthesis error:", err);
      setIsSpeaking(false);
      setSpeechProgress(null);
      stopResumeChecker();
    }
  }, [language, playNextChunk, startResumeChecker, stopResumeChecker]);

  // Enhanced native speak function with chunking support
  const nativeSpeak = useCallback(async ({ text, lang = language, pitch, rate, onSpeechStart, onSpeechEnd }: SpeakOpts): Promise<void> => {
    if (!text) return;

    try {
      // Get settings for this language
      const settings = VOICE_SETTINGS[lang];

      // Use specific voice options for each language
      let voiceOptions = {};
      if (lang === 'es') {
        voiceOptions = { voice: 'Mónica' };
      } else if (lang === 'pt') {
        voiceOptions = { voice: 'Luciana' };
      } else if (lang === 'en') {
        voiceOptions = { voice: 'Vanessa' };
      }

      console.log(`🎙️ Native speaking: ${text.length} characters with language ${lang}`);

      setIsSpeaking(true);

      // Trigger avatar speech start
      if (onSpeechStart) onSpeechStart();
      if (avatarCallbacksRef.current.onSpeechStart) {
        avatarCallbacksRef.current.onSpeechStart();
      }

      // For very long text, we might need to chunk even for native
      if (text.length > 500) {
        const chunks = createSpeechChunks(text);
        setSpeechProgress({ current: 1, total: chunks.length });

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          console.log(`🗣️ Native chunk ${i + 1}/${chunks.length}`);

          setSpeechProgress({ current: i + 1, total: chunks.length });

          await TextToSpeech.speak({
            text: chunk.text,
            lang: LANGUAGE_CODES[lang],
            rate: rate ?? settings.rate,
            pitch: pitch ?? settings.pitch,
            volume: 1.0,
            ...voiceOptions
          });

          // Small pause between chunks
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, SPEECH_CHUNK_CONFIG.PAUSE_BETWEEN_CHUNKS));
          }
        }
      } else {
        // Short text, speak normally
        await TextToSpeech.speak({
          text,
          lang: LANGUAGE_CODES[lang],
          rate: rate ?? settings.rate,
          pitch: pitch ?? settings.pitch,
          volume: 1.0,
          ...voiceOptions
        });
      }

      setIsSpeaking(false);
      setSpeechProgress(null);

      // Trigger avatar speech end
      if (onSpeechEnd) onSpeechEnd();
      if (avatarCallbacksRef.current.onSpeechEnd) {
        avatarCallbacksRef.current.onSpeechEnd();
      }
    } catch (err) {
      console.error("Native speech error:", err);
      setIsSpeaking(false);
      setSpeechProgress(null);

      // Also trigger avatar speech end on error
      if (onSpeechEnd) onSpeechEnd();
      if (avatarCallbacksRef.current.onSpeechEnd) {
        avatarCallbacksRef.current.onSpeechEnd();
      }
    }
  }, [language]);

  // Stop speaking
  const stopSpeaking = useCallback((): void => {
    console.log("🛑 Stopping speech");

    if (isNative.current) {
      TextToSpeech.stop();
    } else {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      // Stop speech queue
      speechQueueRef.current.isPlaying = false;
      stopResumeChecker();
    }

    setIsSpeaking(false);
    setSpeechProgress(null);
    currentUtteranceRef.current = null;

    // Trigger avatar speech end when manually stopped
    if (avatarCallbacksRef.current.onSpeechEnd) {
      avatarCallbacksRef.current.onSpeechEnd();
    }
  }, [stopResumeChecker]);

  // INTELLIGENT THERAPEUTIC PAUSE DETECTION SYSTEM
  const startTherapeuticPauseDetection = useCallback(() => {
    // Clear any existing pause detection
    if (pauseDetectionTimer.current) {
      clearInterval(pauseDetectionTimer.current);
      pauseDetectionTimer.current = null;
    }

    console.log("🧠 Starting therapeutic pause detection - allowing time for patient reflection and thought formulation");

    pauseDetectionTimer.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastSpeech = now - lastSpeechTimestamp.current;
      const transcript = currentTranscript.current.trim();

      // Don't process if we're already handling completion or insufficient content
      if (isProcessingCompletion.current || transcript.length < THERAPEUTIC_PAUSE_CONFIG.MIN_TRANSCRIPT_LENGTH) {
        return;
      }

      // STAGE 1: Ignore very short pauses (natural speech rhythm)
      if (timeSinceLastSpeech < THERAPEUTIC_PAUSE_CONFIG.SHORT_PAUSE_THRESHOLD) {
        return; // Still actively speaking or just natural pause
      }

      // STAGE 2: Allow thinking/formulation time (therapeutic patience)
      if (timeSinceLastSpeech < THERAPEUTIC_PAUSE_CONFIG.THINKING_PAUSE_THRESHOLD) {
        console.log(`💭 Thinking pause (${(timeSinceLastSpeech/1000).toFixed(1)}s) - allowing patient to formulate thoughts`);
        return; // Patient is thinking, don't interrupt
      }

      // STAGE 3: Allow emotional processing time (important for therapy)
      if (timeSinceLastSpeech < THERAPEUTIC_PAUSE_CONFIG.REFLECTION_PAUSE_THRESHOLD) {
        console.log(`🤗 Reflection pause (${(timeSinceLastSpeech/1000).toFixed(1)}s) - allowing emotional processing time`);

        // Check for natural completion indicators but don't rush
        const hasStrongCompletion = transcript.match(/[.!?]\s*$/) && 
                                   (transcript.toLowerCase().includes('done') || 
                                    transcript.toLowerCase().includes('finished') ||
                                    transcript.toLowerCase().includes("that's it") ||
                                    transcript.toLowerCase().includes("that's all"));

        if (hasStrongCompletion) {
          console.log("✅ Strong completion signal detected during reflection pause");
          handleTherapeuticCompletion(transcript);
        }
        return;
      }

      // STAGE 4: Moderate completion pause - likely finished but be gentle
      if (timeSinceLastSpeech < THERAPEUTIC_PAUSE_CONFIG.COMPLETION_PAUSE_THRESHOLD) {
        console.log(`⏰ Completion pause (${(timeSinceLastSpeech/1000).toFixed(1)}s) - patient likely finished speaking`);
        handleTherapeuticCompletion(transcript);
        return;
      }

      // STAGE 5: Extended pause - definitely completed
      if (timeSinceLastSpeech >= THERAPEUTIC_PAUSE_CONFIG.FINAL_COMPLETION_THRESHOLD) {
        console.log(`✅ Extended pause (${(timeSinceLastSpeech/1000).toFixed(1)}s) - patient definitely finished speaking`);
        handleTherapeuticCompletion(transcript);
        return;
      }
    }, THERAPEUTIC_PAUSE_CONFIG.PAUSE_CHECK_INTERVAL);
  }, []);

  const stopTherapeuticPauseDetection = useCallback(() => {
    if (pauseDetectionTimer.current) {
      clearInterval(pauseDetectionTimer.current);
      pauseDetectionTimer.current = null;
    }
    isProcessingCompletion.current = false;
  }, []);

  // THERAPEUTIC COMPLETION HANDLER with gentle duplicate prevention
  const handleTherapeuticCompletion = useCallback((transcript: string) => {
    const now = Date.now();
    const trimmedTranscript = transcript.trim();

    // Prevent processing the same completion multiple times
    if (isProcessingCompletion.current) {
      return;
    }

    isProcessingCompletion.current = true;

    // Therapeutic-friendly duplicate prevention (more generous timing)
    if (autoSendCallbackRef.current && trimmedTranscript.length >= THERAPEUTIC_PAUSE_CONFIG.MIN_TRANSCRIPT_LENGTH) {
      if (
        trimmedTranscript !== lastSentTranscriptRef.current || 
        (now - lastSentTimestamp.current > 5000) // Allow same content if 5+ seconds apart (patient may repeat important points)
      ) {
        console.log('🚀 Therapeutic completion detected - processing patient response:', trimmedTranscript.substring(0, 50) + '...');
        lastSentTranscriptRef.current = trimmedTranscript;
        lastSentTimestamp.current = now;

        // Stop listening and send with therapeutic context
        stopListening();
        autoSendCallbackRef.current(trimmedTranscript);
      } else {
        console.log('🛡️ Preventing duplicate send - same content too recent');
        isProcessingCompletion.current = false;
      }
    } else {
      isProcessingCompletion.current = false;
    }
  }, []);

  // Update speech activity tracking for therapeutic context
  const updateTherapeuticSpeechActivity = useCallback((transcript: string) => {
    const previousTranscript = currentTranscript.current;
    currentTranscript.current = transcript;

    // Only update timestamp if transcript meaningfully changed (new speech content)
    if (transcript !== previousTranscript && transcript.trim().length > previousTranscript.trim().length) {
      lastSpeechTimestamp.current = Date.now();

      // Reset processing flag when new speech is detected
      isProcessingCompletion.current = false;

      console.log(`🎙️ Patient speech activity: "${transcript.slice(-30)}" (${transcript.length} chars)`);
    }
  }, []);

  // Stop listening function
  const stopListening = useCallback(async (): Promise<void> => {
    if (!recogActive.current) return;

    try {
      // Stop therapeutic pause detection
      stopTherapeuticPauseDetection();

      if (isNative.current) {
        // Native platform
        await SpeechRecognition.stop();
        SpeechRecognition.removeAllListeners();
      } else {
        // Web browser
        const recognitionInstance = (window as any)._recognitionInstance;
        if (recognitionInstance) {
          recognitionInstance.stop();
          delete (window as any)._recognitionInstance;
        }
      }
    } catch (err) {
      console.error("Error stopping speech recognition:", err);
    } finally {
      recogActive.current = false;
      setIsListening(false);

      // Reset therapeutic state
      currentTranscript.current = '';
      lastSpeechTimestamp.current = 0;
      isProcessingCompletion.current = false;
    }
  }, [stopTherapeuticPauseDetection]);

  // Enhanced speech recognition with therapeutic pause detection
  const listen = useCallback(async (onResult: (text: string) => void): Promise<boolean> => {
    if (recogActive.current) return false;

    // Store callback for auto-send when speech completes
    autoSendCallbackRef.current = onResult;

    console.log("🧠 Starting therapeutic speech recognition - patient-friendly pause detection enabled...");

    // Reset therapeutic state
    currentTranscript.current = '';
    lastSpeechTimestamp.current = Date.now();
    isProcessingCompletion.current = false;

    // Check if we're on a native platform
    if (isNative.current) {
      try {
        // Try using Capacitor plugin for native platforms
        const { available } = await SpeechRecognition.available();
        if (!available) {
          console.error("Native speech recognition not available");
          return false;
        }

        // Request permissions
        await SpeechRecognition.requestPermissions();

        // Set up listener for partial results with therapeutic pause detection
        SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
          if (data.matches && data.matches.length > 0) {
            const text = data.matches[0];
            updateTherapeuticSpeechActivity(text);
          }
        });

        // Start listening
        recogActive.current = true;
        setIsListening(true);

        // Start therapeutic pause detection
        startTherapeuticPauseDetection();

        await SpeechRecognition.start({
          language: LANGUAGE_CODES[language],
          maxResults: 1,
          prompt: 'Speak now',
          partialResults: true, // Enable partial results for better UX
          popup: false,
        });

        return true;
      } catch (err) {
        console.error("Native speech recognition error:", err);
        recogActive.current = false;
        setIsListening(false);
        stopTherapeuticPauseDetection();
        return false;
      }
    } else {
      // Web browser fallback with therapeutic pause detection
      try {
        // Check for browser support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          console.error("Web Speech API not supported in this browser");
          return false;
        }

        // Create recognition instance
        const SpeechRecognitionClass = (window as any).SpeechRecognition || 
          (window as any).webkitSpeechRecognition;

        const recognition = new SpeechRecognitionClass() as WebSpeechRecognition;

        // Set up recognition for therapeutic conversations
        recognition.lang = LANGUAGE_CODES[language];
        recognition.continuous = true; // Keep listening continuously for natural conversation flow
        recognition.interimResults = true;

        // Handle results with therapeutic pause detection
        recognition.onresult = (event: any) => {
          const results = Array.from(event.results);
          const latestTranscript = results
            .map((result: any) => result[0].transcript)
            .join('');

          // Update therapeutic speech activity tracking
          updateTherapeuticSpeechActivity(latestTranscript);

          // Handle final results gently (don't rush on natural pauses)
          if (event.results[event.results.length - 1].isFinal) {
            console.log('🎯 Natural speech boundary detected - letting therapeutic pause detection handle timing');
            // Don't auto-send immediately on final results in therapeutic context
            // Let the intelligent pause detection system handle it properly
          }
        };

        // Handle errors
        recognition.onerror = (event) => {
          console.error("Web Speech API error:", event);
          setIsListening(false);
          recogActive.current = false;
          stopTherapeuticPauseDetection();

          // If there was meaningful transcript, still try to send it with therapeutic consideration
          if (currentTranscript.current && currentTranscript.current.trim().length >= THERAPEUTIC_PAUSE_CONFIG.MIN_TRANSCRIPT_LENGTH) {
            handleTherapeuticCompletion(currentTranscript.current);
          }
        };

        // Handle end of recognition
        recognition.onend = () => {
          console.log("🛑 Recognition session ended");

          // Only auto-send if we're not already processing and have meaningful content
          if (!isProcessingCompletion.current && currentTranscript.current.trim().length >= THERAPEUTIC_PAUSE_CONFIG.MIN_TRANSCRIPT_LENGTH) {
            handleTherapeuticCompletion(currentTranscript.current);
          }

          setIsListening(false);
          recogActive.current = false;
          stopTherapeuticPauseDetection();
        };

        // Store the recognition instance
        (window as any)._recognitionInstance = recognition;

        // Start listening and therapeutic pause detection
        recogActive.current = true;
        setIsListening(true);
        startTherapeuticPauseDetection();

        recognition.start();

        return true;
      } catch (err) {
        console.error("Web speech recognition error:", err);
        recogActive.current = false;
        setIsListening(false);
        stopTherapeuticPauseDetection();
        return false;
      }
    }
  }, [language, stopListening, handleTherapeuticCompletion, updateTherapeuticSpeechActivity, startTherapeuticPauseDetection, stopTherapeuticPauseDetection]);

  // Test function for debugging voice selection
  const testVoices = useCallback(() => {
    if (!window.speechSynthesis) return;

    const voices = window.speechSynthesis.getVoices();
    console.log("Testing all voices:");

    // For debugging: Try all UK English voices
    const testVoice = (voice: SpeechSynthesisVoice, lang: string) => {
      const utter = new SpeechSynthesisUtterance(`Test with ${voice.name}`);
      utter.voice = voice;
      utter.lang = voice.lang;
      window.speechSynthesis.speak(utter);
      console.log(`Testing voice: ${voice.name} (${voice.lang})`);
    };

    // Test UK English voices first with brief pause between each
    console.log("Testing UK English voices...");
    const ukVoices = voices.filter(v => v.lang === 'en-GB');
    ukVoices.forEach((voice, index) => {
      setTimeout(() => testVoice(voice, 'en'), index * 3000);
    });
  }, []);

  // NEW: Get current speech queue status
  const getSpeechStatus = useCallback(() => {
    return {
      isPlaying: speechQueueRef.current.isPlaying,
      currentChunk: speechQueueRef.current.currentIndex + 1,
      totalChunks: speechQueueRef.current.totalChunks,
      progress: speechProgress
    };
  }, [speechProgress]);

  // NEW: Skip to next chunk (for user control)
  const skipToNextChunk = useCallback(() => {
    if (speechQueueRef.current.isPlaying) {
      console.log("⏭️ Skipping to next chunk");
      window.speechSynthesis.cancel();
      speechQueueRef.current.currentIndex++;
      setTimeout(() => {
        playNextChunk();
      }, 100);
    }
  }, [playNextChunk]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
      stopTherapeuticPauseDetection();
      stopResumeChecker();
    };
  }, [stopSpeaking, stopListening, stopTherapeuticPauseDetection, stopResumeChecker]);

  // NEW: Helper function to get current speech synthesis utterance for avatar sync
  const getCurrentUtterance = useCallback(() => {
    return currentUtteranceRef.current;
  }, []);

  return {
    speak: isNative.current ? nativeSpeak : speak,
    listen,
    stopListening,
    stopSpeaking,
    isListening,
    isSpeaking,
    ready,
    language,
    setLanguage,
    testVoices, // For debugging

    // NEW: Long text and progress features
    speechProgress,
    getSpeechStatus,
    skipToNextChunk,

    // NEW: Avatar integration exports
    setAvatarCallbacks,
    getCurrentUtterance, // For lip sync analysis
  };
}