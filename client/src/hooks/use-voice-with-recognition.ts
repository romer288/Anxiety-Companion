import { useCallback, useEffect, useRef, useState } from "react";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { Capacitor } from "@capacitor/core";
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

// Language code mappings for UK English (Vanessa)
const LANGUAGE_CODES: Record<SupportedLanguage, string> = {
  en: 'en-GB',  // Vanessa - UK English (changed from en-US)
  es: 'es-ES',  // Mónica - Spanish from Spain (NOT es-MX)
  pt: 'pt-BR'   // Luciana - Brazilian Portuguese
};

// Voice settings optimized for high-quality voices
const VOICE_SETTINGS: Record<SupportedLanguage, { pitch: number, rate: number }> = {
  en: { pitch: 1.0, rate: 0.95 }, // Optimized for Microsoft Hazel/Vanessa (UK English)
  es: { pitch: 1.1, rate: 0.95 }, // Mónica (Spanish)
  pt: { pitch: 1.0, rate: 0.97 }  // Luciana (Portuguese)
};

// Comprehensive voice mapping with high-quality voices first
const VOICE_MAPPING: Record<SupportedLanguage, string[]> = {
  en: [
    "Microsoft Hazel",            // Primary: High-quality UK female
    "Microsoft Susan",            // Secondary: UK female alternative
    "Google UK English Female",   // Tertiary: Original Vanessa voice
    "Karen",                      // Quaternary: macOS Australian female
    "Serena",                     // Quinary: macOS UK female
    "Daniel",                     // Final: macOS UK male fallback
    "en-GB-Neural-F",            // Neural UK female
    "en-GB-Standard-A",          // Standard UK female
    "en-GB"                      // Generic UK English
  ],
  es: ["Mónica", "Monica", "Microsoft Mónica", "Microsoft Monica", "es-ES"],
  pt: ["Luciana", "Microsoft Luciana", "pt-BR"]
};

interface SpeakOpts { 
  text: string; 
  lang?: SupportedLanguage; 
  pitch?: number; 
  rate?: number; 
}

// FIXED: Dual-mode pause detection - different behavior when AI is speaking vs quiet
const PAUSE_DETECTION_CONFIG = {
  // NORMAL MODE: When AI is NOT speaking (regular conversation)
  NORMAL_SHORT_PAUSE: 800,        // 0.8 seconds - don't stop for quick pauses
  NORMAL_THINKING_PAUSE: 3000,    // 3 seconds - allow thinking time
  NORMAL_COMPLETION_PAUSE: 4500,  // 4.5 seconds - probably done
  NORMAL_FINAL_COMPLETION: 6000,  // 6 seconds - definitely done

  // INTERRUPTION MODE: When AI IS speaking (faster response needed)
  INTERRUPT_DETECTION_THRESHOLD: 1000,  // 1 second - quick interruption detection
  INTERRUPT_MIN_LENGTH: 3,               // 3 characters minimum for interruption
  INTERRUPT_STOP_COMMAND_IMMEDIATE: 500, // 0.5s for stop commands

  // General settings
  MIN_TRANSCRIPT_LENGTH: 5,
  PAUSE_CHECK_INTERVAL: 100 // Check every 100ms
};

// Multi-language stop commands for immediate interruption
const STOP_COMMANDS = [
  // English
  'stop', 'quiet', 'shut up', 'pause', 'wait', 'be quiet', 'silence',
  // Spanish
  'para', 'detente', 'cállate', 'silencio', 'espera', 'alto',
  // Portuguese
  'pare', 'cale-se', 'silêncio', 'espere', 'quieto'
];

