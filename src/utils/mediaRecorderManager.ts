
/**
 * Manager for MediaRecorder operations
 */
export class MediaRecorderManager {
  mediaRecorder: MediaRecorder | null = null;
  stream: MediaStream | null = null;
  audioChunks: Blob[] = [];
  
  /**
   * Request microphone access and set up media recorder
   */
  async setupMediaRecorder(): Promise<MediaStream> {
    try {
      console.log("🎤 طلب إذن الوصول إلى الميكروفون...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      this.stream = stream;
      console.log("✅ تم الحصول على إذن الوصول إلى الميكروفون");
      
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
    stream: MediaStream, 
    onStart: () => void,
    onDataAvailable: (data: Blob) => void,
    onStop: () => void,
    onError: (event: Event) => void
  ): MediaRecorder {
    const mediaRecorder = new MediaRecorder(stream, { 
      mimeType: 'audio/webm',
    });
    
    mediaRecorder.onstart = onStart;
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
        onDataAvailable(event.data);
      }
    };
    
    mediaRecorder.onstop = onStop;
    mediaRecorder.onerror = onError;
    
    this.mediaRecorder = mediaRecorder;
    return mediaRecorder;
  }
  
  /**
   * Get collected audio chunks as a blob
   */
  getAudioBlob(): Blob | null {
    if (this.audioChunks.length === 0) return null;
    return new Blob(this.audioChunks, { type: 'audio/webm' });
  }
  
  /**
   * Start recording
   */
  startRecording() {
    this.audioChunks = [];
    this.mediaRecorder?.start();
  }
  
  /**
   * Stop recording
   */
  stopRecording() {
    if (this.mediaRecorder?.state !== 'inactive') {
      this.mediaRecorder?.stop();
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
    
    this.audioChunks = [];
  }
}
