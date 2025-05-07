import { useState, useEffect, useCallback, useRef } from 'react';

// Define SpeechRecognition interfaces for TypeScript
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  onstart: () => void;
}

// Create type for SpeechRecognition constructor
interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

// Define options for the hook
interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string) => void;
  onListeningChange?: (listening: boolean) => boolean | void;
  onProcessingChange?: (processing: boolean) => void;
  onAudioLevelChange?: (level: number) => void;
  onSpeechDetected?: () => void; // New callback for when speech is first detected
  language?: string;
  silenceThreshold?: number; // Threshold for considering audio as silence
  silenceTimeout?: number; // How long silence should last before stopping (ms)
  minSpeechLevel?: number; // Minimum level to consider as speech
}

export const useSpeechRecognition = (options: UseSpeechRecognitionOptions = {}) => {
  const {
    onResult,
    onListeningChange,
    onProcessingChange,
    onAudioLevelChange,
    onSpeechDetected,
    language = 'ar-EG',
    silenceThreshold = 0.05,
    silenceTimeout = 800,
    minSpeechLevel = 0.1,
  } = options;

  // States
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [hasSpeechBeenDetected, setHasSpeechBeenDetected] = useState(false);
  
  // References
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const initAttemptRef = useRef<number>(0);
  const maxInitAttempts = 3;
  const lastAudioLevelTimestampRef = useRef<number>(Date.now());
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speechDetectedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const volumeHistoryRef = useRef<number[]>([]);
  
  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setHasSpeechBeenDetected(false);
  }, []);

  // Initialize audio context for level detection
  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        if (!mediaStreamRef.current) {
          console.log("🎤 Requesting microphone access...");
          mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            } 
          });
          console.log("🎤 Audio input started. Microphone access granted!");
        }
        
        const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        source.connect(analyserRef.current);
        console.log("✅ Audio analyzer set up successfully");
      } catch (err) {
        console.error('❌ Error initializing audio context:', err);
      }
    }
  }, []);

  // Measure audio level with enhanced detection
  const measureAudioLevel = useCallback(() => {
    if (!analyserRef.current || !isListening) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    
    // Normalize to 0-1
    const normalizedValue = Math.min(average / 128, 1);
    setAudioLevel(normalizedValue);
    
    // Keep a small history of volume levels for smoother detection
    volumeHistoryRef.current.push(normalizedValue);
    if (volumeHistoryRef.current.length > 5) {
      volumeHistoryRef.current.shift();
    }
    
    // Calculate average of recent volume levels
    const recentAverage = volumeHistoryRef.current.reduce((a, b) => a + b, 0) / volumeHistoryRef.current.length;
    
    // Detect speech vs silence
    if (recentAverage > minSpeechLevel && !hasSpeechBeenDetected) {
      console.log(`🔊 Speech detected! Level: ${recentAverage.toFixed(2)}`);
      setHasSpeechBeenDetected(true);
      lastAudioLevelTimestampRef.current = Date.now();
      
      // Trigger speech detected callback after a short confirmation period
      if (speechDetectedTimeoutRef.current) {
        clearTimeout(speechDetectedTimeoutRef.current);
      }
      
      speechDetectedTimeoutRef.current = setTimeout(() => {
        if (onSpeechDetected && recentAverage > minSpeechLevel) {
          onSpeechDetected();
        }
      }, 150); // Short delay to confirm it's not just a spike
      
    } else if (recentAverage > silenceThreshold) {
      // Still getting audio, reset silence timestamp
      lastAudioLevelTimestampRef.current = Date.now();
      
      // Clear any existing silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    } else if (hasSpeechBeenDetected) {
      // Check if we've been silent for too long
      const timeSinceLastSound = Date.now() - lastAudioLevelTimestampRef.current;
      if (timeSinceLastSound > 300 && !silenceTimeoutRef.current) {
        // Start silence timeout
        silenceTimeoutRef.current = setTimeout(() => {
          if (isListening) {
            console.log(`🔇 Silence detected for ${silenceTimeout}ms, stopping listening`);
            stopListening();
          }
          silenceTimeoutRef.current = null;
        }, silenceTimeout);
      }
    }
    
    // Log audio level periodically (but not too often)
    if (Math.random() < 0.01) {
      console.log(`📊 Audio level: ${normalizedValue.toFixed(2)}, Recent avg: ${recentAverage.toFixed(2)}`);
    }
    
    // Callback for audio level
    if (onAudioLevelChange) {
      onAudioLevelChange(normalizedValue);
    }
    
    animationFrameRef.current = requestAnimationFrame(measureAudioLevel);
  }, [isListening, onAudioLevelChange, hasSpeechBeenDetected, minSpeechLevel, silenceThreshold, silenceTimeout, onSpeechDetected]);

  // Initialize speech recognition
  const initRecognition = useCallback(() => {
    // Check for browser support
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setError(new Error('Speech recognition not supported in this browser.'));
      return false;
    }
    
    // Create a recognition instance if it doesn't exist
    if (!recognitionRef.current) {
      // Get the appropriate SpeechRecognition constructor
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || 
                                  (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognitionAPI) {
        console.error("❌ SpeechRecognition API not available");
        setError(new Error('Speech recognition API not available.'));
        return false;
      }
      
      console.log("🎤 Initializing speech recognition...");
      recognitionRef.current = new SpeechRecognitionAPI();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language;
      
      recognitionRef.current.onstart = () => {
        console.log("🎤 Speech recognition started");
        setIsListening(true);
        setError(null);
        if (onListeningChange) {
          onListeningChange(true);
        }
      };
      
      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        
        if (event.error === 'no-speech') {
          // No speech detected, not really an error
          setError(null);
        } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError(new Error(`Microphone access denied: ${event.error}`));
        } else if (event.error === 'aborted') {
          // Aborted error is often temporary, so we'll just set a minimal error
          setError(new Error(`Speech recognition error: ${event.error}`));
        } else {
          setError(new Error(`Speech recognition error: ${event.error}`));
        }
      };
      
      recognitionRef.current.onend = () => {
        console.log("🎤 Speech recognition ended");
        setIsListening(false);
        if (onListeningChange) {
          onListeningChange(false);
        }
      };
      
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            setIsProcessing(true);
            console.log("🔊 Final transcript:", finalTranscript);
            if (onProcessingChange) {
              onProcessingChange(true);
            }
          } else {
            interimTranscript += transcript;
          }
        }
        
        const currentTranscript = finalTranscript || interimTranscript;
        setTranscript(currentTranscript);
        
        if (finalTranscript && onResult) {
          // Submit final transcript to callback
          console.log("✅ Sending transcript to processing:", finalTranscript);
          onResult(finalTranscript);
          
          // Reset after processing
          setTimeout(() => {
            setIsProcessing(false);
            if (onProcessingChange) {
              onProcessingChange(false);
            }
          }, 500);
        }
      };
    }
    
    return true;
  }, [language, onListeningChange, onProcessingChange, onResult]);

  // Start listening with retry mechanism
  const startListening = useCallback(async () => {
    try {
      console.log("🎤 Starting speech recognition and audio monitoring...");
      
      // Reset speech detection state
      setHasSpeechBeenDetected(false);
      volumeHistoryRef.current = [];
      
      // Clear any existing timeouts
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      
      if (!initRecognition()) {
        console.error("❌ Failed to initialize speech recognition");
        
        // Attempt to reinitialize if under the max attempts
        if (initAttemptRef.current < maxInitAttempts) {
          initAttemptRef.current++;
          console.log(`🔄 Retry attempt ${initAttemptRef.current}/${maxInitAttempts}`);
          
          // Try to re-init recognition after a delay
          setTimeout(() => {
            if (initRecognition()) {
              startListening();
            }
          }, 1000);
        }
        return;
      }
      
      // Initialize audio context for level detection
      await initAudioContext();
      
      // Start recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          console.log("🎤 Speech recognition actively listening");
          
          // Start measuring audio level
          measureAudioLevel();
        } catch (err) {
          console.error("❌ Error starting speech recognition:", err);
          
          // If recognition is already started, stop it and restart
          if (err instanceof DOMException && err.name === 'InvalidStateError') {
            recognitionRef.current.stop();
            setTimeout(() => {
              if (recognitionRef.current) {
                recognitionRef.current.start();
                console.log("🔄 Restarted speech recognition after InvalidStateError");
              }
            }, 300);
          }
        }
      }
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setError(err instanceof Error ? err : new Error('Failed to start speech recognition'));
    }
  }, [initRecognition, initAudioContext, measureAudioLevel]);

  // Stop listening
  const stopListening = useCallback(() => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        console.log("🛑 Speech recognition stopped");
      }
      
      // Stop measuring audio level
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Clear all timeouts
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      
      if (speechDetectedTimeoutRef.current) {
        clearTimeout(speechDetectedTimeoutRef.current);
      }
      
      setAudioLevel(0);
      setHasSpeechBeenDetected(false);
    } catch (err) {
      console.error('Error stopping speech recognition:', err);
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          // Ignore errors on cleanup
        }
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      
      if (speechDetectedTimeoutRef.current) {
        clearTimeout(speechDetectedTimeoutRef.current);
      }
      
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    isProcessing,
    audioLevel,
    error,
    hasSpeechBeenDetected
  };
};
