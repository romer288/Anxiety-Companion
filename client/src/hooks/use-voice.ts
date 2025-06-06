import { useCallback, useEffect, useRef, useState } from "react";
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Capacitor } from '@capacitor/core';
import { SupportedLanguage } from "@shared/schema";

// Language code mappings for each supported language with specific voices
const LANGUAGE_CODES: Record<SupportedLanguage, string> = {
  en: 'en-GB',  // Vanessa - Google UK English Female
  es: 'es-ES',  // Mónica - Spanish from Spain
  pt: 'pt-BR'   // Luciana - Brazilian Portuguese
};

// The exact voice settings for our target voices
const VOICE_SETTINGS: Record<SupportedLanguage, { pitch: number, rate: number }> = {
  en: { pitch: 1.0, rate: 1.0 }, // Vanessa (Google UK English Female)
  es: { pitch: 1.1, rate: 0.95 }, // Mónica (Spanish)
  pt: { pitch: 1.0, rate: 0.97 }  // Luciana (Portuguese)
};

// Voice tuning function for specific voices
function getTuningForVoice(voiceName: string, defaultLang: SupportedLanguage = 'en'): { pitch: number, rate: number } {
  // Start with language defaults
  let pitch = VOICE_SETTINGS[defaultLang].pitch;
  let rate = VOICE_SETTINGS[defaultLang].rate;

  console.log(`Applying voice tuning for: "${voiceName}"`);

  if (voiceName.includes('Google UK English Female') || voiceName.includes('Vanessa')) {
    // Vanessa (en-GB) - Google UK English Female
    pitch = 1.0;
    rate = 1.0;
    console.log(`Vanessa voice settings applied: pitch=${pitch}, rate=${rate}`);
  } else if (voiceName.includes('Monica') || voiceName.includes('Mónica')) {
    // Mónica (es-ES) - Spanish from Spain
    pitch = 1.1;
    rate = 0.95;
    console.log(`Mónica voice settings applied: pitch=${pitch}, rate=${rate}`);
  } else if (voiceName.includes('Luciana')) {
    // Luciana (pt-BR) - Brazilian Portuguese
    pitch = 1.0;
    rate = 0.97;
    console.log(`Luciana voice settings applied: pitch=${pitch}, rate=${rate}`);
  }

  return { pitch, rate };
}

// Updated regex to detect our target voices
const VOICE_NAME_REGEX =
  /(google uk english female|vanessa|monica|mónica|luciana|microsoft|neural|studio)/i;

// Stop command words in multiple languages
const STOP_COMMANDS = {
  en: ['stop', 'stop talking', 'shut up', 'be quiet'],
  es: ['para', 'detente', 'cállate', 'silencio', 'alto'],
  pt: ['pare', 'para', 'silêncio', 'cale-se', 'chega']
};

interface SpeakOpts { 
  text: string; 
  lang?: SupportedLanguage; 
  pitch?: number; 
  rate?: number; 
}

// Find the best voice for the language
function pickSpecificVoice(voices: SpeechSynthesisVoice[], lang: SupportedLanguage): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) {
    return null;
  }

  console.log(`Selecting voice for ${lang} from ${voices.length} options`);

  // Debug all available voices
  console.log("All available voices:", voices.map(v => `${v.name} (${v.lang})`));

  // Define preferred voices for comprehensive search
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

  // 1) Check ordered preferences - comprehensive search
  for (const preferred of PREFERRED_VOICES[lang]) {
    const match = sortedVoices.find(v => 
      v.name.toLowerCase().includes(preferred.toLowerCase()) ||
      v.name === preferred
    );
    if (match) {
      console.log(`✅ FOUND PREFERRED: ${match.name} (${match.lang})`);
      return match;
    }
  }

  // 2) Exact language code (e.g. en-GB)
  const exactLang = sortedVoices.find(v => v.lang === LANGUAGE_CODES[lang]);
  if (exactLang) {
    console.log(`✅ FOUND EXACT LANG: ${exactLang.name} (${exactLang.lang})`);
    return exactLang;
  }

  // 3) Any voice starting with the language prefix (e.g. "en")
  const prefix = LANGUAGE_CODES[lang].split('-')[0];
  const prefixMatch = sortedVoices.find(v => v.lang.startsWith(prefix));
  if (prefixMatch) {
    console.log(`✅ FOUND PREFIX MATCH: ${prefixMatch.name} (${prefixMatch.lang})`);
    return prefixMatch;
  }

  // 4) Try exact lang match with target name pattern
  const byPattern = sortedVoices.find(
    (v) => v.lang.startsWith(lang.split('-')[0]) && VOICE_NAME_REGEX.test(v.name)
  );
  if (byPattern) {
    console.log(`Found voice matching pattern: ${byPattern.name}`);
    return byPattern;
  }

  // 5) Look specifically for neural voices
  const neuralVoices = sortedVoices.filter(v => 
    v.lang.startsWith(lang.split('-')[0]) && (
      v.name.includes('Neural') ||
      v.name.includes('Premium') || 
      v.name.includes('Plus') ||
      v.name.includes('Enhanced')
    )
  );

  if (neuralVoices.length > 0) {
    console.log(`Found neural voice: ${neuralVoices[0].name}`);
    return neuralVoices[0];
  }

  // 6) Plain lang fallback
  const fallback = sortedVoices.find((v) => v.lang.startsWith(lang.split('-')[0]));
  if (fallback) {
    console.log(`Using fallback voice: ${fallback.name}`);
    return fallback;
  }

  console.log('No suitable voice found, using first available');
  return sortedVoices[0] || null;
}

