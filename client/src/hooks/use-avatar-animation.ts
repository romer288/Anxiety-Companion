import { useCallback, useRef, useState, useEffect } from 'react';

interface AvatarAnimationState {
  isListening: boolean;
  isSpeaking: boolean;
  anxietyLevel: number;
  currentExpression: 'neutral' | 'listening' | 'speaking' | 'concerned' | 'supportive' | 'empathetic';
  mouthOpenness: number; // 0-1 for lip sync
  eyeBlinkState: number; // 0-1 for blinking
  headTilt: number; // -1 to 1 for emotional response
}

interface LipSyncData {
  amplitude: number;
  frequency: number;
  timestamp: number;
}

export function useAvatarAnimation() {
  const [animationState, setAnimationState] = useState<AvatarAnimationState>({
    isListening: false,
    isSpeaking: false,
    anxietyLevel: 0,
    currentExpression: 'neutral',
    mouthOpenness: 0,
    eyeBlinkState: 0,
    headTilt: 0
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const blinkIntervalRef = useRef<NodeJS.Timeout>();

  // Initialize audio context for lip sync (with error handling)
  const initializeAudioAnalysis = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) {
          console.warn('Web Audio API not supported');
          return false;
        }

        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        analyserRef.current.smoothingTimeConstant = 0.8;
      }
      return true;
    } catch (error) {
      console.error('Failed to initialize audio analysis:', error);
      return false;
    }
  }, []);

  // Natural blinking animation
  const startBlinking = useCallback(() => {
    const blink = () => {
      setAnimationState(prev => ({ ...prev, eyeBlinkState: 1 }));
      setTimeout(() => {
        setAnimationState(prev => ({ ...prev, eyeBlinkState: 0 }));
      }, 150);
    };

    const scheduleNextBlink = () => {
      const nextBlinkTime = 2000 + Math.random() * 3000; // 2-5 seconds
      blinkIntervalRef.current = setTimeout(() => {
        blink();
        scheduleNextBlink();
      }, nextBlinkTime);
    };

    scheduleNextBlink();
  }, []);

  const stopBlinking = useCallback(() => {
    if (blinkIntervalRef.current) {
      clearTimeout(blinkIntervalRef.current);
    }
  }, []);

  // Start listening animation
  const startListening = useCallback(() => {
    console.log('🎭 Avatar: Starting listening animation');
    setAnimationState(prev => ({
      ...prev,
      isListening: true,
      isSpeaking: false,
      currentExpression: 'listening',
      headTilt: 0.1 // Slight attentive tilt
    }));
    startBlinking();
  }, [startBlinking]);

  // Stop listening animation
  const stopListening = useCallback(() => {
    console.log('🎭 Avatar: Stopping listening animation');
    setAnimationState(prev => ({
      ...prev,
      isListening: false,
      currentExpression: prev.anxietyLevel >= 7 ? 'concerned' : 
                       prev.anxietyLevel >= 4 ? 'supportive' : 'neutral',
      headTilt: 0
    }));
  }, []);

  // Enhanced speaking animation with real lip sync
  const startSpeaking = useCallback((audioSource?: HTMLAudioElement | string) => {
    console.log('🎭 Avatar: Starting speaking animation');

    setAnimationState(prev => ({
      ...prev,
      isSpeaking: true,
      isListening: false,
      currentExpression: 'speaking',
      headTilt: 0
    }));

    stopBlinking(); // Don't blink while speaking

    // If we have audio source, do real lip sync
    if (audioSource && initializeAudioAnalysis()) {
      let audio: HTMLAudioElement;

      if (typeof audioSource === 'string') {
        audio = new Audio(audioSource);
      } else {
        audio = audioSource;
      }

      try {
        if (audioContextRef.current && analyserRef.current) {
          // Clean up previous source
          if (sourceRef.current) {
            sourceRef.current.disconnect();
          }

          sourceRef.current = audioContextRef.current.createMediaElementSource(audio);
          sourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);

          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

          const analyzeLipSync = () => {
            if (!analyserRef.current || !animationState.isSpeaking) return;

            analyserRef.current.getByteFrequencyData(dataArray);

            // Calculate mouth movement based on audio
            const lowFreq = dataArray.slice(0, 64).reduce((a, b) => a + b) / 64; // 0-3kHz for speech
            const midFreq = dataArray.slice(64, 128).reduce((a, b) => a + b) / 64; // 3-6kHz

            // Combine frequencies for natural mouth movement
            const amplitude = (lowFreq * 0.7 + midFreq * 0.3) / 255;
            const mouthOpenness = Math.min(amplitude * 2, 1); // Scale and cap at 1

            setAnimationState(prev => ({
              ...prev,
              mouthOpenness: mouthOpenness
            }));

            if (animationState.isSpeaking) {
              animationFrameRef.current = requestAnimationFrame(analyzeLipSync);
            }
          };

          analyzeLipSync();
        }
      } catch (error) {
        console.error('Lip sync setup failed:', error);
        // Fallback to simple mouth animation
        startSimpleMouthAnimation();
      }
    } else {
      // Fallback to simple mouth animation
      startSimpleMouthAnimation();
    }
  }, [animationState.isSpeaking, initializeAudioAnalysis, stopBlinking]);

  // Simple mouth animation fallback
  const startSimpleMouthAnimation = useCallback(() => {
    let mouthPhase = 0;

    const animateMouth = () => {
      if (!animationState.isSpeaking) return;

      mouthPhase += 0.3;
      const mouthOpenness = (Math.sin(mouthPhase) + 1) * 0.3; // 0-0.6 range

      setAnimationState(prev => ({
        ...prev,
        mouthOpenness
      }));

      if (animationState.isSpeaking) {
        animationFrameRef.current = requestAnimationFrame(animateMouth);
      }
    };

    animateMouth();
  }, [animationState.isSpeaking]);

  // Stop speaking animation
  const stopSpeaking = useCallback(() => {
    console.log('🎭 Avatar: Stopping speaking animation');

    setAnimationState(prev => ({
      ...prev,
      isSpeaking: false,
      mouthOpenness: 0,
      currentExpression: prev.anxietyLevel >= 7 ? 'concerned' : 
                       prev.anxietyLevel >= 4 ? 'supportive' : 'neutral'
    }));

    // Clean up audio analysis
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    startBlinking(); // Resume blinking
  }, [startBlinking]);

  // Update anxiety level with enhanced emotional expressions
  const updateAnxietyLevel = useCallback((level: number) => {
    console.log(`🎭 Avatar: Updating anxiety level to ${level}/10`);

    let expression: AvatarAnimationState['currentExpression'] = 'neutral';
    let headTilt = 0;

    if (level >= 8) {
      expression = 'concerned';
      headTilt = -0.15; // Concerned tilt
    } else if (level >= 6) {
      expression = 'empathetic';
      headTilt = 0.1; // Empathetic tilt
    } else if (level >= 3) {
      expression = 'supportive';
      headTilt = 0.05; // Slight supportive tilt
    }

    setAnimationState(prev => ({
      ...prev,
      anxietyLevel: level,
      currentExpression: prev.isSpeaking ? 'speaking' : 
                       prev.isListening ? 'listening' : expression,
      headTilt: prev.isSpeaking || prev.isListening ? prev.headTilt : headTilt
    }));
  }, []);

  // Integration with your existing TTS system
  const syncWithSpeechSynthesis = useCallback((utterance: SpeechSynthesisUtterance) => {
    utterance.onstart = () => {
      console.log('🎭 Avatar: Speech synthesis started');
      startSpeaking();
    };

    utterance.onend = () => {
      console.log('🎭 Avatar: Speech synthesis ended');
      stopSpeaking();
    };

    utterance.onerror = () => {
      console.log('🎭 Avatar: Speech synthesis error');
      stopSpeaking();
    };

    return utterance;
  }, [startSpeaking, stopSpeaking]);

  // Integration with audio blobs (for TTS)
  const syncWithAudioBlob = useCallback((audioBlob: Blob): Promise<HTMLAudioElement> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const audioUrl = URL.createObjectURL(audioBlob);
      audio.src = audioUrl;

      audio.addEventListener('loadeddata', () => {
        console.log('🎭 Avatar: Audio blob loaded for lip sync');
        resolve(audio);
      });

      audio.addEventListener('play', () => {
        startSpeaking(audio);
      });

      audio.addEventListener('ended', () => {
        stopSpeaking();
        URL.revokeObjectURL(audioUrl); // Clean up
      });

      audio.addEventListener('error', (error) => {
        console.error('Audio playback error:', error);
        stopSpeaking();
        URL.revokeObjectURL(audioUrl);
        reject(error);
      });
    });
  }, [startSpeaking, stopSpeaking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopBlinking();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopBlinking]);

  // Initialize blinking on mount
  useEffect(() => {
    startBlinking();
  }, [startBlinking]);

  return {
    // State
    animationState,

    // Control functions
    startListening,
    stopListening,
    startSpeaking,
    stopSpeaking,
    updateAnxietyLevel,

    // Integration helpers
    syncWithSpeechSynthesis,
    syncWithAudioBlob,

    // Utility
    isReady: !!audioContextRef.current || true // Always ready, audio analysis is optional
  };
}