import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "../context/SessionContext";
import { Paperclip, Send, MoreVertical, Mic, Volume2, VolumeX, HelpCircle, Globe, Square, Check, StopCircle, MicOff } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useVoiceWithRecognition } from "../hooks/use-voice-with-recognition";
import { useSafeSpeech } from "../hooks/use-safe-speech";
import { SupportedLanguage } from "@shared/schema";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  anxietyLevel?: number;
  anxietyTriggers?: string[];
  stressFactors?: {
    factor: string;
    severity: number;
  }[];
}

const ChatInterface = () => {
  // Session and basic state
  const { currentSession, isSessionActive, startNewSession } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [showSettings, setShowSettings] = useState(false);
  const [hasInitialGreeting, setHasInitialGreeting] = useState(false);

  // Get session ID from current session with fallback
  const sessionId = currentSession?.id || 1; // Use 1 as fallback for testing

  // Enhanced voice interruption state
  const [isVoiceInterrupting, setIsVoiceInterrupting] = useState(false);
  const [isPassiveListening, setIsPassiveListening] = useState(false);
  const voiceInterruptionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const passiveListeningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Speech status tracking
  const [currentSpeechText, setCurrentSpeechText] = useState<string>("");

  // Ensure we have a valid session
  useEffect(() => {
    const ensureSession = async () => {
      if (!currentSession?.id && !isSessionActive) {
        console.log('No session ID found, creating new session...');
        try {
          await startNewSession('temp-user');
        } catch (error) {
          console.error('Failed to create session:', error);
          console.log('Using fallback session ID: 1');
        }
      } else if (currentSession?.id) {
        console.log('Session ID exists:', currentSession.id);
      }
    };

    ensureSession();
  }, [currentSession, isSessionActive, startNewSession]);

  // Voice hooks - FIXED to use your actual hooks
  const voiceHook = useVoiceWithRecognition(language);
  const safeSpeech = useSafeSpeech();

  // CRITICAL: Set up coordination between voice recognition and safe speech
  useEffect(() => {
    if (voiceHook.setSpeechState) {
      voiceHook.setSpeechState({
        isSpeaking: safeSpeech.isSpeaking,
        shouldProcessSpeech: safeSpeech.shouldProcessSpeech,
        interruptSpeech: safeSpeech.interruptSpeech
      });
    }
  }, [safeSpeech.isSpeaking, safeSpeech.shouldProcessSpeech, safeSpeech.interruptSpeech, voiceHook]);

  // Voice recognition state
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Monitor voice recognition state
  useEffect(() => {
    console.log('Voice recognition state:', {
      isListening: voiceHook.isListening,
      ready: voiceHook.ready,
      speechSupported: voiceHook.speechSupported,
      isSpeaking: safeSpeech.isSpeaking // Use safeSpeech for speaking state
    });
  }, [voiceHook.isListening, voiceHook.ready, voiceHook.speechSupported, safeSpeech.isSpeaking]);

  // Enhanced initial greeting - App talks first
  useEffect(() => {
    if (!hasInitialGreeting && voiceHook.ready && messages.length === 0) {
      const greetingMessage = getInitialGreeting(language);
      const aiMessage: Message = {
        id: Date.now().toString(),
        content: greetingMessage,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages([aiMessage]);
      setHasInitialGreeting(true);

      // Start speaking immediately and enable voice interruption
      setTimeout(() => {
        console.log('🎤 Starting initial greeting with voice interruption enabled');
        speakWithInterruption(greetingMessage);
      }, 500);
    }
  }, [hasInitialGreeting, voiceHook.ready, messages.length, language]);

  // Get initial greeting based on language
  const getInitialGreeting = (lang: SupportedLanguage): string => {
    const greetings = {
      en: "Hello, I'm Vanessa, your anxiety support companion. I'm here to listen and help you through whatever you're experiencing. How are you feeling today?",
      es: "Hola, soy Mónica, tu compañera de apoyo para la ansiedad. Estoy aquí para escucharte y ayudarte con lo que estés experimentando. ¿Cómo te sientes hoy?",
      pt: "Olá, eu sou Luciana, sua companheira de apoio para ansiedade. Estou aqui para ouvir e ajudá-la com o que você está vivenciando. Como você está se sentindo hoje?"
    };
    return greetings[lang];
  };

  // FIXED: Function to speak with automatic interruption detection using your hooks
  const speakWithInterruption = useCallback(async (text: string) => {
    if (!voiceHook.speechSupported || !text.trim()) return;

    try {
      console.log('🎤 Speaking with interruption enabled:', text.substring(0, 50) + '...');

      // Set current speech text for display
      setCurrentSpeechText(text);

      // Start speaking using safeSpeech with callbacks
      safeSpeech.safeSpeakWithCallback({
        text: text,
        lang: language,
        pitch: 1.0,
        rate: 0.9,
        onStart: () => {
          console.log('🎙️ Speech started');
          setCurrentSpeechText(text);
        },
        onEnd: () => {
          console.log('🎙️ Speech ended');
          setCurrentSpeechText("");
        },
        onError: (error) => {
          console.error('Speech error:', error);
          setCurrentSpeechText("");
        },
        onAvatarStart: () => {
          // Avatar integration can go here
        },
        onAvatarEnd: () => {
          // Avatar integration can go here
        }
      });

      // Start passive listening for interruption after a brief delay
      setTimeout(() => {
        startPassiveListening();
      }, 1000);

    } catch (error) {
      console.error('Speech with interruption error:', error);
      setCurrentSpeechText("");
    }
  }, [voiceHook, safeSpeech, language]);

  // Start passive listening (always listening for interruption while AI speaks)
  const startPassiveListening = useCallback(async () => {
    if (!voiceHook.speechSupported || isPassiveListening || !safeSpeech.isSpeaking) return;

    try {
      console.log('🎧 Starting passive listening for voice interruption...');
      setIsPassiveListening(true);

      const success = await voiceHook.listen((transcript) => {
        const cleanTranscript = transcript.trim();
        console.log('🛑 Voice interruption detected:', cleanTranscript);

        if (cleanTranscript.length > 3) { // Only interrupt for meaningful speech
          handleVoiceInterruption(cleanTranscript);
        }
      });

      if (!success) {
        console.warn('Failed to start passive listening');
        setIsPassiveListening(false);
      }
    } catch (error) {
      console.error('Passive listening error:', error);
      setIsPassiveListening(false);
    }
  }, [voiceHook, isPassiveListening, safeSpeech.isSpeaking]);

  // Stop passive listening
  const stopPassiveListening = useCallback(() => {
    if (isPassiveListening) {
      console.log('🎧 Stopping passive listening');
      voiceHook.stopListening();
      setIsPassiveListening(false);
    }

    if (passiveListeningTimeoutRef.current) {
      clearTimeout(passiveListeningTimeoutRef.current);
      passiveListeningTimeoutRef.current = null;
    }
  }, [isPassiveListening, voiceHook]);

  // Enhanced voice interruption handler
  const handleVoiceInterruption = useCallback((transcript?: string) => {
    console.log('🛑 Voice interruption triggered');

    // Immediately stop AI speaking using safeSpeech
    safeSpeech.interruptSpeech();

    // Clear speech state
    setCurrentSpeechText("");

    // Stop passive listening
    stopPassiveListening();

    // If we have a meaningful transcript, process it as a message
    if (transcript && transcript.trim().length > 3) {
      console.log('📝 Processing interrupted speech as message:', transcript);
      handleSendMessage(transcript);
    } else {
      // If no transcript or unclear speech, just wait for user input
      console.log('⏳ Waiting for user input after interruption');
    }

  }, [safeSpeech, stopPassiveListening]);

  // Manual stop speaking function
  const handleStopSpeaking = useCallback(() => {
    console.log('🛑 Manual stop speaking requested');
    safeSpeech.interruptSpeech();
    setCurrentSpeechText("");
    stopPassiveListening();
  }, [safeSpeech, stopPassiveListening]);

  // Enhanced send message function with FIXED analytics extraction
  const handleSendMessage = async (messageContent?: string) => {
    const content = messageContent || inputMessage.trim();
    if (!content || isLoading) return;

    // Stop any ongoing speech and listening
    handleStopSpeaking();

    console.log('Sending message with session ID:', sessionId);

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setVoiceError(null);

    try {
      const response = await fetch(`/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          text: content,
          language: language,
        }),
      });

      console.log('API Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error details:', errorData);
        throw new Error(`API Error: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('🔍 FULL API Response:', JSON.stringify(result, null, 2));

      // FIXED: Extract AI response text - handle multiple possible response formats
      const aiResponseText = result.message?.text || 
                            result.response || 
                            result.text || 
                            result.message || 
                            "I received your message but couldn't generate a response.";

      // FIXED: Extract analytics data - handle multiple possible formats
      let anxietyLevel = null;
      let anxietyTriggers = [];
      let stressFactors = [];

      // Try different possible structures for analytics data
      const analytics = result.analytics || 
                       result.message?.analytics || 
                       result.analysis || 
                       result.anxietyAnalysis || 
                       {};

      console.log('🧠 Analytics data found:', JSON.stringify(analytics, null, 2));

      if (analytics) {
        // Extract anxiety level
        anxietyLevel = analytics?.anxietyLevel ?? null;

        // Extract triggers
        anxietyTriggers = analytics?.triggers ?? [];

        // Extract stress factors
        stressFactors = analytics?.stressFactors ?? [];

        console.log('🎯 Extracted Analytics:', {
          anxietyLevel,
          anxietyTriggers,
          stressFactors
        });
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponseText,
        sender: 'ai',
        timestamp: new Date(),
        anxietyLevel: anxietyLevel,
        anxietyTriggers: anxietyTriggers,
        stressFactors: stressFactors,
      };

      console.log('💬 Final AI Message with Analytics:', JSON.stringify({
        content: aiMessage.content.substring(0, 100) + '...',
        anxietyLevel: aiMessage.anxietyLevel,
        anxietyTriggers: aiMessage.anxietyTriggers,
        stressFactors: aiMessage.stressFactors
      }, null, 2));

      setMessages(prev => [...prev, aiMessage]);

      // Speak AI response with interruption enabled
      if (aiResponseText) {
        setTimeout(() => {
          speakWithInterruption(aiResponseText);
        }, 500);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setVoiceError(`Connection error: ${error.message}`);

      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: "Sorry, I'm having trouble connecting right now. Please try again.",
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Manual voice recording (when user wants to speak without interrupting)
  const handleVoiceToggle = async () => {
    try {
      console.log('🎤 Manual voice toggle clicked');

      if (voiceHook.isListening && !isPassiveListening) {
        // Stop manual listening
        console.log('Stopping manual voice recording...');
        voiceHook.stopListening();
        setVoiceError(null);
      } else {
        // Stop AI if speaking
        if (safeSpeech.isSpeaking) {
          handleStopSpeaking();
        }

        if (!voiceHook.speechSupported) {
          setVoiceError('Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
          return;
        }

        console.log('Starting manual voice recording...');
        setVoiceError(null);

        const success = await voiceHook.listen((transcript) => {
          console.log('Manual voice input complete:', transcript);
          handleSendMessage(transcript);
        });

        if (!success) {
          setVoiceError('Failed to start voice recognition. Please check microphone permissions.');
        }
      }
    } catch (error) {
      setVoiceError(`Voice recognition error: ${error.message}`);
      console.error('Voice toggle error:', error);
    }
  };

  // Monitor when AI finishes speaking to restart passive listening if needed
  useEffect(() => {
    if (!safeSpeech.isSpeaking && isPassiveListening) {
      // AI finished speaking, stop passive listening
      stopPassiveListening();
    }
  }, [safeSpeech.isSpeaking, isPassiveListening, stopPassiveListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPassiveListening();
      if (voiceInterruptionTimeoutRef.current) {
        clearTimeout(voiceInterruptionTimeoutRef.current);
      }
    };
  }, [stopPassiveListening]);

  // Language options
  const languageOptions = [
    { value: 'en', label: 'English (Vanessa)', flag: '🇬🇧' },
    { value: 'es', label: 'Español (Mónica)', flag: '🇪🇸' },
    { value: 'pt', label: 'Português (Luciana)', flag: '🇧🇷' },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white shadow-sm border-b">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-lg">🧘</span>
          </div>
          <div>
            <h1 className="font-semibold text-gray-800">Anxiety Guardian</h1>
            <p className="text-sm text-gray-500">Your AI Therapy Companion</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Language Selector */}
          <Select value={language} onValueChange={(value: SupportedLanguage) => setLanguage(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languageOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center space-x-2">
                    <span>{option.flag}</span>
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* ENHANCED: Prominent Stop Speaking Button */}
          {safeSpeech.isSpeaking && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={handleStopSpeaking}
                    className="bg-red-500 hover:bg-red-600 text-white animate-pulse px-6 py-2 font-semibold"
                  >
                    <StopCircle className="w-5 h-5 mr-2" />
                    Stop AI
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Stop AI Speaking - Then You Can Talk</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Voice Status Indicator */}
          {isPassiveListening && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span>Listening for interruption</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>I'm listening - start speaking to interrupt me!</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Settings */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-700">Voice Settings</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(false)}
            >
              <Check className="w-4 h-4" />
            </Button>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            <p>Current Voice: {languageOptions.find(l => l.value === language)?.label}</p>
            <p>Voice Support: {voiceHook.speechSupported ? '✅ Supported' : '❌ Not Supported'}</p>
            <p>Voice Ready: {voiceHook.ready ? '✅ Ready' : '⏳ Loading...'}</p>
            <p>Manual Listening: {(voiceHook.isListening && !isPassiveListening) ? '🎤 Active' : '⏸️ Ready'}</p>
            <p>AI Speaking: {safeSpeech.isSpeaking ? '🔊 Yes' : '🔇 No'}</p>
            <p>Passive Listening: {isPassiveListening ? '🎧 Active (Interruption Ready)' : '⏸️ Inactive'}</p>
            <p>Session: {currentSession?.id ? `✅ ${currentSession.id}` : `🔧 Using fallback: ${sessionId}`}</p>
            {voiceError && (
              <p className="text-red-600 mt-1">⚠️ Error: {voiceError}</p>
            )}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl">🤝</span>
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">Welcome to Your Safe Space</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {hasInitialGreeting ? 
                "I'll introduce myself in just a moment..." :
                "I'm about to introduce myself and then we can start our conversation."
              }
            </p>
            {!currentSession?.id && (
              <p className="text-yellow-600 text-sm mt-2">
                🔧 Using fallback session for testing - session management being configured
              </p>
            )}
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <Card className={`max-w-[80%] ${
              message.sender === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white border-gray-200'
            }`}>
              <CardContent className="p-3">
                <p className="text-sm">{message.content}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs ${
                    message.sender === 'user' ? 'text-blue-100' : 'text-gray-400'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>

                  {/* FIXED: Enhanced Anxiety Analysis Display */}
                  {message.sender === 'ai' && (message.anxietyLevel || (message.anxietyTriggers && message.anxietyTriggers.length > 0)) && (
                    <div className="flex flex-col items-end space-y-1 bg-gray-50 p-2 rounded-lg ml-2">
                      {message.anxietyLevel && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-gray-600">Anxiety Level:</span>
                          <span className={`text-sm font-bold px-2 py-1 rounded-full ${
                            message.anxietyLevel >= 8 ? 'bg-red-100 text-red-700' :
                            message.anxietyLevel >= 6 ? 'bg-orange-100 text-orange-700' :
                            message.anxietyLevel >= 4 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {message.anxietyLevel}/10
                          </span>
                        </div>
                      )}

                      {message.anxietyTriggers && message.anxietyTriggers.length > 0 && (
                        <div className="text-xs text-gray-600 max-w-[200px]">
                          <div className="font-bold text-gray-700 mb-1">🎯 Detected Triggers:</div>
                          <div className="flex flex-wrap gap-1">
                            {message.anxietyTriggers.map((trigger, idx) => (
                              <span key={idx} className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                                {trigger}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {message.stressFactors && message.stressFactors.length > 0 && (
                        <div className="text-xs text-gray-600 max-w-[200px]">
                          <div className="font-bold text-gray-700 mb-1">📊 Stress Factors:</div>
                          {message.stressFactors.map((factor, idx) => (
                            <div key={idx} className="flex justify-between items-center mb-1 bg-gray-100 px-2 py-1 rounded">
                              <span className="truncate text-xs">{factor.factor}</span>
                              <span className={`ml-2 text-xs font-bold ${
                                factor.severity >= 8 ? 'text-red-600' :
                                factor.severity >= 6 ? 'text-orange-600' :
                                factor.severity >= 4 ? 'text-yellow-600' :
                                'text-green-600'
                              }`}>
                                {factor.severity}/10
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <Card className="bg-white border-gray-200">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t">
        {/* ENHANCED: Voice Status Display */}
        {safeSpeech.isSpeaking && (
          <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700 font-medium">AI is speaking...</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-blue-600">
                {isPassiveListening && (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span>Start talking to interrupt</span>
                  </>
                )}
              </div>
            </div>

            {/* Show current speech content preview */}
            {currentSpeechText && (
              <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                <p className="text-xs text-gray-600 font-medium mb-1">Currently speaking:</p>
                <p className="text-sm text-gray-700 line-clamp-2">
                  {currentSpeechText.length > 100 
                    ? currentSpeechText.substring(0, 100) + "..." 
                    : currentSpeechText
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {(voiceHook.isListening && !isPassiveListening) && (
          <div className="mb-3 p-2 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-red-700 font-medium">Recording your voice...</span>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          {/* ENHANCED: Manual Voice Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleVoiceToggle}
                  disabled={isLoading || isPassiveListening}
                  className={`${
                    (voiceHook.isListening && !isPassiveListening)
                      ? 'bg-red-100 text-red-600 animate-pulse' 
                      : 'hover:bg-blue-50'
                  }`}
                >
                  {(voiceHook.isListening && !isPassiveListening) ? (
                    <Square className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {(voiceHook.isListening && !isPassiveListening) ? 'Stop Recording' : 'Start Manual Voice Input'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Text Input */}
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                safeSpeech.isSpeaking 
                  ? "AI is speaking - start talking to interrupt or type here..."
                  : "Type your message or use voice..."
              }
              disabled={isLoading || (voiceHook.isListening && !isPassiveListening)}
              className="pr-12"
            />

            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2"
              disabled
            >
              <Paperclip className="w-4 h-4 text-gray-400" />
            </Button>
          </div>

          {/* Send Button */}
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isLoading || (voiceHook.isListening && !isPassiveListening)}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* ENHANCED: Instructions and Status */}
        <div className="mt-3 space-y-2">
          {safeSpeech.isSpeaking && isPassiveListening && (
            <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-700 text-center font-medium">
                💬 I'm speaking and listening - start talking anytime to interrupt me, or click the red "Stop AI" button
              </p>
            </div>
          )}

          {!safeSpeech.isSpeaking && !voiceHook.isListening && (
            <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-600 text-center">
                💡 Ready for your input - type a message or click the microphone to speak
              </p>
            </div>
          )}
        </div>

        {/* Voice Errors */}
        {voiceError && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-red-500">⚠️</span>
              <div>
                <p className="text-sm font-medium text-red-800">Voice Recognition Issue</p>
                <p className="text-sm text-red-600">{voiceError}</p>
                <button 
                  onClick={() => setVoiceError(null)}
                  className="text-xs text-red-500 underline mt-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Browser Compatibility Warning */}
        {!voiceHook.speechSupported && (
          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-yellow-500">🔊</span>
              <div>
                <p className="text-sm font-medium text-yellow-800">Voice Features Limited</p>
                <p className="text-sm text-yellow-600">
                  For full voice support, please use Chrome, Edge, or Safari browser.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* DEBUGGING: Show Last API Response */}
        {showSettings && messages.length > 0 && (
          <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="text-xs">
              <p className="font-bold text-purple-800 mb-2">🔍 Debug Info (Last AI Message):</p>
              {(() => {
                const lastAiMessage = messages.filter(m => m.sender === 'ai').pop();
                if (!lastAiMessage) return <p>No AI messages yet</p>;

                return (
                  <div className="space-y-1 text-purple-700">
                    <p><strong>Anxiety Level:</strong> {lastAiMessage.anxietyLevel || 'Not detected'}</p>
                    <p><strong>Triggers:</strong> {lastAiMessage.anxietyTriggers?.length ? lastAiMessage.anxietyTriggers.join(', ') : 'None detected'}</p>
                    <p><strong>Stress Factors:</strong> {lastAiMessage.stressFactors?.length ? lastAiMessage.stressFactors.length + ' factors' : 'None detected'}</p>
                    <p><strong>Speech State:</strong> {safeSpeech.isSpeaking ? '🔊 Speaking' : '🔇 Silent'}</p>
                    <p><strong>Recognition State:</strong> {voiceHook.isListening ? '🎤 Listening' : '⏸️ Stopped'}</p>
                    {currentSpeechText && (
                      <p><strong>Current Speech:</strong> {currentSpeechText.substring(0, 100)}...</p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;