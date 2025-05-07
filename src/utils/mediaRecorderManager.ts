
/**
 * Manager for MediaRecorder operations
 */
export class MediaRecorderManager {
  mediaRecorder: MediaRecorder | null = null;
  stream: MediaStream | null = null;
  audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  
  /**
   * Request microphone access and set up media recorder
   */
  async setupMediaRecorder(): Promise<MediaStream> {
    try {
      console.log("🎤 طلب إذن الوصول إلى الميكروفون...");
      
      // Ensure we're requesting mic permission on user interaction
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      this.stream = stream;
      console.log("✅ تم الحصول على إذن الوصول إلى الميكروفون");
      
      // Create audio context for level analysis
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        
        const source = this.audioContext.createMediaStreamSource(stream);
        source.connect(this.analyser);
        
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        console.log("✅ تم إعداد محلل مستوى الصوت");
      } catch (err) {
        console.error("⚠️ تعذر إنشاء محلل مستوى الصوت:", err);
      }
      
      return stream;
    } catch (err) {
      console.error('❌ خطأ في الوصول إلى الميكروفون:', err);
      throw new Error('لا يمكن الوصول إلى الميكروفون');
    }
  }
  
  /**
   * Create and configure the media recorder
   */
  createMediaRecorder(
    onStart: () => void,
    onDataAvailable: (data: Blob) => void,
    onStop: () => void,
    onError: (event: Event) => void
  ): MediaRecorder | null {
    if (!this.stream) {
      console.error("❌ لا يوجد تدفق صوتي متاح");
      return null;
    }
    
    // Use appropriate audio format with good compatibility
    const options = {
      mimeType: this.getSupportedMimeType(),
      audioBitsPerSecond: 128000
    };
    
    console.log("🎤 إنشاء مسجل الصوت باستخدام:", options.mimeType);
    
    try {
      const mediaRecorder = new MediaRecorder(this.stream, options);
      
      mediaRecorder.onstart = onStart;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
          onDataAvailable(event.data);
          console.log(`🔊 تم التقاط شريحة صوتية بحجم: ${event.data.size} بايت`);
        }
      };
      
      mediaRecorder.onstop = onStop;
      mediaRecorder.onerror = onError;
      
      this.mediaRecorder = mediaRecorder;
      return mediaRecorder;
    } catch (err) {
      console.error("❌ خطأ في إنشاء مسجل الصوت:", err);
      return null;
    }
  }

  /**
   * Find a supported MIME type for audio recording
   */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/mpeg',
      ''  // Empty string is the browser default
    ];
    
    for (const type of types) {
      if (!type || MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    return '';  // Use browser default
  }
  
  /**
   * Get collected audio chunks as a blob
   */
  getAudioBlob(): Blob | null {
    if (this.audioChunks.length === 0) return null;
    
    const mimeType = this.getSupportedMimeType() || 'audio/webm';
    return new Blob(this.audioChunks, { type: mimeType });
  }
  
  /**
   * Start recording
   */
  startRecording() {
    this.audioChunks = [];
    
    if (this.mediaRecorder) {
      try {
        // Try setting a smaller timeslice for more frequent ondataavailable events
        this.mediaRecorder.start(500); // Get data every 500ms for more responsive waveform
        console.log("🎙️ بدء التسجيل الصوتي");
      } catch (err) {
        console.error("❌ خطأ عند بدء التسجيل:", err);
      }
    } else {
      console.error("❌ لم يتم تهيئة مسجل الصوت");
    }
  }
  
  /**
   * Stop recording
   */
  stopRecording() {
    if (this.mediaRecorder?.state !== 'inactive') {
      try {
        this.mediaRecorder?.stop();
        console.log("🛑 تم إيقاف التسجيل الصوتي");
      } catch (err) {
        console.error("❌ خطأ عند إيقاف التسجيل:", err);
      }
    }
  }

  /**
   * Get current audio level (0-1)
   */
  getCurrentAudioLevel(): number {
    if (!this.analyser || !this.dataArray) return 0;
    
    try {
      this.analyser.getByteFrequencyData(this.dataArray);
      
      // Calculate average volume level
      let sum = 0;
      const length = this.dataArray.length;
      
      // Log the first few values to debug
      if (Math.random() < 0.05) { // Only log occasionally to avoid console spam
        console.log("🔈 مستويات الصوت (عينة):", 
          Array.from(this.dataArray).slice(0, 5).join(", "));
      }
      
      for (let i = 0; i < length; i++) {
        sum += this.dataArray[i];
      }
      const average = sum / length;
      
      // Normalize to 0-1 range
      const level = Math.min(1, average / 128);
      
      // Log audio level occasionally
      if (Math.random() < 0.1 && level > 0.05) {
        console.log(`🎤 مستوى الصوت الحالي: ${level.toFixed(2)}`);
      }
      
      return level;
    } catch (err) {
      console.error("❌ خطأ في قراءة مستوى الصوت:", err);
      return 0;
    }
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    try {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      this.mediaRecorder = null;
    } catch (e) {
      console.error('Error stopping media recorder:', e);
    }
    
    try {
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
    } catch (e) {
      console.error('Error stopping media tracks:', e);
    }
    
    try {
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
        this.analyser = null;
      }
    } catch (e) {
      console.error('Error closing audio context:', e);
    }
    
    this.audioChunks = [];
  }
}
