import { useCallback, useEffect, useRef, useState } from "react";

type SupportedLang = "en" | "es" | "pt";
interface SpeakOpts {
  text: string;
  lang?: SupportedLang;
  pitch?: number; // 0–2
  rate?: number;  // 0.1–10
}

// Updated regex to detect our specific target voices
const VOICE_NAME_REGEX =
  /(google uk english female|vanessa|monica|mónica|luciana|microsoft|neural|studio)/i;

// Define preferred voices for each language - UPDATED to target specific voices
const PREFERRED_VOICES = {
  en: [
    'Google UK English Female',   // Chrome desktop - Vanessa
    'Microsoft Hazel',            // Edge / Windows UK female (high quality)
    'Microsoft Susan',            // Edge / Windows UK female (high quality)
    'Karen',                      // macOS Australian female (good alternative)
    'Serena',                     // macOS UK female
    'Daniel',                     // macOS UK male (as fallback)
    'en-GB-Neural-F',            // Neural UK female
    'en-GB-Standard-A',          // Standard UK female
    'en-GB',                     // Generic UK English
    'Google US English Female'    // Final fallback
  ],
  es: ['Mónica', 'Monica', 'Microsoft Mónica', 'Microsoft Monica', 'es-ES-Neural-F'],
  pt: ['Luciana', 'Microsoft Luciana', 'pt-BR-Neural-F']
};

function pickSpecificVoice(
  voices: SpeechSynthesisVoice[],
  lang: SupportedLang
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) {
    return null;
  }

  console.log(`Selecting voice for ${lang} from ${voices.length} options`);

  // Clone and sort the voices array for sequential searching
  const sortedVoices = [...voices].sort((a, b) => {
    // Premium neural voices at the top
    if (a.name.includes('Neural') && !b.name.includes('Neural')) return -1;
    if (!a.name.includes('Neural') && b.name.includes('Neural')) return 1;

    // Then premium/studio voices
    if ((a.name.includes('Premium') || a.name.includes('Studio')) && 
        !(b.name.includes('Premium') || b.name.includes('Studio'))) return -1;
    if (!(a.name.includes('Premium') || a.name.includes('Studio')) && 
        (b.name.includes('Premium') || b.name.includes('Studio'))) return 1;

    return 0;
  });

  // 1. Try to match exact preferred voices for this language
  if (PREFERRED_VOICES[lang]) {
    for (const preferredVoice of PREFERRED_VOICES[lang]) {
      const exactMatch = sortedVoices.find(v => 
        v.name === preferredVoice || 
        v.name.includes(preferredVoice)
      );
      if (exactMatch) {
        console.log(`Found preferred voice match: ${exactMatch.name}`);
        return exactMatch;
      }
    }
  }

  // 2. Exact lang match that includes our target voices
  const byName = sortedVoices.find(
    (v) => v.lang.startsWith(getLangPrefix(lang)) && VOICE_NAME_REGEX.test(v.name)
  );
  if (byName) {
    console.log(`Found voice by name: ${byName.name}`);
    return byName;
  }

  // 3. Match language code exactly
  const exactLangMatch = sortedVoices.find((v) => {
    if (lang === 'en') return v.lang === 'en-GB';
    if (lang === 'es') return v.lang === 'es-ES';
    if (lang === 'pt') return v.lang === 'pt-BR';
    return false;
  });
  if (exactLangMatch) {
    console.log(`Found exact language match: ${exactLangMatch.name}`);
    return exactLangMatch;
  }

  // 4. Any voice with the right language prefix
  const fallback = sortedVoices.find((v) => v.lang.startsWith(getLangPrefix(lang)));
  if (fallback) {
    console.log(`Using fallback voice: ${fallback.name}`);
    return fallback;
  }

  console.log('No suitable voice found, using first available');
  return sortedVoices[0] || null;
}

// Helper function to get language prefix
function getLangPrefix(lang: SupportedLang): string {
  return lang;
}

// Helper to map language codes
function getLanguageCode(lang: SupportedLang): string {
  switch(lang) {
    case 'en': return 'en-GB';  // Vanessa - Google UK English Female
    case 'es': return 'es-ES';  // Mónica - Spanish from Spain
    case 'pt': return 'pt-BR';  // Luciana - Brazilian Portuguese
    default: return 'en-GB';
  }
}

