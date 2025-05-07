
/**
 * Voice recorder utility for push-to-talk functionality
 */

// Configuration
const DEFAULT_SAMPLE_RATE = 48000;
const DEFAULT_CHANNELS = 1;

// Types
interface RecorderOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  onDataAvailable?: (blob: Blob) => void;
  onAudioLevel?: (level: number) => void;
}

export interface VoiceRecorderInterface {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
  isRecording: () => boolean;
  cancelRecording: () => void;
  getAudioLevel: () => number;
}

// Create and return a voice recorder
export function createVoiceRecorder(options: RecorderOptions = {}): VoiceRecorderInterface {
  let mediaRecorder: MediaRecorder | null = null;
  let audioContext: AudioContext | null = null;
  let mediaStream: MediaStream | null = null;
  let audioSource: MediaStreamAudioSourceNode | null = null;
  let analyser: AnalyserNode | null = null;
  let recordedChunks: Blob[] = [];
  let recording = false;
  let audioLevel = 0;
  let animationFrameId: number | null = null;

  // Check supported mime types
  const getSupportedMimeType = () => {
    const types = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav'
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log(`🎤 Using supported mime type: ${type}`);
        return type;
      }
    }
    
    console.log('🎤 Defaulting to audio/webm');
    return 'audio/webm';
  };
  
  // Preferred audio format or fallback
  const mimeType = options.mimeType || getSupportedMimeType();
  
  // Close all active media
  const closeMedia = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    
    if (audioContext) {
      if (audioSource) {
        audioSource.disconnect();
      }
      audioContext.close();
      audioContext = null;
    }
    
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
    
    mediaRecorder = null;
    recording = false;
  };

  // Get current audio level (0-1)
  const getAudioLevel = () => audioLevel;

  // Process audio to analyze volume level
  const processAudio = () => {
    if (!analyser || !recording) return;
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    
    // Normalize between 0-1 with some amplification
    audioLevel = Math.min(1, Math.pow(sum / (dataArray.length * 255), 0.8) * 2);
    
    // Send audio level callback
    if (options.onAudioLevel) {
      options.onAudioLevel(audioLevel);
    }
    
    // Continue monitoring
    animationFrameId = requestAnimationFrame(processAudio);
  };

  // Start recording
  const startRecording = async (): Promise<void> => {
    try {
      // Reset state
      recordedChunks = [];
      
      // Request media permissions
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: DEFAULT_SAMPLE_RATE,
          channelCount: DEFAULT_CHANNELS
        }
      });
      
      // Create audio context for level detection
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: DEFAULT_SAMPLE_RATE,
      });
      
      audioSource = audioContext.createMediaStreamSource(mediaStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      audioSource.connect(analyser);
      
      console.log(`🎤 Starting recording with mime type: ${mimeType}`);
      
      // Initialize recorder with options
      mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : getSupportedMimeType(),
        audioBitsPerSecond: options.audioBitsPerSecond || 128000
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
          
          // Optional callback for streaming data
          if (options.onDataAvailable) {
            options.onDataAvailable(event.data);
          }
        }
      };
      
      console.log(`🎤 MediaRecorder created with mimeType: ${mediaRecorder.mimeType}`);
      
      // Start the recording
      mediaRecorder.start(1000); // Capture in 1-second chunks
      recording = true;
      
      // Start audio level monitoring
      processAudio();
      
    } catch (error) {
      console.error('Error starting recording:', error);
      closeMedia();
      throw error;
    }
  };

  // Stop recording and return audio blob
  const stopRecording = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorder || !recording) {
        reject(new Error('Recording not active'));
        return;
      }
      
      mediaRecorder.onstop = () => {
        try {
          // Create blob from recorded chunks
          let finalMimeType = mediaRecorder?.mimeType || 'audio/webm';
          
          // Log the recorded chunks and mime type for debugging
          console.log(`🎤 Recording stopped. Chunks: ${recordedChunks.length}, type: ${finalMimeType}`);
          
          // Ensure the mime type is compatible with Whisper API
          if (!finalMimeType.includes('webm') && 
              !finalMimeType.includes('mp3') && 
              !finalMimeType.includes('mp4') && 
              !finalMimeType.includes('wav') && 
              !finalMimeType.includes('ogg')) {
            console.log('🎤 Converting to compatible audio format: audio/webm');
            finalMimeType = 'audio/webm';
          }
          
          const blob = new Blob(recordedChunks, { type: finalMimeType });
          console.log(`🎤 Final blob created: ${blob.size} bytes, type: ${blob.type}`);
          
          closeMedia();
          resolve(blob);
        } catch (err) {
          reject(err);
        }
      };
      
      // Stop the media recorder
      try {
        mediaRecorder.stop();
      } catch (err) {
        closeMedia();
        reject(err);
      }
    });
  };

  // Cancel recording without saving
  const cancelRecording = () => {
    if (recording) {
      recordedChunks = [];
      closeMedia();
    }
  };

  // Check if currently recording
  const isRecording = () => recording;

  // Return the interface
  return {
    startRecording,
    stopRecording,
    cancelRecording,
    isRecording,
    getAudioLevel
  };
}
