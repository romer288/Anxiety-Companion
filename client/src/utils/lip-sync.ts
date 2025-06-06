/**
 * Lip Sync Utility for Avatar Animation
 * Analyzes audio data and converts it to mouth movement parameters
 */

export interface LipSyncData {
  mouthOpenness: number; // 0-1, how open the mouth should be
  mouthWidth: number; // 0-1, how wide the mouth should be
  amplitude: number; // 0-1, overall volume level
  frequency: number; // Dominant frequency in Hz
  phoneme: string; // Estimated phoneme (basic)
  timestamp: number;
}

export interface AudioAnalysisConfig {
  fftSize: number;
  smoothingTimeConstant: number;
  minDecibels: number;
  maxDecibels: number;
}

const DEFAULT_CONFIG: AudioAnalysisConfig = {
  fftSize: 512,
  smoothingTimeConstant: 0.8,
  minDecibels: -90,
  maxDecibels: -10
};

// Frequency ranges for different speech sounds
const FREQUENCY_RANGES = {
  vowels: { min: 300, max: 3000 }, // Most vowel formants
  consonants: { min: 2000, max: 8000 }, // Fricatives and plosives
  low: { min: 0, max: 500 }, // Bass/fundamental
  mid: { min: 500, max: 2000 }, // Mid-range speech
  high: { min: 2000, max: 8000 } // High frequency content
};

// Simple phoneme estimation based on frequency content
const PHONEME_PATTERNS = {
  'A': { lowEnergy: 0.7, midEnergy: 0.8, highEnergy: 0.3, mouthShape: 'open' },
  'E': { lowEnergy: 0.6, midEnergy: 0.7, highEnergy: 0.4, mouthShape: 'mid-open' },
  'I': { lowEnergy: 0.4, midEnergy: 0.6, highEnergy: 0.6, mouthShape: 'wide' },
  'O': { lowEnergy: 0.8, midEnergy: 0.5, highEnergy: 0.2, mouthShape: 'round' },
  'U': { lowEnergy: 0.9, midEnergy: 0.4, highEnergy: 0.1, mouthShape: 'pucker' },
  'M': { lowEnergy: 0.6, midEnergy: 0.3, highEnergy: 0.1, mouthShape: 'closed' },
  'B': { lowEnergy: 0.7, midEnergy: 0.4, highEnergy: 0.2, mouthShape: 'closed' },
  'P': { lowEnergy: 0.5, midEnergy: 0.3, highEnergy: 0.4, mouthShape: 'closed' },
  'F': { lowEnergy: 0.2, midEnergy: 0.3, highEnergy: 0.8, mouthShape: 'narrow' },
  'S': { lowEnergy: 0.1, midEnergy: 0.2, highEnergy: 0.9, mouthShape: 'narrow' },
  'silence': { lowEnergy: 0.1, midEnergy: 0.1, highEnergy: 0.1, mouthShape: 'closed' }
};