// Enhanced voice selection with comprehensive search
function selectExactVoice(voices: SpeechSynthesisVoice[], lang: SupportedLanguage): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  console.log(`🎤 Selecting voice for ${lang} from ${voices.length} options`);
  console.log("Available voices:", voices.map(v => `${v.name} (${v.lang})`));

  // Get the comprehensive voice preferences for this language
  const voicePreferences = VOICE_MAPPING[lang];

  // 1) Try each preference in order (comprehensive search)
  for (const preferredVoice of voicePreferences) {
    const match = voices.find(v => 
      (v.name.toLowerCase().includes(preferredVoice.toLowerCase()) ||
       v.name === preferredVoice) &&
      v.lang.startsWith(lang.split('-')[0])
    );

    if (match) {
      console.log(`✅ FOUND PREFERRED VOICE: ${match.name} (${match.lang})`);
      return match;
    }
  }

  // 2) Exact language code match (e.g. en-GB)
  const exactLangMatch = voices.find(v => v.lang === LANGUAGE_CODES[lang]);
  if (exactLangMatch) {
    console.log(`✅ FOUND EXACT LANG: ${exactLangMatch.name} (${exactLangMatch.lang})`);
    return exactLangMatch;
  }

  // 3) Language-specific enhanced search with quality prioritization
  if (lang === 'en') {
    // Prioritize Microsoft voices for English
    const microsoftVoice = voices.find(v => 
      v.name.toLowerCase().includes('microsoft') && 
      (v.lang.startsWith('en-GB') || v.lang.startsWith('en-US'))
    );
    if (microsoftVoice) {
      console.log(`✅ FOUND MICROSOFT VOICE: ${microsoftVoice.name}`);
      return microsoftVoice;
    }

    // Look for any high-quality UK English voice
    const ukVoice = voices.find(v => 
      v.lang.startsWith('en-GB') || v.lang.startsWith('en-AU')
    );
    if (ukVoice) {
      console.log(`✅ FOUND UK/AU VOICE: ${ukVoice.name}`);
      return ukVoice;
    }

    // Fallback to any female English voice
    const femaleEnglish = voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.toLowerCase().includes('female') || 
       v.name.toLowerCase().includes('woman') ||
       v.name.toLowerCase().includes('karen') ||
       v.name.toLowerCase().includes('serena'))
    );
    if (femaleEnglish) {
      console.log(`✅ FOUND FEMALE ENGLISH: ${femaleEnglish.name}`);
      return femaleEnglish;
    }
  } 
  else if (lang === 'es') {
    // Enhanced Spanish voice search
    const monica = voices.find(v => 
      (v.name.toLowerCase().includes('monica') || v.name.toLowerCase().includes('mónica')) && 
      v.lang === 'es-ES'
    );
    if (monica) {
      console.log(`✅ FOUND MÓNICA: ${monica.name}`);
      return monica;
    }

    const spainFemale = voices.find(v => 
      v.lang === 'es-ES' && 
      (v.name.toLowerCase().includes('female') || 
       v.name.toLowerCase().includes('woman') || 
       v.name.toLowerCase().includes('f'))
    );
    if (spainFemale) {
      console.log(`✅ FOUND SPAIN FEMALE: ${spainFemale.name}`);
      return spainFemale;
    }
  } 
  else if (lang === 'pt') {
    // Enhanced Portuguese voice search
    const luciana = voices.find(v => 
      v.name.includes('Luciana') && v.lang === 'pt-BR'
    );
    if (luciana) {
      console.log(`✅ FOUND LUCIANA: ${luciana.name}`);
      return luciana;
    }

    const ptBRFemale = voices.find(v => 
      v.lang === 'pt-BR' && 
      (v.name.toLowerCase().includes('female') || 
       v.name.toLowerCase().includes('woman') || 
       v.name.toLowerCase().includes('f'))
    );
    if (ptBRFemale) {
      console.log(`✅ FOUND PT-BR FEMALE: ${ptBRFemale.name}`);
      return ptBRFemale;
    }
  }

  // 4) Fallback to any language match
  const langPrefix = lang.split('-')[0];
  const langMatch = voices.find(v => v.lang.startsWith(langPrefix));
  if (langMatch) {
    console.log(`⚠️ FALLBACK LANG MATCH: ${langMatch.name}`);
    return langMatch;
  }

  // 5) Final fallback
  const finalFallback = voices.find(v => v.default) || voices[0];
  console.log(`⚠️ FINAL FALLBACK: ${finalFallback?.name || 'none'}`);
  return finalFallback;
}

/**
 * FIXED: Unified voice hook that coordinates with useSafeSpeech for speech synthesis
 * while maintaining full recognition functionality
 */
