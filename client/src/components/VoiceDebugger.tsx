import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { SupportedLanguage } from '@shared/schema';

/**
 * === Voice & Language Configuration ===
 * We now support multiple realistic female voices per language.  
 * The VOICE_PREFERENCES list is **ordered** from most‐to‑least preferred.  
 * The first voice that exists in the user's browser will be chosen.
 */

// Canonical BCP‑47 language codes we want to target
const LANGUAGE_CODES: Record<SupportedLanguage, string> = {
  en: 'en-GB',  // UK English (Vanessa - Google UK English Female)
  es: 'es-ES',  // Castilian Spanish
  pt: 'pt-BR'   // Brazilian Portuguese
};

// Ordered lists of preferred **female / natural** voices for each language
const VOICE_PREFERENCES: Record<SupportedLanguage, string[]> = {
  en: [
    'Google UK English Female',   // Chrome desktop - Vanessa
    'Microsoft Hazel',            // Edge / Windows UK female
    'Microsoft Susan',            // Edge / Windows UK female
    'Karen',                      // macOS Australian female (good alternative)
    'Serena',                     // macOS UK female
    'Daniel',                     // macOS UK male (as fallback)
    'Google US English Female',   // fallback US female
  ],
  es: [
    'Mónica',                    // Spain – natural female
    'Microsoft Mónica',          // Edge / Windows
    'Google español',            // Chrome desktop
    'Google español de Estados Unidos',
    'Microsoft Helena',          // Edge / Windows
    'Lucia'                      // macOS / iOS
  ],
  pt: [
    'Luciana',                   // Brazilian Portuguese – natural female
    'Microsoft Luciana',         // Edge / Windows
    'Google português do Brasil',
    'Microsoft Francisca',       // Edge / Windows
    'Victoria'                   // fallback female
  ]
};

// Pitch / rate presets per language (tuned for female voices)
const VOICE_SETTINGS: Record<SupportedLanguage, { pitch: number; rate: number; label: string }> = {
  en: { pitch: 1.0, rate: 1.0, label: 'Vanessa (UK English Female)' },
  es: { pitch: 1.1, rate: 0.95, label: 'Mónica (Spanish Female)' },
  pt: { pitch: 1.0, rate: 0.97, label: 'Luciana (Brazilian Female)' }
};

