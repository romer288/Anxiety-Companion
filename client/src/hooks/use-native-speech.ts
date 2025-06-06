import { useState, useEffect, useCallback } from 'react';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Capacitor } from '@capacitor/core';
import { SupportedLanguage, VoicePreference } from '@shared/schema';

// Language code mappings for each supported language with specific voice characteristics
const languageCodes: Record<SupportedLanguage, string> = {
  en: 'en-GB',  // Vanessa - Google UK English Female
  es: 'es-ES',  // Mónica - Spanish from Spain (NOT es-CO)
  pt: 'pt-BR'   // Luciana - Brazilian Portuguese
};

// Helper function to select the best available voice for native platforms
const selectBestNativeVoice = (language: SupportedLanguage): string => {
  // Define comprehensive voice preferences for native platforms
  const nativeVoicePreferences = {
    en: [
      'Microsoft Hazel',           // Primary: High-quality UK female
      'Microsoft Susan',           // Secondary: UK female alternative  
      'Google UK English Female',  // Tertiary: Original Vanessa voice
      'Karen',                    // Quaternary: macOS Australian female
      'Serena',                   // Quinary: macOS UK female
      'Daniel',                   // Final: macOS UK male fallback
      'en-GB-Neural-F',           // Neural UK female
      'en-GB-Standard-A'          // Standard UK female
    ],
    es: [
      'Mónica',
      'Microsoft Mónica', 
      'Monica',
      'Microsoft Monica',
      'es-ES-Neural-F'
    ],
    pt: [
      'Luciana',
      'Microsoft Luciana',
      'pt-BR-Neural-F'
    ]
  };

  // For native platforms, we'll try the first preference
  // The native TextToSpeech API will handle fallbacks internally
  const preferences = nativeVoicePreferences[language];
  return preferences[0]; // Return the highest priority voice
};

// Voice settings by language - tailored for the requested voices
const voiceSettings: Record<SupportedLanguage, { pitch: number, rate: number }> = {
  en: { pitch: 1.0, rate: 0.95 }, // Optimized for Microsoft Hazel/Vanessa
  es: { pitch: 1.1, rate: 0.95 }, // Mónica (Spanish)
  pt: { pitch: 1.0, rate: 0.97 }  // Luciana (Portuguese)
};

interface UseNativeSpeechProps {
  onResult?: (text: string) => void;
}

export function useNativeSpeech({ onResult }: UseNativeSpeechProps = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isNative, setIsNative] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');

  // Check if running on a native platform
  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  // Request permissions for speech recognition
  useEffect(() => {
    if (isNative) {
      const requestPermissions = async () => {
        try {
          const { available } = await SpeechRecognition.available();
          if (available) {
            await SpeechRecognition.requestPermissions();
          }
        } catch (error) {
          console.error('Error requesting speech recognition permissions:', error);
        }
      };

      requestPermissions();
    }
  }, [isNative]);

  // Start listening for speech with language support
  const startListening = useCallback(async (language: SupportedLanguage = 'en') => {
    if (!isNative) return;

    setIsListening(true);
    setTranscript('');
    setCurrentLanguage(language);

    try {
      // Get the appropriate language code
      const langCode = languageCodes[language] || 'en-GB';

      // Start the speech recognition
      await SpeechRecognition.start({
        language: langCode,
        maxResults: 1,
        prompt: 'Speak now',
        partialResults: true,
        popup: false,
      });

      // Set up the listener for results
      await SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
        if (data.matches && data.matches.length > 0) {
          const recognizedText = data.matches[0];
          setTranscript(recognizedText);

          if (onResult) {
            onResult(recognizedText);
          }
        }
      });
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setIsListening(false);
    }
  }, [isNative, onResult]);

  // Stop listening
  const stopListening = useCallback(async () => {
    if (!isNative || !isListening) return;

    try {
      await SpeechRecognition.stop();
      setIsListening(false);
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }, [isNative, isListening]);

  // Speech implementation with voice settings for Vanessa, Mónica, and Luciana
  const speak = useCallback(async (text: string, voicePreference?: VoicePreference) => {
    if (!isNative || !text) return;

    // Stop any current speech
    if (isSpeaking) {
      try {
        await TextToSpeech.stop();
      } catch (error) {
        console.error('Error stopping speech:', error);
      }
    }

    setIsSpeaking(true);

    try {
      // Use provided voice preference or default to current language
      const language = voicePreference?.language || currentLanguage;
      const langCode = languageCodes[language] || languageCodes.en;

      // Get voice settings for this language (Vanessa, Mónica, or Luciana)
      const settings = voiceSettings[language] || voiceSettings.en;

      // Set voice parameters based on preference or voice defaults
      const rate = voicePreference?.rate || settings.rate;
      const pitch = voicePreference?.pitch || settings.pitch;

      console.log(`Speaking with native voice: ${langCode}, pitch: ${pitch}, rate: ${rate}`);

      // Use specific voice options for each language with comprehensive selection
      let voiceOptions = {};
      const selectedVoice = selectBestNativeVoice(language);

      console.log(`Native platform attempting to use voice: ${selectedVoice} for language: ${language}`);

      if (language === 'en') {
        // Use the best available English voice (prioritizing Microsoft Hazel)
        voiceOptions = { voice: selectedVoice };
      } else if (language === 'es') {
        // Use the best available Spanish voice (prioritizing Mónica)
        voiceOptions = { voice: selectedVoice };
      } else if (language === 'pt') {
        // Use the best available Portuguese voice (prioritizing Luciana)
        voiceOptions = { voice: selectedVoice };
      }

      // Split into sentences for more natural speech patterns
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];

        await TextToSpeech.speak({
          text: sentence,
          lang: langCode,
          rate: rate,
          pitch: pitch,
          volume: 1.0,
          category: 'ambient',
          ...voiceOptions
        });

        // Add a small pause between sentences for a more natural delivery
        if (i < sentences.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      }
    } catch (error) {
      console.error('Error with speech:', error);
    } finally {
      setIsSpeaking(false);
    }
  }, [isNative, isSpeaking, currentLanguage]);

  // Stop speaking
  const stopSpeaking = useCallback(async () => {
    if (!isNative || !isSpeaking) return;

    try {
      await TextToSpeech.stop();
      setIsSpeaking(false);
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }, [isNative, isSpeaking]);

  // Clean up listeners on unmount
  useEffect(() => {
    return () => {
      if (isNative) {
        SpeechRecognition.removeAllListeners();
        if (isListening) {
          SpeechRecognition.stop().catch(console.error);
        }
        if (isSpeaking) {
          TextToSpeech.stop().catch(console.error);
        }
      }
    };
  }, [isNative, isListening, isSpeaking]);

  return {
    isListening,
    isSpeaking,
    transcript,
    isNative,
    startListening,
    stopListening,
    speak,
    stopSpeaking
  };
}