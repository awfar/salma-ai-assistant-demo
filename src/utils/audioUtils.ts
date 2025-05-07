
// Utility functions for audio testing and initialization

/**
 * Tests if audio output is working
 * @param force Force test even if it has been done before
 * @returns Promise that resolves to true if test was successful, false otherwise
 */
export const testAudioOutput = async (force: boolean = false): Promise<boolean> => {
  // Track if test has been run - using module-level variable instead of static
  let testRunCompleted = false;
  
  // Don't run the test more than once unless forced
  if (testRunCompleted && !force) {
    console.log("Audio test already run, skipping");
    return true;
  }
  
  try {
    // Create an AudioContext
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
      console.error("AudioContext not supported in this browser");
      return false;
    }
    
    const audioContext = new AudioContext();
    
    // Try to resume the AudioContext if it's suspended
    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch (err) {
        console.error("Failed to resume AudioContext", err);
        return false;
      }
    }
    
    // Create a short beep sound
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // 440 Hz
    
    // Create a gain node to control volume
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime); // Start very quiet
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.5); // Fade out
    
    // Connect nodes: oscillator -> gain -> destination (speakers)
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Play sound briefly
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5); // 0.5 second duration
    
    console.log("Audio test beep played");
    testRunCompleted = true;
    
    // Cleanup
    setTimeout(() => {
      audioContext.close().catch(err => console.error("Error closing AudioContext:", err));
    }, 1000);
    
    return true;
  } catch (err) {
    console.error("Audio output test failed:", err);
    return false;
  }
};

/**
 * Plays a verification sound to test audio system
 * @param silent If true, play a nearly silent sound (for background tests)
 * @returns Promise that resolves to true if sound was played, false otherwise
 */
export const playVerificationSound = async (silent: boolean = false): Promise<boolean> => {
  try {
    // Create an AudioContext
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
      console.error("AudioContext not supported in this browser");
      return false;
    }
    
    const audioContext = new AudioContext();
    
    // Try to resume the AudioContext if it's suspended
    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch (err) {
        console.error("Failed to resume AudioContext", err);
        return false;
      }
    }
    
    // Create a verification sound - either silent or audible
    if (silent) {
      // Create silent sound
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.2, audioContext.sampleRate);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      
      // Connect with very low gain
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.01; // Nearly silent
      
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      source.start();
      
      // Cleanup
      setTimeout(() => {
        audioContext.close().catch(err => console.error("Error closing AudioContext:", err));
      }, 300);
    } else {
      // Create a short ping sound
      const oscillator = audioContext.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      
      // Create a gain node for volume
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.3);
      
      // Cleanup
      setTimeout(() => {
        audioContext.close().catch(err => console.error("Error closing AudioContext:", err));
      }, 500);
    }
    
    console.log(`Verification sound played (silent: ${silent})`);
    return true;
  } catch (err) {
    console.error("Failed to play verification sound:", err);
    return false;
  }
};

/**
 * Convert a Blob to Base64
 * @param blob The blob to convert
 * @returns Promise that resolves to the base64 string
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Extract just the base64 data (remove the data URL prefix)
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
