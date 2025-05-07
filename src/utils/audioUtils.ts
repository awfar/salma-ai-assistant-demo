
/**
 * Utilities for audio processing and analysis
 */

/**
 * Convert a Blob to Base64 string
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // استخلاص البيانات من الـ data URL
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Handle audio level analysis from an audio stream
 */
export const setupAudioLevelAnalysis = () => {
  const audioContextRef = { current: null as AudioContext | null };
  const analyserRef = { current: null as AnalyserNode | null };
  const animationFrameRef = { current: null as number | null };
  
  // Initialize audio context and analyzer
  const initializeAnalyzer = (stream: MediaStream) => {
    try {
      // Create AudioContext for analyzing audio level
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      // Create AnalyserNode for measuring audio level
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      
      // Connect audio source to analyzer
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      return { audioContext, analyser };
    } catch (error) {
      console.error("Error initializing audio analyzer:", error);
      return { audioContext: null, analyser: null };
    }
  };
  
  // Analyze audio levels from the stream
  const analyzeAudio = (
    callback: (level: number) => void
  ) => {
    if (!analyserRef.current) return;
    
    try {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average audio level
      let sum = 0;
      for (const value of dataArray) {
        sum += value;
      }
      const avg = sum / dataArray.length;
      
      // Normalize level between 0 and 1
      const normalizedLevel = Math.min(1, avg / 128);
      callback(normalizedLevel);
      
      animationFrameRef.current = requestAnimationFrame(() => analyzeAudio(callback));
    } catch (error) {
      console.error("Error analyzing audio:", error);
      callback(0);
    }
  };
  
  // Cleanup resources
  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
        audioContextRef.current = null;
        analyserRef.current = null;
      } catch (e) {
        console.error('Error closing audio context:', e);
      }
    }
  };
  
  return {
    initializeAnalyzer,
    analyzeAudio,
    cleanup,
    refs: { audioContextRef, analyserRef, animationFrameRef }
  };
};

// Test audio output
export const testAudioOutput = async (): Promise<boolean> => {
  try {
    // Create a short beep sound to test audio output
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Low volume
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Start and stop a short beep
    oscillator.start();
    
    // Stop after 100ms
    await new Promise(resolve => setTimeout(resolve, 100));
    oscillator.stop();
    
    // Clean up
    await audioContext.close();
    
    return true;
  } catch (error) {
    console.error("Error testing audio output:", error);
    return false;
  }
};