export default function VoiceDebugger() {
  const [status, setStatus] = useState('Not tested');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');
  const [showAllVoices, setShowAllVoices] = useState(false);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number | null>(null);

  /* ============================================================
   *  Load voices – retry a few times and listen for onvoiceschanged
   * ============================================================ */
  useEffect(() => {
    let attempts = 0;
    const max = 10;

    const tryLoad = () => {
      const voices = window.speechSynthesis?.getVoices() || [];
      if (voices.length) {
        setAvailableVoices(voices);
        console.log('🎤 VOICE DEBUGGER: Found', voices.length, 'voices');
        console.table(voices.map(v => ({ 
          Name: v.name, 
          Lang: v.lang, 
          Local: v.localService, 
          Default: v.default 
        })));
      } else if (attempts < max) {
        attempts += 1;
        setTimeout(tryLoad, 500);
      } else {
        setStatus('Failed to load voices');
      }
    };

    tryLoad();
    window.speechSynthesis && (window.speechSynthesis.onvoiceschanged = tryLoad);
    return () => {
      window.speechSynthesis && (window.speechSynthesis.onvoiceschanged = null);
    };
  }, []);

  /* ====================
   *  Utility functions
   * ==================== */

  // Pick the first available preferred voice; fall back gracefully
  const selectVoice = (lang: SupportedLanguage): SpeechSynthesisVoice | null => {
    if (!availableVoices.length) return null;

    console.log(`🔍 VOICE SELECTION for ${lang}:`);
    console.log('Available voices:', availableVoices.map(v => `${v.name} (${v.lang})`));
    console.log('Preferred voices:', VOICE_PREFERENCES[lang]);

    // 1) Check ordered preferences
    for (const preferred of VOICE_PREFERENCES[lang]) {
      const match = availableVoices.find(v => 
        v.name.toLowerCase().includes(preferred.toLowerCase()) ||
        v.name === preferred
      );
      if (match) {
        console.log(`✅ FOUND PREFERRED: ${match.name} (${match.lang})`);
        return match;
      }
    }

    // 2) Exact language code (e.g. en-GB)
    const exactLang = availableVoices.find(v => v.lang === LANGUAGE_CODES[lang]);
    if (exactLang) {
      console.log(`✅ FOUND EXACT LANG: ${exactLang.name} (${exactLang.lang})`);
      return exactLang;
    }

    // 3) Any voice starting with the language prefix (e.g. "en")
    const prefix = LANGUAGE_CODES[lang].split('-')[0];
    const prefixMatch = availableVoices.find(v => v.lang.startsWith(prefix));
    if (prefixMatch) {
      console.log(`✅ FOUND PREFIX MATCH: ${prefixMatch.name} (${prefixMatch.lang})`);
      return prefixMatch;
    }

    // 4) Fallback to first voice in list
    console.log(`⚠️ USING FALLBACK: ${availableVoices[0]?.name}`);
    return availableVoices[0];
  };

  const cancelSpeech = () => window.speechSynthesis?.cancel();

  // Get voices filtered by language
  const getVoicesForLanguage = (lang: SupportedLanguage) => {
    const prefix = LANGUAGE_CODES[lang].split('-')[0];
    return availableVoices.filter(v => 
      v.lang.startsWith(prefix) || 
      VOICE_PREFERENCES[lang].some(pref => v.name.toLowerCase().includes(pref.toLowerCase()))
    );
  };

  /* ================
   *  Test functions
   * ================ */
  const testVoice = (lang: SupportedLanguage, specificVoice?: SpeechSynthesisVoice) => {
    if (!window.speechSynthesis) return setStatus('Speech synthesis not supported');

    cancelSpeech();

    const phrases: Record<SupportedLanguage, string> = {
      en: 'Hello, I am Vanessa, your UK English voice assistant. How do I sound?',
      es: 'Hola, soy Mónica, tu asistente de voz en español. ¿Cómo sueno?',
      pt: 'Olá, eu sou Luciana, sua assistente de voz em português brasileiro. Como eu soo?'
    };

    const voice = specificVoice || selectVoice(lang);
    const settings = VOICE_SETTINGS[lang];

    const utterance = new SpeechSynthesisUtterance(phrases[lang]);
    utterance.lang = LANGUAGE_CODES[lang];
    utterance.pitch = settings.pitch;
    utterance.rate = settings.rate;
    if (voice) utterance.voice = voice;

    console.log(`🔊 TESTING VOICE:`, {
      name: voice?.name || 'default',
      lang: voice?.lang || 'default',
      pitch: settings.pitch,
      rate: settings.rate,
      text: phrases[lang]
    });

    utterance.onstart = () => setStatus(`${voice?.name || 'default'} started`);
    utterance.onend = () => setStatus(`${voice?.name || 'default'} finished`);
    utterance.onerror = e => setStatus(`Error: ${e.error}`);

    window.speechSynthesis.speak(utterance);
  };

  const testSpecificVoice = (voice: SpeechSynthesisVoice) => {
    if (!window.speechSynthesis) return;

    cancelSpeech();

    const utterance = new SpeechSynthesisUtterance(
      `Hello, this is ${voice.name} speaking in ${voice.lang}.`
    );
    utterance.voice = voice;
    utterance.pitch = 1.0;
    utterance.rate = 1.0;

    utterance.onstart = () => setStatus(`Testing ${voice.name}...`);
    utterance.onend = () => setStatus(`${voice.name} test finished`);
    utterance.onerror = e => setStatus(`Error with ${voice.name}: ${e.error}`);

    window.speechSynthesis.speak(utterance);
  };

  const logSystemInfo = () => {
    console.log('🎤 COMPLETE VOICE SYSTEM INFO:');
    console.table(
      availableVoices.map(v => ({ 
        Name: v.name, 
        Lang: v.lang, 
        Local: v.localService, 
        Default: v.default,
        URI: v.voiceURI
      }))
    );

    console.log('🎯 VOICE SELECTION RESULTS:');
    (['en', 'es', 'pt'] as SupportedLanguage[]).forEach(lang => {
      const selected = selectVoice(lang);
      console.log(`${lang.toUpperCase()}: ${selected?.name || 'None'} (${selected?.lang || 'N/A'})`);
    });

    setStatus(`Logged ${availableVoices.length} voices to console`);
  };

  /* ==============
   *  Render UI
   * ============== */
  return (
    <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white max-w-4xl">
      <h2 className="text-xl font-semibold mb-4">🎤 Voice System Debugger</h2>

      <div className="mb-4 p-3 bg-gray-50 rounded-md border">
        <p className="font-medium">Status: <span className="text-blue-600">{status}</span></p>
        <p className="text-sm text-gray-600 mt-1">
          Detected voices: {availableVoices.length} | 
          Browser: {navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                   navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                   navigator.userAgent.includes('Safari') ? 'Safari' : 
                   navigator.userAgent.includes('Edge') ? 'Edge' : 'Other'}
        </p>
      </div>

      {/* Language selector */}
      <div className="flex gap-2 mb-4">
        {(['en', 'es', 'pt'] as SupportedLanguage[]).map(lang => (
          <Button
            key={lang}
            variant={currentLanguage === lang ? 'default' : 'outline'}
            onClick={() => setCurrentLanguage(lang)}
          >
            {lang === 'en' ? 'English (Vanessa)' : 
             lang === 'es' ? 'Spanish (Mónica)' : 
             'Portuguese (Luciana)'}
          </Button>
        ))}
      </div>

      <div className="grid gap-2 mb-4">
        <Button onClick={() => testVoice(currentLanguage)}>
          Test {VOICE_SETTINGS[currentLanguage].label}
        </Button>
        <Button variant="outline" onClick={cancelSpeech}>Stop All Speech</Button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <Button variant="secondary" onClick={logSystemInfo}>
          Log Voice Info to Console
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setShowAllVoices(!showAllVoices)}
        >
          {showAllVoices ? 'Hide' : 'Show'} All Voices
        </Button>
      </div>

      {/* Current selections */}
      <div className="mb-6">
        <h3 className="text-md font-medium mb-2">🎯 Currently Selected Voices</h3>
        <div className="grid gap-2">
          {(['en', 'es', 'pt'] as SupportedLanguage[]).map(lang => {
            const voice = selectVoice(lang);
            const isConsistent = voice?.name === VOICE_PREFERENCES[lang][0];
            return (
              <div key={lang} className={`p-2 rounded border ${isConsistent ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-semibold capitalize">{lang}:</span> 
                    <span className="ml-2">{voice ? `${voice.name} (${voice.lang})` : 'none available'}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => testVoice(lang)}
                    >
                      Test
                    </Button>
                    {!isConsistent && (
                      <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                        Not preferred
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Language-specific voices */}
      <div className="mb-6">
        <h3 className="text-md font-medium mb-2">
          🎭 Available {currentLanguage.toUpperCase()} Voices ({getVoicesForLanguage(currentLanguage).length})
        </h3>
        <div className="max-h-40 overflow-y-auto border rounded p-2">
          {getVoicesForLanguage(currentLanguage).map((voice, index) => {
            const isPreferred = VOICE_PREFERENCES[currentLanguage].some(pref => 
              voice.name.toLowerCase().includes(pref.toLowerCase())
            );
            return (
              <div key={index} className={`flex justify-between items-center p-2 border-b ${isPreferred ? 'bg-blue-50' : ''}`}>
                <div className="flex-1">
                  <span className="font-medium">{voice.name}</span>
                  <span className="text-sm text-gray-600 ml-2">({voice.lang})</span>
                  {isPreferred && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded ml-2">Preferred</span>}
                  {voice.default && <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded ml-2">Default</span>}
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => testSpecificVoice(voice)}
                >
                  Test
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* All voices table */}
      {showAllVoices && (
        <div>
          <h3 className="text-md font-medium mb-2">🗂️ All Available Voices ({availableVoices.length})</h3>
          <div className="max-h-60 overflow-y-auto border rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Language</th>
                  <th className="text-left p-2">Local</th>
                  <th className="text-left p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {availableVoices.map((voice, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{voice.name}</td>
                    <td className="p-2">{voice.lang}</td>
                    <td className="p-2">{voice.localService ? '✅' : '❌'}</td>
                    <td className="p-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testSpecificVoice(voice)}
                      >
                        Test
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Consistency check */}
      <div className="mt-6 p-3 bg-blue-50 rounded border border-blue-200">
        <h4 className="font-medium text-blue-800 mb-2">🔧 Voice Consistency Check</h4>
        <p className="text-sm text-blue-700">
          This debugger uses the same voice selection logic as your main application. 
          The voices selected here should match what you hear in the chat interface.
        </p>
        <p className="text-xs text-blue-600 mt-2">
          If voices sound different, check browser settings or try a different browser.
          Chrome generally has the best voice quality.
        </p>
      </div>
    </div>
  );
}