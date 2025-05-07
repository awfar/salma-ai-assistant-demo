
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string) => void;
  onListeningChange?: (listening: boolean) => boolean | void;
  onProcessingChange?: (processing: boolean) => void;
  onAudioLevelChange?: (level: number) => void;
  language?: string;
}

export const useSpeechRecognition = (options: UseSpeechRecognitionOptions = {}) => {
  const {
    onResult,
    onListeningChange,
    onProcessingChange,
    onAudioLevelChange,
    language = 'ar-EG',
  } = options;

  // States
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  
  // References
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  // Initialize audio context for level detection
  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        if (!mediaStreamRef.current) {
          mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        
        const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        source.connect(analyserRef.current);
      } catch (err) {
        console.error('Error initializing audio context:', err);
      }
    }
  }, []);

  // Measure audio level
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
    
    if (onAudioLevelChange) {
      onAudioLevelChange(normalizedValue);
    }
    
    animationFrameRef.current = requestAnimationFrame(measureAudioLevel);
  }, [isListening, onAudioLevelChange]);

  // Initialize speech recognition
  const initRecognition = useCallback(() => {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setError(new Error('Speech recognition not supported in this browser.'));
      return false;
    }
    
    // Create a recognition instance if it doesn't exist
    if (!recognitionRef.current) {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language;
      
      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setError(null);
        if (onListeningChange) {
          onListeningChange(true);
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setError(new Error(`Speech recognition error: ${event.error}`));
        
        if (event.error === 'no-speech') {
          // No speech detected, not really an error
          setError(null);
        }
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (onListeningChange) {
          onListeningChange(false);
        }
      };
      
      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            setIsProcessing(true);
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

  // Start listening
  const startListening = useCallback(async () => {
    try {
      if (!initRecognition()) {
        return;
      }
      
      // Initialize audio context for level detection
      await initAudioContext();
      
      // Start recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
        // Start measuring audio level
        measureAudioLevel();
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
      }
      
      // Stop measuring audio level
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      setAudioLevel(0);
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
    error
  };
};