export class LipSyncAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private config: AudioAnalysisConfig;
  private lastAnalysis: LipSyncData | null = null;

  constructor(config: Partial<AudioAnalysisConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the audio analysis system
   */
  public async initialize(): Promise<boolean> {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        console.warn('Web Audio API not supported');
        return false;
      }

      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();

      this.analyser.fftSize = this.config.fftSize;
      this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;
      this.analyser.minDecibels = this.config.minDecibels;
      this.analyser.maxDecibels = this.config.maxDecibels;

      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      console.log('🎵 Lip sync analyzer initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize lip sync analyzer:', error);
      return false;
    }
  }

  /**
   * Connect audio source for analysis
   */
  public connectAudioSource(audioElement: HTMLAudioElement): MediaElementAudioSourceNode | null {
    if (!this.audioContext || !this.analyser) {
      console.error('Analyzer not initialized');
      return null;
    }

    try {
      const source = this.audioContext.createMediaElementSource(audioElement);
      source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      return source;
    } catch (error) {
      console.error('Failed to connect audio source:', error);
      return null;
    }
  }

  /**
   * Analyze current audio frame and return lip sync data
   */
  public analyze(): LipSyncData {
    if (!this.analyser || !this.dataArray) {
      return this.getDefaultLipSyncData();
    }

    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray);

    // Calculate frequency ranges
    const frequencyRanges = this.calculateFrequencyRanges();

    // Estimate phoneme
    const phoneme = this.estimatePhoneme(frequencyRanges);

    // Calculate mouth parameters
    const mouthParams = this.calculateMouthParameters(frequencyRanges, phoneme);

    // Get overall amplitude
    const amplitude = this.calculateAmplitude();

    // Find dominant frequency
    const dominantFreq = this.findDominantFrequency();

    const lipSyncData: LipSyncData = {
      mouthOpenness: mouthParams.openness,
      mouthWidth: mouthParams.width,
      amplitude: amplitude,
      frequency: dominantFreq,
      phoneme: phoneme,
      timestamp: Date.now()
    };

    this.lastAnalysis = lipSyncData;
    return lipSyncData;
  }

  /**
   * Calculate energy in different frequency ranges
   */
  private calculateFrequencyRanges() {
    if (!this.dataArray || !this.analyser) {
      return { low: 0, mid: 0, high: 0, vowel: 0, consonant: 0 };
    }

    const sampleRate = this.audioContext!.sampleRate;
    const binSize = sampleRate / this.config.fftSize;

    const getBinRange = (minFreq: number, maxFreq: number) => {
      const minBin = Math.floor(minFreq / binSize);
      const maxBin = Math.ceil(maxFreq / binSize);
      return { min: minBin, max: Math.min(maxBin, this.dataArray!.length) };
    };

    const calculateRangeEnergy = (minFreq: number, maxFreq: number) => {
      const range = getBinRange(minFreq, maxFreq);
      let sum = 0;
      let count = 0;

      for (let i = range.min; i < range.max; i++) {
        sum += this.dataArray![i];
        count++;
      }

      return count > 0 ? (sum / count) / 255 : 0;
    };

    return {
      low: calculateRangeEnergy(FREQUENCY_RANGES.low.min, FREQUENCY_RANGES.low.max),
      mid: calculateRangeEnergy(FREQUENCY_RANGES.mid.min, FREQUENCY_RANGES.mid.max),
      high: calculateRangeEnergy(FREQUENCY_RANGES.high.min, FREQUENCY_RANGES.high.max),
      vowel: calculateRangeEnergy(FREQUENCY_RANGES.vowels.min, FREQUENCY_RANGES.vowels.max),
      consonant: calculateRangeEnergy(FREQUENCY_RANGES.consonants.min, FREQUENCY_RANGES.consonants.max)
    };
  }

  /**
   * Estimate the current phoneme based on frequency analysis
   */
  private estimatePhoneme(ranges: any): string {
    const totalEnergy = ranges.low + ranges.mid + ranges.high;

    if (totalEnergy < 0.1) {
      return 'silence';
    }

    // Normalize energy levels
    const normalized = {
      low: ranges.low / Math.max(totalEnergy, 0.001),
      mid: ranges.mid / Math.max(totalEnergy, 0.001),
      high: ranges.high / Math.max(totalEnergy, 0.001)
    };

    // Find closest phoneme pattern
    let bestMatch = 'A';
    let bestScore = Infinity;

    for (const [phoneme, pattern] of Object.entries(PHONEME_PATTERNS)) {
      if (phoneme === 'silence') continue;

      const score = Math.abs(pattern.lowEnergy - normalized.low) +
                   Math.abs(pattern.midEnergy - normalized.mid) +
                   Math.abs(pattern.highEnergy - normalized.high);

      if (score < bestScore) {
        bestScore = score;
        bestMatch = phoneme;
      }
    }

    return bestMatch;
  }

  /**
   * Calculate mouth opening and width based on phoneme and audio data
   */
  private calculateMouthParameters(ranges: any, phoneme: string) {
    const pattern = PHONEME_PATTERNS[phoneme as keyof typeof PHONEME_PATTERNS] || PHONEME_PATTERNS['A'];
    const totalEnergy = ranges.low + ranges.mid + ranges.high;

    let openness = 0;
    let width = 0.5; // Default neutral width

    switch (pattern.mouthShape) {
      case 'open':
        openness = Math.min(totalEnergy * 1.5, 1.0);
        width = 0.6;
        break;
      case 'mid-open':
        openness = Math.min(totalEnergy * 1.2, 0.8);
        width = 0.7;
        break;
      case 'wide':
        openness = Math.min(totalEnergy * 0.8, 0.6);
        width = 0.9;
        break;
      case 'round':
        openness = Math.min(totalEnergy * 1.0, 0.7);
        width = 0.3;
        break;
      case 'pucker':
        openness = Math.min(totalEnergy * 0.6, 0.4);
        width = 0.2;
        break;
      case 'narrow':
        openness = Math.min(totalEnergy * 0.4, 0.3);
        width = 0.8;
        break;
      case 'closed':
      default:
        openness = Math.min(totalEnergy * 0.2, 0.1);
        width = 0.5;
        break;
    }

    return { openness, width };
  }

  /**
   * Calculate overall amplitude/volume
   */
  private calculateAmplitude(): number {
    if (!this.dataArray) return 0;

    const sum = this.dataArray.reduce((acc, val) => acc + val, 0);
    return (sum / this.dataArray.length) / 255;
  }

  /**
   * Find the dominant frequency in the audio
   */
  private findDominantFrequency(): number {
    if (!this.dataArray || !this.audioContext) return 0;

    let maxValue = 0;
    let maxIndex = 0;

    for (let i = 0; i < this.dataArray.length; i++) {
      if (this.dataArray[i] > maxValue) {
        maxValue = this.dataArray[i];
        maxIndex = i;
      }
    }

    const binSize = this.audioContext.sampleRate / this.config.fftSize;
    return maxIndex * binSize;
  }

  /**
   * Get default lip sync data when analysis isn't available
   */
  private getDefaultLipSyncData(): LipSyncData {
    return {
      mouthOpenness: 0,
      mouthWidth: 0.5,
      amplitude: 0,
      frequency: 0,
      phoneme: 'silence',
      timestamp: Date.now()
    };
  }

  /**
   * Get the last analysis result
   */
  public getLastAnalysis(): LipSyncData | null {
    return this.lastAnalysis;
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.dataArray = null;
    this.lastAnalysis = null;
  }
}

