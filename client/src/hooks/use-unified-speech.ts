import { useState, useEffect, useCallback, useRef } from 'react';
import { useSpeech } from './use-speech';
import { useNativeSpeech } from './use-native-speech';
import { Capacitor } from '@capacitor/core';
import { SupportedLanguage, VoicePreference, availableVoices } from '@shared/schema';

// Stop command words in multiple languages
const STOP_COMMANDS = {
  en: ['stop', 'stop talking', 'shut up', 'be quiet'],
  es: ['para', 'detente', 'cállate', 'silencio', 'alto'],
  pt: ['pare', 'para', 'silêncio', 'cale-se', 'chega']
};

// Default voice settings for each language - UPDATED for Vanessa, Mónica, and Luciana
const DEFAULT_VOICE_SETTINGS: Record<SupportedLanguage, VoicePreference> = {
  en: { language: 'en', voiceId: 'Microsoft Hazel', rate: 0.95, pitch: 1.0 }, // Prioritize high-quality Microsoft voice
  es: { language: 'es', voiceId: 'Mónica', rate: 0.95, pitch: 1.1 },
  pt: { language: 'pt', voiceId: 'Luciana', rate: 0.97, pitch: 1.0 }
};

interface UseUnifiedSpeechProps {
  onResult?: (text: string) => void;
  language?: SupportedLanguage;
}