export function useSpeech() {
  const [ready, setReady] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Load voices (async on most browsers)
  useEffect(() => {
    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return; // still empty → will fire again
      voiceRef.current = pickSpecificVoice(voices, "en");
      setReady(true);
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Get the right voice for a specific language
  const getVoiceForLanguage = useCallback((targetLang: SupportedLang): SpeechSynthesisVoice | null => {
    // If we don't have a voice yet or the language doesn't match what we want
    if (!voiceRef.current || !voiceRef.current.lang.startsWith(getLangPrefix(targetLang))) {
      // Try to find a better voice for this language
      const voices = window.speechSynthesis.getVoices();
      return pickSpecificVoice(voices, targetLang);
    }
    return voiceRef.current;
  }, []);

  // Helper to get voice settings by language - UPDATED for requested voices
  const getVoiceSettings = (lang: SupportedLang): { pitch: number, rate: number } => {
    switch(lang) {
      case 'en': // Vanessa (Google UK English Female)
        return { pitch: 1.0, rate: 1.0 };
      case 'es': // Mónica (Spanish)
        return { pitch: 1.1, rate: 0.95 };
      case 'pt': // Luciana (Portuguese)
        return { pitch: 1.0, rate: 0.97 };
      default:
        return { pitch: 1.0, rate: 1.0 };
    }
  };

  /** Speak using local TTS with specified voice characteristics */
  const speak = useCallback(
    async ({
      text,
      lang = "en",
      pitch,
      rate,
    }: SpeakOpts): Promise<void> => {
      if (!text) return;

      // Get ideal voice settings if not specified
      const settings = getVoiceSettings(lang);
      const finalPitch = pitch ?? settings.pitch;
      const finalRate = rate ?? settings.rate;

      // Try to get the best voice for this language
      const bestVoice = getVoiceForLanguage(lang);

      console.log(`Speaking with voice: ${bestVoice?.name || 'default'}, lang: ${lang}, pitch: ${finalPitch}, rate: ${finalRate}`);

      // ---------- Local Web Speech ---------- //
      if (ready && (bestVoice || voiceRef.current)) {
        try {
          // Cancel any ongoing speech first
          window.speechSynthesis.cancel();

          const utter = new SpeechSynthesisUtterance(text);
          utter.voice = bestVoice || voiceRef.current;
          utter.lang = getLanguageCode(lang);
          utter.pitch = finalPitch; 
          utter.rate = finalRate;

          window.speechSynthesis.speak(utter);
          return;
        } catch (err) {
          console.error("Speech synthesis error:", err);
        }
      }

      // ---------- Cloud Polly fallback ---------- //
      try {
        // Map language to appropriate Polly voice - UPDATE for consistency
        let pollyVoice;
        if (lang === 'en') pollyVoice = "Vanessa";       // Match Vanessa (Google UK English Female)
        else if (lang === 'es') pollyVoice = "Mónica"; // Match Mónica
        else if (lang === 'pt') pollyVoice = "Luciana"; // Match Luciana
        else pollyVoice = "Vanessa"; // Default

        const query = new URLSearchParams({
          text,
          voice: pollyVoice,
          outputFormat: "mp3",
        }).toString();

        console.log(`Using Polly fallback with voice: ${pollyVoice}`);

        const audio = new Audio(
          `https://polly.vox.sandbox.awscloud.com/speak?${query}`
        );
        await audio.play();
      } catch (err) {
        // last-ditch: do nothing, but don't crash the app
        console.error("Speech fallback error:", err);
      }
    },
    [ready, getVoiceForLanguage]
  );

  // State for listening
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');

  // Monitor speech state
  useEffect(() => {
    const speaking = () => setIsSpeaking(true);
    const stopped = () => setIsSpeaking(false);

    if (window.speechSynthesis) {
      window.speechSynthesis.addEventListener('start', speaking);
      window.speechSynthesis.addEventListener('end', stopped);
      window.speechSynthesis.addEventListener('pause', stopped);
      window.speechSynthesis.addEventListener('resume', speaking);
      window.speechSynthesis.addEventListener('error', stopped);
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.removeEventListener('start', speaking);
        window.speechSynthesis.removeEventListener('end', stopped);
        window.speechSynthesis.removeEventListener('pause', stopped);
        window.speechSynthesis.removeEventListener('resume', speaking);
        window.speechSynthesis.removeEventListener('error', stopped);
      }
    };
  }, []);

  // Web Speech Recognition implementation
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    // Check for browser support
    if (typeof window !== 'undefined') {
      // Get the appropriate SpeechRecognition constructor
      const SpeechRecognition = (window as any).SpeechRecognition || 
                              (window as any).webkitSpeechRecognition ||
                              (window as any).mozSpeechRecognition ||
                              (window as any).msSpeechRecognition;

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        // Set up event handlers
        recognitionRef.current.onstart = () => {
          console.log('Web Speech Recognition started');
          setIsListening(true);
        };

        recognitionRef.current.onend = () => {
          console.log('Web Speech Recognition ended');
          setIsListening(false);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognitionRef.current.onresult = (event: any) => {
          const result = event.results[event.results.length - 1];
          if (result.isFinal) {
            const text = result[0].transcript;
            setTranscript(text);
            console.log('Final speech recognition result:', text);
          } else {
            // Update with interim result
            const interimText = result[0].transcript;
            setTranscript(interimText);
          }
        };
      }
    }

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
      }
    };
  }, []);

  // Start listening function that properly uses the initialized recognition object
  const startListening = useCallback((lang: SupportedLang = 'en') => {
    if (!recognitionRef.current) {
      console.error('Speech recognition not supported or not initialized');
      return;
    }

    try {
      // Stop any existing session first
      stopListening();

      // Set the language - UPDATED to use correct language codes
      recognitionRef.current.lang = lang === 'en' ? 'en-GB' : 
                                  lang === 'es' ? 'es-ES' : // Updated to es-ES for Mónica
                                  'pt-BR';

      // Clear previous transcript                            
      setTranscript('');

      // Start listening
      console.log(`Starting web speech recognition for language: ${lang}`);
      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  }, []);

  // Stop listening function
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log('Stopped speech recognition');
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }
    setIsListening(false);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  return { 
    speak, 
    startListening,
    stopListening,
    stopSpeaking,
    isListening,
    isSpeaking,
    transcript,
    setTranscript,
    speechSupported: typeof window !== 'undefined' && (
      'SpeechRecognition' in window || 
      'webkitSpeechRecognition' in window ||
      'mozSpeechRecognition' in window ||
      'msSpeechRecognition' in window
    ),
    speechSynthesisSupported: typeof window !== 'undefined' && 'speechSynthesis' in window,
    ttsReady: ready
  };
}