/**
 * Utility function to create a simple lip sync analyzer
 */
export function createLipSyncAnalyzer(config?: Partial<AudioAnalysisConfig>): LipSyncAnalyzer {
  return new LipSyncAnalyzer(config);
}

/**
 * Simple function to analyze audio blob and return basic lip sync data
 */
export async function analyzeSpeechBlob(audioBlob: Blob): Promise<LipSyncData[]> {
  return new Promise((resolve, reject) => {
    const analyzer = new LipSyncAnalyzer();
    const audio = new Audio();
    const url = URL.createObjectURL(audioBlob);

    audio.src = url;
    const results: LipSyncData[] = [];

    analyzer.initialize().then((success) => {
      if (!success) {
        reject(new Error('Failed to initialize analyzer'));
        return;
      }

      const source = analyzer.connectAudioSource(audio);
      if (!source) {
        reject(new Error('Failed to connect audio source'));
        return;
      }

      const analyzeFrame = () => {
        const data = analyzer.analyze();
        results.push(data);

        if (audio.currentTime < audio.duration) {
          requestAnimationFrame(analyzeFrame);
        } else {
          analyzer.dispose();
          URL.revokeObjectURL(url);
          resolve(results);
        }
      };

      audio.addEventListener('play', analyzeFrame);
      audio.play().catch(reject);
    });
  });
}

/**
 * Real-time lip sync for live audio streams
 */
export class RealTimeLipSync {
  private analyzer: LipSyncAnalyzer;
  private animationFrame: number | null = null;
  private isRunning = false;

  constructor(config?: Partial<AudioAnalysisConfig>) {
    this.analyzer = new LipSyncAnalyzer(config);
  }

  public async start(audioElement: HTMLAudioElement, callback: (data: LipSyncData) => void): Promise<boolean> {
    const initialized = await this.analyzer.initialize();
    if (!initialized) return false;

    const source = this.analyzer.connectAudioSource(audioElement);
    if (!source) return false;

    this.isRunning = true;

    const analyze = () => {
      if (!this.isRunning) return;

      const data = this.analyzer.analyze();
      callback(data);

      this.animationFrame = requestAnimationFrame(analyze);
    };

    analyze();
    return true;
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.analyzer.dispose();
  }
}