export function useUnifiedSpeech({ onResult, language = 'en' }: UseUnifiedSpeechProps = {}) {
  const [isNative, setIsNative] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(language);
  const [currentVoice, setCurrentVoice] = useState<VoicePreference | null>(null);
  const isInterruptEnabled = useRef<boolean>(true);

  // Custom result handler to detect stop commands
  const handleSpeechResult = useCallback((text: string) => {
    // Check if text contains a stop command during speech
    const stopWords = STOP_COMMANDS[currentLanguage] || STOP_COMMANDS.en;
    const lowerText = text.toLowerCase();

    // If speaking and the text contains a stop command, stop immediately
    if (isInterruptEnabled.current && 
        ((isNative && nativeSpeech.isSpeaking) || (!isNative && webSpeech.isSpeaking)) &&
        stopWords.some(word => lowerText.includes(word))) {
      console.log('Stop command detected:', text);
      stopSpeaking();
      return; // Don't pass stop commands to the app
    }

    // Otherwise pass the result to the caller
    onResult?.(text);
  }, [currentLanguage, isNative]);

  // Initialize both speech systems with our custom result handler
  const webSpeech = useSpeech();
  const nativeSpeech = useNativeSpeech({ onResult: handleSpeechResult });

  // Monitor transcript changes from web speech and forward them
  useEffect(() => {
    // Only process speech input when we're not speaking to avoid the system 
    // hearing itself and confusing its own voice with the user's input
    const currentlySpeaking = isNative ? nativeSpeech.isSpeaking : webSpeech.isSpeaking;

    if (webSpeech.transcript && !isNative && !currentlySpeaking) {
      handleSpeechResult(webSpeech.transcript);
    }
  }, [webSpeech.transcript, isNative, handleSpeechResult, nativeSpeech.isSpeaking, webSpeech.isSpeaking]);

  // Determine if we're on a native platform
  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  // Update voice when language changes
  useEffect(() => {
    if (language !== currentLanguage) {
      setCurrentLanguage(language);
    }

    // First try to get voice from availableVoices in schema
    const voicesForLanguage = availableVoices[language];
    if (voicesForLanguage && voicesForLanguage.length > 0) {
      // Check if any of the available voices match our target voices with comprehensive search
      const targetVoice = voicesForLanguage.find(voice => {
        if (language === 'en') {
          // Comprehensive English voice search
          return (
            voice.voiceId.includes('Microsoft Hazel') ||
            voice.voiceId.includes('Microsoft Susan') ||
            voice.voiceId.includes('Karen') ||
            voice.voiceId.includes('Serena') ||
            voice.voiceId.includes('Google UK English Female') ||
            voice.voiceId.includes('Vanessa') ||
            voice.voiceId.includes('Daniel')
          );
        }
        if (language === 'es' && (voice.voiceId.includes('Mónica') || voice.voiceId.includes('Monica'))) return true;
        if (language === 'pt' && voice.voiceId.includes('Luciana')) return true;
        return false;
      });

      if (targetVoice) {
        setCurrentVoice(targetVoice);
      } else {
        // If no match found in available voices, use our default settings
        setCurrentVoice(DEFAULT_VOICE_SETTINGS[language]);
      }
    } else {
      // If no voices available from schema, use our default settings
      setCurrentVoice(DEFAULT_VOICE_SETTINGS[language]);
    }
  }, [language, currentLanguage]);

  // Functions that automatically use the appropriate speech system
  const startListening = useCallback(() => {
    if (isNative) {
      nativeSpeech.startListening(currentLanguage);
    } else {
      webSpeech.startListening(currentLanguage);
    }
  }, [isNative, webSpeech, nativeSpeech, currentLanguage]);

  const speak = useCallback((text: string) => {
    if (!text) return;

    // Enable interruption for this speech session
    isInterruptEnabled.current = true;

    // Get voice settings - either current or default for this language
    const voiceSettings = currentVoice || DEFAULT_VOICE_SETTINGS[currentLanguage];

    if (isNative) {
      nativeSpeech.speak(text, voiceSettings);
    } else {
      webSpeech.speak({
        text,
        lang: currentLanguage, 
        pitch: voiceSettings.pitch,
        rate: voiceSettings.rate
      });
    }
  }, [isNative, webSpeech, nativeSpeech, currentVoice, currentLanguage]);

  const stopSpeaking = useCallback(() => {
    console.log('Immediately stopping speech');
    if (isNative) {
      nativeSpeech.stopSpeaking();
    } else {
      webSpeech.stopSpeaking();
    }
    isInterruptEnabled.current = false; // Disable interruption after manual stop
  }, [isNative, webSpeech, nativeSpeech]);

  // Manually set the language
  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setCurrentLanguage(lang);

    // Try to find the right voice from availableVoices first
    const voicesForLanguage = availableVoices[lang];
    const targetVoice = voicesForLanguage?.find(voice => {
      if (lang === 'en') {
        // Comprehensive English voice search
        return (
          voice.voiceId.includes('Microsoft Hazel') ||
          voice.voiceId.includes('Microsoft Susan') ||
          voice.voiceId.includes('Karen') ||
          voice.voiceId.includes('Serena') ||
          voice.voiceId.includes('Google UK English Female') ||
          voice.voiceId.includes('Vanessa') ||
          voice.voiceId.includes('Daniel')
        );
      }
      if (lang === 'es' && (voice.voiceId.includes('Mónica') || voice.voiceId.includes('Monica'))) return true;
      if (lang === 'pt' && voice.voiceId.includes('Luciana')) return true;
      return false;
    });

    // Set either the found voice or our default
    setCurrentVoice(targetVoice || DEFAULT_VOICE_SETTINGS[lang]);
  }, []);

  // Set a specific voice preference
  const setVoicePreference = useCallback((voicePreference: VoicePreference) => {
    setCurrentVoice(voicePreference);
    // Also update the language to match the voice
    setCurrentLanguage(voicePreference.language);
  }, []);

  // Unified state - use the appropriate values based on platform
  const isListening = isNative ? nativeSpeech.isListening : webSpeech.isListening;
  const isSpeaking = isNative ? nativeSpeech.isSpeaking : webSpeech.isSpeaking;
  const transcript = isNative ? nativeSpeech.transcript : webSpeech.transcript;

  // Check if speech capabilities are supported
  const speechSupported = isNative 
    ? nativeSpeech.isNative 
    : webSpeech.speechSupported;

  const speechSynthesisSupported = isNative 
    ? nativeSpeech.isNative 
    : webSpeech.speechSynthesisSupported;

  return {
    isListening,
    isSpeaking,
    transcript,
    speechSupported,
    speechSynthesisSupported,
    startListening,
    speak,
    stopSpeaking,
    isNative,
    currentLanguage,
    currentVoice,
    setLanguage,
    setVoicePreference,
    availableVoicesForLanguage: availableVoices[currentLanguage] || []
  };
}