export function useVoiceWithRecognition(initialLang: SupportedLanguage = 'en') {
  // State
  const [language, setLanguage] = useState<SupportedLanguage>(initialLang);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // KEPT: For compatibility but will be overridden by coordination
  const [ready, setReady] = useState(false);

  // References
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const isNative = useRef(Capacitor.isNativePlatform());
  const recogActive = useRef(false);
  const autoSendCallbackRef = useRef<((text: string) => void) | null>(null);

  // External speech state coordination (injected by ChatInterface)
  const externalSpeechStateRef = useRef<{
    isSpeaking: boolean;
    shouldProcessSpeech: (text: string) => boolean;
    interruptSpeech: () => void;
  } | null>(null);

  // Method to inject external speech state (called from ChatInterface)
  const setSpeechState = useCallback((speechState: {
    isSpeaking: boolean;
    shouldProcessSpeech: (text: string) => boolean;
    interruptSpeech: () => void;
  }) => {
    externalSpeechStateRef.current = speechState;
  }, []);

  // Enhanced pause detection references
  const lastTranscriptRef = useRef<string>('');
  const lastSpeechTimestamp = useRef<number>(0);
  const pauseCheckTimer = useRef<NodeJS.Timeout | null>(null);
  const currentTranscript = useRef<string>('');
  const isProcessingPause = useRef<boolean>(false);

  // Duplicate prevention
  const lastSentTranscriptRef = useRef<string>('');
  const lastSentTimestamp = useRef<number>(0);

  // Initialize TTS with comprehensive voice selection (KEPT for compatibility)
  useEffect(() => {
    const load = () => {
      if (!window.speechSynthesis) return;
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;

      voiceRef.current = selectExactVoice(voices, language);
      if (voiceRef.current) {
        console.log(`🎤 Voice loaded: ${voiceRef.current.name} (${voiceRef.current.lang}) for ${language}`);
        setReady(true);
      }
    };

    load();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = load;
      return () => { window.speechSynthesis.onvoiceschanged = null; };
    }
  }, [language]);

  // FIXED: Dual-mode intelligent pause detection system
  const startPauseDetection = useCallback(() => {
    // Clear any existing pause detection
    if (pauseCheckTimer.current) {
      clearInterval(pauseCheckTimer.current);
      pauseCheckTimer.current = null;
    }

    console.log("🎤 Starting dual-mode intelligent pause detection");

    pauseCheckTimer.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastSpeech = now - lastSpeechTimestamp.current;
      const transcript = currentTranscript.current.trim();
      const speechState = externalSpeechStateRef.current;

      // Don't process if we're already handling a pause or no transcript
      if (isProcessingPause.current || transcript.length < PAUSE_DETECTION_CONFIG.MIN_TRANSCRIPT_LENGTH) {
        return;
      }

      // INTERRUPTION MODE: AI is currently speaking
      if (speechState?.isSpeaking) {
        console.log(`🎙️ INTERRUPTION MODE: Monitoring for user interruption (${(timeSinceLastSpeech/1000).toFixed(1)}s since last speech)`);

        // Check for stop commands immediately (very fast response)
        const lowerText = transcript.toLowerCase();
        if (STOP_COMMANDS.some(cmd => lowerText.includes(cmd))) {
          if (timeSinceLastSpeech >= PAUSE_DETECTION_CONFIG.INTERRUPT_STOP_COMMAND_IMMEDIATE) {
            console.log('🛑 STOP COMMAND DETECTED during AI speech - immediate interruption');
            if (speechState.interruptSpeech) {
              speechState.interruptSpeech();
            }
            handleIntelligentAutoSend(transcript);
            return;
          }
        }

        // For other speech during AI talking, require moderate pause for interruption
        if (timeSinceLastSpeech >= PAUSE_DETECTION_CONFIG.INTERRUPT_DETECTION_THRESHOLD) {
          if (transcript.length >= PAUSE_DETECTION_CONFIG.INTERRUPT_MIN_LENGTH) {
            console.log(`🛑 VOICE INTERRUPTION detected (${(timeSinceLastSpeech/1000).toFixed(1)}s pause) - stopping AI`);
            if (speechState.interruptSpeech) {
              speechState.interruptSpeech();
            }
            handleIntelligentAutoSend(transcript);
            return;
          }
        }
        return; // Don't process further in interruption mode
      }

      // NORMAL MODE: AI is NOT speaking (regular therapeutic conversation)
      console.log(`🎙️ NORMAL MODE: Therapeutic conversation pause detection (${(timeSinceLastSpeech/1000).toFixed(1)}s since last speech)`);

      // Ignore very short pauses (natural breathing, hesitation)
      if (timeSinceLastSpeech < PAUSE_DETECTION_CONFIG.NORMAL_SHORT_PAUSE) {
        return; // Still actively speaking or just a breath
      }

      // Allow thinking time (3-4.5 seconds) - important for therapy conversations
      if (timeSinceLastSpeech < PAUSE_DETECTION_CONFIG.NORMAL_THINKING_PAUSE) {
        console.log(`⏳ Allowing thinking pause (${(timeSinceLastSpeech/1000).toFixed(1)}s) - patient may be formulating thoughts`);
        return; // Patient is thinking, don't interrupt
      }

      // Moderate pause - might be done, but give more time for complex thoughts
      if (timeSinceLastSpeech < PAUSE_DETECTION_CONFIG.NORMAL_COMPLETION_PAUSE) {
        console.log(`🤔 Moderate pause detected (${(timeSinceLastSpeech/1000).toFixed(1)}s) - still allowing time for complex thoughts`);

        // Check for natural completion indicators
        const hasNaturalEnding = transcript.match(/[.!?]\s*$/) || 
                                transcript.toLowerCase().match(/\b(so|anyway|that's it|done|finished|that's all)\s*$/);

        if (hasNaturalEnding) {
          console.log("✅ Natural completion detected with moderate pause - processing");
          handleIntelligentAutoSend(transcript);
        }
        return;
      }

      // Long pause - likely done, but still be cautious for therapy context
      if (timeSinceLastSpeech < PAUSE_DETECTION_CONFIG.NORMAL_FINAL_COMPLETION) {
        console.log(`⌛ Long pause detected (${(timeSinceLastSpeech/1000).toFixed(1)}s) - likely finished speaking`);
        handleIntelligentAutoSend(transcript);
        return;
      }

      // Very long pause - definitely done
      if (timeSinceLastSpeech >= PAUSE_DETECTION_CONFIG.NORMAL_FINAL_COMPLETION) {
        console.log(`✅ Extended pause detected (${(timeSinceLastSpeech/1000).toFixed(1)}s) - definitely finished speaking`);
        handleIntelligentAutoSend(transcript);
        return;
      }
    }, PAUSE_DETECTION_CONFIG.PAUSE_CHECK_INTERVAL);
  }, []);

  const stopPauseDetection = useCallback(() => {
    if (pauseCheckTimer.current) {
      clearInterval(pauseCheckTimer.current);
      pauseCheckTimer.current = null;
    }
    isProcessingPause.current = false;
  }, []);

  // Enhanced auto-send with duplicate prevention
  const handleIntelligentAutoSend = useCallback((transcript: string) => {
    const now = Date.now();
    const trimmedTranscript = transcript.trim();

    // Prevent processing the same pause multiple times
    if (isProcessingPause.current) {
      return;
    }

    isProcessingPause.current = true;

    // Enhanced duplicate prevention
    if (autoSendCallbackRef.current && trimmedTranscript.length >= PAUSE_DETECTION_CONFIG.MIN_TRANSCRIPT_LENGTH) {
      if (
        trimmedTranscript !== lastSentTranscriptRef.current || 
        (now - lastSentTimestamp.current > 3000) // Allow same text if more than 3 seconds apart
      ) {
        console.log('🚀 Auto-sending after intelligent pause detection:', trimmedTranscript.substring(0, 50) + '...');
        lastSentTranscriptRef.current = trimmedTranscript;
        lastSentTimestamp.current = now;

        // Stop listening and send
        stopListening();
        autoSendCallbackRef.current(trimmedTranscript);
      } else {
        console.log('🛑 Preventing duplicate send of same content');
        isProcessingPause.current = false;
      }
    } else {
      isProcessingPause.current = false;
    }
  }, []);

  // Update transcript and timestamp when new speech is detected
  const updateSpeechActivity = useCallback((transcript: string) => {
    const previousTranscript = currentTranscript.current;
    currentTranscript.current = transcript;

    // Only update timestamp if transcript actually changed (new speech)
    if (transcript !== previousTranscript && transcript.trim().length > previousTranscript.trim().length) {
      lastSpeechTimestamp.current = Date.now();
      lastTranscriptRef.current = transcript;

      // Reset processing flag when new speech is detected
      isProcessingPause.current = false;

      console.log(`🎙️ New speech detected: "${transcript.slice(-20)}" (${transcript.length} chars)`);
    }
  }, []);

  // LEGACY: Keep speak function for compatibility (but it should use useSafeSpeech in practice)
  const speak = useCallback(({ text, lang = language, pitch, rate }: SpeakOpts): void => {
    console.warn('🚨 DEPRECATED: useVoiceWithRecognition.speak() called - should use useSafeSpeech instead');

    if (!text || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = LANGUAGE_CODES[lang];

      // Use comprehensive voice selection
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = selectExactVoice(voices, lang);

      if (selectedVoice) {
        utter.voice = selectedVoice;
        console.log(`🎤 Using high-quality voice: ${selectedVoice.name} (${selectedVoice.lang}) for ${lang}`);
      } else {
        console.log(`⚠️ No specific voice found for ${lang}, using browser default`);
      }

      const settings = VOICE_SETTINGS[lang];
      utter.pitch = pitch ?? settings.pitch;
      utter.rate = rate ?? settings.rate;

      utter.onstart = () => {
        console.log(`🔊 Speech started: "${text.substring(0, 20)}..." (${lang}) with ${selectedVoice?.name || 'default voice'}`);
        setIsSpeaking(true);
      };

      utter.onend = () => {
        console.log(`🔊 Speech ended`);
        setIsSpeaking(false);
      };

      utter.onerror = (e) => {
        console.error(`🔊 Speech error:`, e);
        setIsSpeaking(false);
      };

      setTimeout(() => {
        window.speechSynthesis.speak(utter);
      }, 50);
    } catch (err) {
      console.error("Speech synthesis error:", err);
      setIsSpeaking(false);
    }
  }, [language]);

  // LEGACY: Keep stopSpeaking for compatibility  
  const stopSpeaking = useCallback((): void => {
    console.warn('🚨 DEPRECATED: useVoiceWithRecognition.stopSpeaking() called - should use useSafeSpeech.interruptSpeech() instead');

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Stop listening function
  const stopListening = useCallback(async (): Promise<void> => {
    if (!recogActive.current) return;

    try {
      // Stop pause detection
      stopPauseDetection();

      if (isNative.current) {
        await SpeechRecognition.stop();
        SpeechRecognition.removeAllListeners();
      } else {
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

      // Reset state
      currentTranscript.current = '';
      lastSpeechTimestamp.current = 0;
      isProcessingPause.current = false;
      autoSendCallbackRef.current = null;
    }
  }, [stopPauseDetection]);

  // Enhanced speech recognition with intelligent pause detection and AI coordination
  const listen = useCallback(async (onResult: (text: string) => void): Promise<boolean> => {
    if (recogActive.current) return false;

    // Store callback for auto-send
    autoSendCallbackRef.current = onResult;

    // Check current mode based on AI speech state
    const speechState = externalSpeechStateRef.current;
    if (speechState?.isSpeaking) {
      console.log("🎤 Starting speech recognition in INTERRUPTION MODE (AI is currently speaking)");
    } else {
      console.log("🎤 Starting speech recognition in NORMAL MODE (therapeutic conversation)");
    }

    // Reset state
    currentTranscript.current = '';
    lastSpeechTimestamp.current = Date.now();
    isProcessingPause.current = false;

    if (isNative.current) {
      try {
        const { available } = await SpeechRecognition.available();
        if (!available) {
          console.error("Native speech recognition not available");
          return false;
        }

        await SpeechRecognition.requestPermissions();

        // Set up listener for partial results with intelligent pause detection
        SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
          if (data.matches && data.matches.length > 0) {
            const text = data.matches[0];

            // Check if AI is speaking and handle accordingly
            const currentSpeechState = externalSpeechStateRef.current;
            if (currentSpeechState?.isSpeaking) {
              // AI is speaking - check for interruption via shouldProcessSpeech
              if (!currentSpeechState.shouldProcessSpeech(text)) {
                return; // Interrupt command detected and handled
              }
              // Continue tracking for potential voice interruption
            }

            updateSpeechActivity(text);
          }
        });

        // Handle final results for native
        SpeechRecognition.addListener('finalResults', (data: { matches: string[] }) => {
          if (data.matches && data.matches.length > 0) {
            const text = data.matches[0];
            console.log('🎯 Native final result detected');
            updateSpeechActivity(text);
          }
        });

        // Start listening
        recogActive.current = true;
        setIsListening(true);

        // Start intelligent pause detection
        startPauseDetection();

        await SpeechRecognition.start({
          language: LANGUAGE_CODES[language],
          maxResults: 1,
          prompt: 'Speak now',
          partialResults: true,
          popup: false,
        });

        return true;
      } catch (err) {
        console.error("Native speech recognition error:", err);
        recogActive.current = false;
        setIsListening(false);
        stopPauseDetection();
        return false;
      }
    } else {
      // Web browser fallback with intelligent pause detection
      try {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          console.error("Web Speech API not supported in this browser");
          return false;
        }

        const SpeechRecognitionClass = (window as any).SpeechRecognition || 
          (window as any).webkitSpeechRecognition;

        const recognition = new SpeechRecognitionClass() as WebSpeechRecognition;

        recognition.lang = LANGUAGE_CODES[language];
        recognition.continuous = true; // Keep listening continuously
        recognition.interimResults = true;

        // Enhanced result handling with AI speech coordination
        recognition.onresult = (event: any) => {
          const results = Array.from(event.results);
          const latestTranscript = results
            .map((result: any) => result[0].transcript)
            .join('');

          // CRITICAL: Check AI speech state before processing
          const currentSpeechState = externalSpeechStateRef.current;

          if (currentSpeechState?.isSpeaking) {
            // AI is speaking - check for interruption
            if (!currentSpeechState.shouldProcessSpeech(latestTranscript)) {
              // Interrupt command detected and handled by shouldProcessSpeech
              return;
            }

            // For non-interrupt speech while AI is talking, still track for potential interruption
            console.log('🎙️ User speech detected while AI speaking (tracking for potential interruption)');
          }

          // Update speech activity tracking
          updateSpeechActivity(latestTranscript);

          // Handle final results (when user naturally pauses)
          if (event.results[event.results.length - 1].isFinal) {
            console.log('🎯 Final result detected - natural speech boundary');
            // Don't auto-send immediately on final results, let pause detection handle it
            // This prevents cutting off users who are just pausing between sentences
          }
        };

        recognition.onerror = (event) => {
          console.error("Web Speech API error:", event);
          setIsListening(false);
          recogActive.current = false;
          stopPauseDetection();

          // If there was meaningful transcript, still try to send it
          if (currentTranscript.current && currentTranscript.current.trim().length >= PAUSE_DETECTION_CONFIG.MIN_TRANSCRIPT_LENGTH) {
            handleIntelligentAutoSend(currentTranscript.current);
          }
        };

        recognition.onend = () => {
          console.log("🛑 Recognition ended");

          // Only auto-send if we're not already processing and have meaningful content
          if (!isProcessingPause.current && currentTranscript.current.trim().length >= PAUSE_DETECTION_CONFIG.MIN_TRANSCRIPT_LENGTH) {
            handleIntelligentAutoSend(currentTranscript.current);
          }

          setIsListening(false);
          recogActive.current = false;
          stopPauseDetection();
        };

        // Store the recognition instance
        (window as any)._recognitionInstance = recognition;

        // Start listening and pause detection
        recogActive.current = true;
        setIsListening(true);
        startPauseDetection();

        recognition.start();

        return true;
      } catch (err) {
        console.error("Web speech recognition error:", err);
        recogActive.current = false;
        setIsListening(false);
        stopPauseDetection();
        return false;
      }
    }
  }, [language, stopListening, handleIntelligentAutoSend, updateSpeechActivity, startPauseDetection, stopPauseDetection]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
      stopPauseDetection();
    };
  }, [stopSpeaking, stopListening, stopPauseDetection]);

  return {
    // PRIMARY: Recognition functions (main purpose of this hook)
    listen,
    stopListening,
    isListening,

    // LEGACY: Speech functions (kept for compatibility but should use useSafeSpeech)
    speak,
    stopSpeaking,
    isSpeaking, // This will be overridden by coordination with useSafeSpeech

    // CONFIGURATION: Language and setup
    ready,
    language,
    setLanguage,
    speechSupported: true,

    // COORDINATION: Method to inject external speech state (NEW)
    setSpeechState
  };
}