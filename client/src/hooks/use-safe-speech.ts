import { useState, useEffect, useRef, useCallback } from 'react';
import { SupportedLanguage } from '@shared/schema';

// Utility function to play a short beep when interrupting speech
export function playInterruptSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContext();

    // Create an oscillator (beep sound)
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime); // Volume

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Short beep
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.15);

    // Fade out
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
  } catch (e) {
    console.error("Could not play interrupt sound:", e);
  }
}

// FIXED: Text chunking function to handle long responses
function chunkText(text: string, maxLength: number = 200): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  const sentences = text.match(/[^\.!?]+[\.!?]+/g) || [text];

  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();

    // If adding this sentence would exceed the limit
    if (currentChunk.length + trimmedSentence.length > maxLength) {
      // Save current chunk if it has content
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      // If the sentence itself is too long, split it by commas or spaces
      if (trimmedSentence.length > maxLength) {
        const subChunks = splitLongSentence(trimmedSentence, maxLength);
        chunks.push(...subChunks);
      } else {
        currentChunk = trimmedSentence;
      }
    } else {
      currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
    }
  }

  // Add any remaining text
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.length > 0);
}

// Helper to split very long sentences
function splitLongSentence(sentence: string, maxLength: number): string[] {
  const words = sentence.split(' ');
  const chunks: string[] = [];
  let currentChunk = '';

  for (const word of words) {
    if (currentChunk.length + word.length + 1 > maxLength) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = word;
      } else {
        // Even a single word is too long, force split it
        chunks.push(word.substring(0, maxLength));
        currentChunk = word.substring(maxLength);
      }
    } else {
      currentChunk += (currentChunk ? ' ' : '') + word;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Get the exact voice settings for each language
export function getExactVoiceSettings(lang: SupportedLanguage): {
  voiceName: string[],
  pitch: number,
  rate: number
} {
  switch (lang) {
    case 'en':
      return {
        voiceName: [
          'Google UK English Female',
          'Microsoft Hazel',
          'Microsoft Susan',
          'Karen',
          'Serena',
          'Daniel',
          'en-GB-Neural-F',
          'en-GB-Standard-A',
          'en-GB',
          'Google US English Female'
        ],
        pitch: 1.0,
        rate: 0.95
      };
    case 'es':
      return {
        voiceName: ['Mónica', 'Monica', 'Microsoft Mónica', 'Microsoft Monica', 'es-ES'],
        pitch: 1.1,
        rate: 0.95
      };
    case 'pt':
      return {
        voiceName: ['Luciana', 'Microsoft Luciana', 'pt-BR'],
        pitch: 1.0,
        rate: 0.97
      };
    default:
      return {
        voiceName: [],
        pitch: 1.0,
        rate: 1.0
      };
  }
}

/**
 * FIXED: Enhanced hook with long text support and better speech management
 */
export function useSafeSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakingRef = useRef(false);

  // FIXED: Add queue management for chunked speech
  const speechQueueRef = useRef<string[]>([]);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isProcessingQueueRef = useRef(false);

  // Avatar integration callbacks
  const avatarCallbacksRef = useRef<{
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
    onSpeechInterrupt?: () => void;
  }>({});

  // Avatar callback setter
  const setAvatarCallbacks = useCallback((callbacks: {
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
    onSpeechInterrupt?: () => void;
  }) => {
    avatarCallbacksRef.current = callbacks;
  }, []);

  // FIXED: Enhanced interrupt function that stops the entire queue
  const interruptSpeech = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    console.log('🛑 SPEECH MANUALLY INTERRUPTED - CLEARING QUEUE');

    // Cancel current speech
    window.speechSynthesis.cancel();

    // Clear the queue
    speechQueueRef.current = [];
    isProcessingQueueRef.current = false;
    currentUtteranceRef.current = null;

    // Play feedback sound
    playInterruptSound();

    // Force speaking state to false immediately
    speakingRef.current = false;
    setIsSpeaking(false);

    // Notify avatar of interruption
    if (avatarCallbacksRef.current.onSpeechInterrupt) {
      avatarCallbacksRef.current.onSpeechInterrupt();
    }
    if (avatarCallbacksRef.current.onSpeechEnd) {
      avatarCallbacksRef.current.onSpeechEnd();
    }
  }, []);

  // FIXED: Simplified monitoring system to avoid conflicts
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    let monitorInterval: NodeJS.Timeout | null = null;
    let lastSpeakingState = false;

    const checkSpeakingState = () => {
      const currentlySpeaking = window.speechSynthesis.speaking;

      // Only update state if it changed
      if (currentlySpeaking !== lastSpeakingState) {
        lastSpeakingState = currentlySpeaking;

        if (currentlySpeaking && !speakingRef.current) {
          console.log('⭐ SPEECH STARTED - DISABLING RECOGNITION');
          speakingRef.current = true;
          setIsSpeaking(true);

          if (avatarCallbacksRef.current.onSpeechStart) {
            avatarCallbacksRef.current.onSpeechStart();
          }
        } 
        else if (!currentlySpeaking && speakingRef.current) {
          // FIXED: Only end speech if the queue is actually empty
          if (speechQueueRef.current.length === 0 && !isProcessingQueueRef.current) {
            console.log('⭐ SPEECH ENDED - QUEUE EMPTY - ENABLING RECOGNITION');

            // FIXED: Longer delay for chunked speech
            setTimeout(() => {
              // Double-check the queue is still empty
              if (speechQueueRef.current.length === 0 && !isProcessingQueueRef.current) {
                console.log('⭐ RECOGNITION DELAY COMPLETE - RECOGNITION ENABLED');
                speakingRef.current = false;
                setIsSpeaking(false);

                if (avatarCallbacksRef.current.onSpeechEnd) {
                  avatarCallbacksRef.current.onSpeechEnd();
                }
              }
            }, 1200); // Increased delay for chunked speech
          }
        }
      }
    };

    // Check state more frequently but less aggressively
    monitorInterval = setInterval(checkSpeakingState, 150);

    return () => {
      if (monitorInterval) clearInterval(monitorInterval);
    };
  }, []);

  // Enhanced function to check for stop commands in speech
  const shouldProcessSpeech = useCallback((transcript: string): boolean => {
    // If system is speaking, check for interrupt commands
    if (speakingRef.current) {
      const lowerText = transcript.toLowerCase().trim();

      // Multi-language stop commands
      const stopCommands = [
        'stop', 'quiet', 'shut up', 'pause', 'wait', 'be quiet', 'silence',
        'para', 'detente', 'cállate', 'silencio', 'espera', 'alto',
        'pare', 'cale-se', 'silêncio', 'espere', 'quieto'
      ];

      if (stopCommands.some(cmd => lowerText.includes(cmd))) {
        console.log('🛑 STOP COMMAND DETECTED: Interrupting speech');
        interruptSpeech();
        return false;
      }

      console.log('🚫 REJECTING INPUT: System is speaking');
      return false;
    }
    return true;
  }, [interruptSpeech]);

  // FIXED: Function to process speech queue one chunk at a time
  const processNextInQueue = useCallback((
    lang: SupportedLanguage,
    pitch: number,
    rate: number,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (e: any) => void,
    onAvatarStart?: () => void,
    onAvatarEnd?: () => void,
    isFirstChunk: boolean = false
  ) => {
    if (speechQueueRef.current.length === 0) {
      console.log('📝 Speech queue completed');
      isProcessingQueueRef.current = false;

      // Only call onEnd when the entire queue is finished
      if (onEnd) onEnd();
      if (onAvatarEnd) onAvatarEnd();
      return;
    }

    const nextChunk = speechQueueRef.current.shift()!;
    isProcessingQueueRef.current = true;

    console.log(`📝 Speaking chunk: "${nextChunk.substring(0, 50)}..." (${speechQueueRef.current.length} remaining)`);

    try {
      const utterance = new SpeechSynthesisUtterance(nextChunk);
      currentUtteranceRef.current = utterance;

      // Set language and voice
      const voiceSettings = getExactVoiceSettings(lang);
      const voices = window.speechSynthesis.getVoices();

      if (lang === 'es') {
        utterance.lang = 'es-ES';
        const monicaVoice = voices.find(v => v.name === 'Mónica' && v.lang === 'es-ES');
        if (monicaVoice) {
          utterance.voice = monicaVoice;
        } else {
          const esVoices = voices.filter(v => v.lang === 'es-ES');
          const femaleVoice = esVoices.find(v => 
            !v.name.includes('Grandpa') && 
            !v.name.includes('Reed') &&
            v.name !== 'Paulina'
          );
          if (femaleVoice) utterance.voice = femaleVoice;
        }
      } else if (lang === 'pt') {
        utterance.lang = 'pt-BR';
        const lucianaVoice = voices.find(v => v.name === 'Luciana' && v.lang === 'pt-BR');
        if (lucianaVoice) {
          utterance.voice = lucianaVoice;
        } else {
          const ptVoice = voices.find(v => v.lang === 'pt-BR');
          if (ptVoice) utterance.voice = ptVoice;
        }
      } else {
        utterance.lang = 'en-GB';
        const vanessaVoice = voices.find(v => v.name === 'Google UK English Female' && v.lang === 'en-GB');
        if (vanessaVoice) {
          utterance.voice = vanessaVoice;
        } else {
          const ukVoice = voices.find(v => v.lang === 'en-GB');
          if (ukVoice) utterance.voice = ukVoice;
        }
      }

      utterance.pitch = pitch;
      utterance.rate = rate;

      // FIXED: Enhanced callbacks for chunked speech
      utterance.onstart = () => {
        console.log(`🔊 Chunk started: "${nextChunk.substring(0, 30)}..."`);

        // Only call onStart for the first chunk
        if (isFirstChunk) {
          if (onStart) onStart();
          if (onAvatarStart) onAvatarStart();
        }
      };

      utterance.onend = () => {
        console.log(`🔊 Chunk ended: "${nextChunk.substring(0, 30)}..."`);

        // Process next chunk in queue
        setTimeout(() => {
          processNextInQueue(lang, pitch, rate, onStart, onEnd, onError, onAvatarStart, onAvatarEnd, false);
        }, 100); // Small delay between chunks
      };

      utterance.onerror = (e) => {
        console.error(`🔊 Chunk error: "${nextChunk.substring(0, 30)}..."`, e);

        // Clear queue on error and call error handlers
        speechQueueRef.current = [];
        isProcessingQueueRef.current = false;

        if (onError) onError(e);
        if (onAvatarEnd) onAvatarEnd();
      };

      // Start speaking this chunk
      window.speechSynthesis.speak(utterance);

    } catch (err) {
      console.error("Error in chunk processing:", err);
      speechQueueRef.current = [];
      isProcessingQueueRef.current = false;

      if (onError) onError(err);
      if (avatarCallbacksRef.current.onSpeechEnd) {
        avatarCallbacksRef.current.onSpeechEnd();
      }
    }
  }, []);

  // FIXED: Enhanced speech function with automatic text chunking
  const safeSpeakWithCallback = useCallback((
    options: {
      text: string,
      lang: SupportedLanguage,
      pitch?: number,
      rate?: number,
      onStart?: () => void,
      onEnd?: () => void,
      onError?: (e: any) => void,
      onAvatarStart?: () => void,
      onAvatarEnd?: () => void,
    }
  ) => {
    const { text, lang, pitch, rate, onStart, onEnd, onError, onAvatarStart, onAvatarEnd } = options;
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;

    // Cancel any existing speech and clear queue
    window.speechSynthesis.cancel();
    speechQueueRef.current = [];
    isProcessingQueueRef.current = false;
    currentUtteranceRef.current = null;

    try {
      // Get voice settings
      const voiceSettings = getExactVoiceSettings(lang);
      const finalPitch = pitch ?? voiceSettings.pitch;
      const finalRate = rate ?? voiceSettings.rate;

      // FIXED: Chunk the text for long responses
      const chunks = chunkText(text, 200); // 200 character limit per chunk
      console.log(`📝 Text chunked into ${chunks.length} parts for speech synthesis`);

      if (chunks.length === 0) {
        console.warn("No text chunks to speak");
        return;
      }

      // Add all chunks to the queue
      speechQueueRef.current = [...chunks];

      // Start processing the queue
      processNextInQueue(
        lang, 
        finalPitch, 
        finalRate, 
        onStart, 
        onEnd, 
        onError, 
        onAvatarStart, 
        onAvatarEnd,
        true // isFirstChunk
      );

    } catch (err) {
      console.error("Error in safe speech synthesis:", err);
      if (onError) onError(err);

      if (avatarCallbacksRef.current.onSpeechEnd) {
        avatarCallbacksRef.current.onSpeechEnd();
      }
    }
  }, [processNextInQueue]);

  // Helper to get current speech utterance for lip sync
  const getCurrentUtterance = useCallback(() => {
    return window.speechSynthesis;
  }, []);

  return {
    isSpeaking,
    shouldProcessSpeech,
    interruptSpeech,
    safeSpeakWithCallback,

    // Avatar integration exports
    setAvatarCallbacks,
    getCurrentUtterance,
  };
}