/**
 * Unified hook for voice synthesis and recognition
 */
export function useVoice(initialLang: SupportedLanguage = 'en') {
  // State
  const [language, setLanguage] = useState<SupportedLanguage>(initialLang);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsReady, setTtsReady] = useState(false);

  // References
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const isNative = useRef<boolean>(Capacitor.isNativePlatform());
  const recognitionRef = useRef<any>(null);

  // Load voices for TTS on initialization
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;

      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return; // will fire again when voices are loaded

      voiceRef.current = pickSpecificVoice(voices, language);
      if (voiceRef.current) {
        console.log(`Voice loaded: ${voiceRef.current.name} (${voiceRef.current.lang})`);
        setTtsReady(true);
      }
    };

    loadVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, [language]);

  // Initialize speech recognition
  useEffect(() => {
    if (isNative.current) {
      // For native platforms, we'll initialize on demand
      return;
    }

    // Web speech recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = 
        (window as any).SpeechRecognition || 
        (window as any).webkitSpeechRecognition ||
        (window as any).mozSpeechRecognition ||
        (window as any).msSpeechRecognition;

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
      }
    }
  }, []);

  // Web speech synthesis
  const webSpeak = useCallback(({ text, lang = language, pitch, rate }: SpeakOpts): void => {
    if (!text || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    try {
      const utter = new SpeechSynthesisUtterance(text);

      // If we have a voice for this language, use it
      if (voiceRef.current && voiceRef.current.lang.startsWith(lang)) {
        utter.voice = voiceRef.current;
      } else {
        // Try to get an appropriate voice for this language
        const voices = window.speechSynthesis.getVoices();
        const bestVoice = pickSpecificVoice(voices, lang);
        if (bestVoice) {
          utter.voice = bestVoice;
          // Update our ref for future use
          voiceRef.current = bestVoice;
        }
      }

      // Get optimized tuning for this specific voice
      const { pitch: optPitch, rate: optRate } = 
        voiceRef.current 
          ? getTuningForVoice(voiceRef.current.name, lang) 
          : VOICE_SETTINGS[lang] || VOICE_SETTINGS.en;

      // Use provided values or optimized defaults
      const finalPitch = pitch ?? optPitch;
      const finalRate = rate ?? optRate;

      utter.lang = LANGUAGE_CODES[lang] || 'en-GB';
      utter.pitch = finalPitch;
      utter.rate = finalRate;

      // Events
      utter.onstart = () => setIsSpeaking(true);
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);

      console.log(`Speaking with web voice: ${utter.voice?.name || 'default'}, lang: ${utter.lang}, pitch: ${finalPitch}, rate: ${finalRate}`);

      window.speechSynthesis.speak(utter);
    } catch (error) {
      console.error('Web speech error:', error);
      setIsSpeaking(false);
    }
  }, [language]);

  // Native speech synthesis
  const nativeSpeak = useCallback(async ({ text, lang = language, pitch, rate }: SpeakOpts): Promise<void> => {
    if (!text || !isNative.current) return;

    try {
      // Cancel any ongoing speech
      await TextToSpeech.stop();

      // Get voice settings or defaults
      const settings = VOICE_SETTINGS[lang] || VOICE_SETTINGS.en;
      const finalPitch = pitch ?? settings.pitch;
      const finalRate = rate ?? settings.rate;

      setIsSpeaking(true);

      console.log(`Speaking with native voice: ${LANGUAGE_CODES[lang]}, pitch: ${finalPitch}, rate: ${finalRate}`);

      // Use specific voice options for each language
      let voiceOptions = {};
      if (lang === 'en') {
        // Attempt to use Google UK English Female voice (Vanessa)
        voiceOptions = { voice: 'Google UK English Female' };
      } else if (lang === 'es') {
        // Attempt to use Mónica voice
        voiceOptions = { voice: 'Mónica' };
      } else if (lang === 'pt') {
        // Attempt to use Luciana voice
        voiceOptions = { voice: 'Luciana' };
      }

      // Split into sentences for more natural speech patterns
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];

        await TextToSpeech.speak({
          text: sentence,
          lang: LANGUAGE_CODES[lang] || 'en-GB',
          rate: finalRate,
          pitch: finalPitch,
          volume: 1.0,
          category: 'ambient',
          ...voiceOptions
        });

        // Small pause between sentences for natural delivery
        if (i < sentences.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      }
    } catch (error) {
      console.error('Native speech error:', error);
    } finally {
      setIsSpeaking(false);
    }
  }, [language]);

  // Unified speak function that uses the appropriate implementation
  const speak = useCallback((opts: SpeakOpts): void => {
    if (isNative.current) {
      nativeSpeak(opts);
    } else {
      webSpeak(opts);
    }
  }, [nativeSpeak, webSpeak]);

  // Stop speaking on both platforms
  const stopSpeaking = useCallback(async (): Promise<void> => {
    if (isNative.current) {
      try {
        await TextToSpeech.stop();
      } catch (error) {
        console.error('Error stopping native speech:', error);
      }
    } else if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
  }, []);

  // Start listening on the appropriate platform
  const startListening = useCallback(async (onResult: (text: string) => void): Promise<boolean> => {
    if (isListening) return false;

    try {
      if (isNative.current) {
        // Native speech recognition
        const { available } = await SpeechRecognition.available();
        if (!available) {
          console.error('Speech recognition not available on this device');
          return false;
        }

        await SpeechRecognition.requestPermissions();

        // Set up listener
        SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
          if (data.matches && data.matches.length > 0) {
            const text = data.matches[0];

            // Check for stop commands
            const stopWords = STOP_COMMANDS[language];
            if (isSpeaking && stopWords && stopWords.some(word => text.toLowerCase().includes(word))) {
              stopSpeaking();
              return;
            }

            onResult(text);
          }
        });

        // Start listening
        await SpeechRecognition.start({
          language: LANGUAGE_CODES[language],
          maxResults: 1,
          prompt: 'Speak now',
          partialResults: true,
          popup: false,
        });

        setIsListening(true);
        return true;
      } else {
        // Web speech recognition
        if (!recognitionRef.current) {
          console.error('Speech recognition not supported in this browser');
          return false;
        }

        // Set up event handlers
        recognitionRef.current.onresult = (event: any) => {
          const result = event.results[event.results.length - 1];
          if (result.isFinal) {
            const text = result[0].transcript;

            // Check for stop commands
            const stopWords = STOP_COMMANDS[language];
            if (isSpeaking && stopWords && stopWords.some(word => text.toLowerCase().includes(word))) {
              stopSpeaking();
              return;
            }

            onResult(text);
          }
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current.onerror = (e: any) => {
          console.error('Speech recognition error:', e);
          setIsListening(false);
        };

        // Start listening
        recognitionRef.current.lang = LANGUAGE_CODES[language];
        recognitionRef.current.start();
        setIsListening(true);
        return true;
      }
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setIsListening(false);
      return false;
    }
  }, [isListening, isSpeaking, language, stopSpeaking]);

  // Stop listening on the appropriate platform
  const stopListening = useCallback(async (): Promise<void> => {
    try {
      if (isNative.current) {
        await SpeechRecognition.stop();
        SpeechRecognition.removeAllListeners();
      } else if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    } finally {
      setIsListening(false);
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, [stopSpeaking, stopListening]);

  // Return the unified API
  return {
    speak,
    startListening,
    stopListening,
    stopSpeaking,
    isListening,
    isSpeaking,
    ttsReady,
    language,
    setLanguage,
    isNative: isNative.current,
  };
}