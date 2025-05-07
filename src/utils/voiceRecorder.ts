
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
      'audio/mp4',
      'audio/ogg',
      'audio/webm;codecs=opus',
      'audio/mp3',
      'audio/mpeg'
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log(`🎤 استخدام نوع MIME المدعوم: ${type}`);
        return type;
      }
    }
    
    console.log('🎤 استخدام النوع الافتراضي audio/webm');
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
      
      // Request media permissions with explicit high quality settings for Arabic speech
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
      analyser.fftSize = 1024; // Higher resolution for better analysis
      analyser.smoothingTimeConstant = 0.8;
      audioSource.connect(analyser);
      
      console.log(`🎤 بدء التسجيل باستخدام نوع MIME: ${mimeType}`);
      
      // Test if the selected MIME type is actually supported
      const finalMimeType = MediaRecorder.isTypeSupported(mimeType) ? mimeType : getSupportedMimeType();
      console.log(`🎤 نوع MIME النهائي: ${finalMimeType}`);
      
      // Initialize recorder with options, ensuring high bit rate for Arabic speech
      mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType: finalMimeType,
        audioBitsPerSecond: options.audioBitsPerSecond || 128000
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
          console.log(`🎤 تم استلام جزء من البيانات: ${event.data.size} بايت، نوع: ${event.data.type}`);
          
          // Optional callback for streaming data
          if (options.onDataAvailable) {
            options.onDataAvailable(event.data);
          }
        }
      };
      
      console.log(`🎤 تم إنشاء MediaRecorder باستخدام نوع MIME: ${mediaRecorder.mimeType}`);
      
      // Start the recording
      mediaRecorder.start(100); // Capture in shorter chunks for more frequent data
      recording = true;
      
      // Start audio level monitoring
      processAudio();
      
    } catch (error) {
      console.error('خطأ في بدء التسجيل:', error);
      closeMedia();
      throw error;
    }
  };

  // Stop recording and return audio blob
  const stopRecording = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorder || !recording) {
        reject(new Error('التسجيل غير نشط'));
        return;
      }
      
      mediaRecorder.onstop = () => {
        try {
          // Ensure we have something recorded
          if (recordedChunks.length === 0) {
            reject(new Error('لم يتم تسجيل أي صوت'));
            closeMedia();
            return;
          }
          
          // Log the recorded chunks for debugging
          console.log(`🎤 تم إيقاف التسجيل. عدد الأجزاء: ${recordedChunks.length}، إجمالي الحجم: ${
            recordedChunks.reduce((size, chunk) => size + chunk.size, 0)
          } بايت`);
          
          // Create final blob - we want to make SURE it is in a format the backend can process
          let blob;
          const recordedMimeType = recordedChunks[0].type;
          
          // Create the blob with the detected type
          blob = new Blob(recordedChunks, { type: recordedMimeType || 'audio/mp3' });
          
          console.log(`🎤 تم إنشاء ملف نهائي: ${blob.size} بايت، نوع: ${blob.type}`);
          
          closeMedia();
          resolve(blob);
        } catch (err) {
          console.error('خطأ في إنشاء ملف صوتي:', err);
          closeMedia();
          reject(err);
        }
      };
      
      // Stop the media recorder
      try {
        mediaRecorder.stop();
      } catch (err) {
        console.error('خطأ في إيقاف مسجل الوسائط:', err);
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
