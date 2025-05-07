
import { useState, useRef, useCallback } from "react";
import { createVoiceRecorder, VoiceRecorderInterface } from "@/utils/voiceRecorder";
import { useToast } from "@/hooks/use-toast";
import { speechTranscriptionService } from "@/services/speechTranscriptionService";

interface UseAudioRecordingProps {
  onTranscriptReady: (text: string) => Promise<void>;
  onTranscriptChange: (text: string) => void;
}

interface UseAudioRecordingReturn {
  isRecording: boolean;
  audioLevel: number;
  startRecording: () => Promise<void>;
  stopRecording: (noSpeechDetected?: boolean) => Promise<void>;
  recorderRef: React.MutableRefObject<VoiceRecorderInterface | null>;
}

export const useAudioRecording = ({
  onTranscriptReady,
  onTranscriptChange
}: UseAudioRecordingProps): UseAudioRecordingReturn => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const { toast } = useToast();
  
  // References
  const recorderRef = useRef<VoiceRecorderInterface | null>(null);
  const noSpeechTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Show error message helper
  const showError = useCallback((message: string, duration: number = 3000) => {
    toast({
      title: "خطأ في معالجة الصوت",
      description: message,
      variant: "destructive",
    });
  }, [toast]);

  // Handle start of recording
  const startRecording = useCallback(async () => {
    try {
      // Hide any error messages
      
      // Start recording
      if (!recorderRef.current) {
        recorderRef.current = createVoiceRecorder({
          onAudioLevel: (level) => {
            setAudioLevel(level);
          }
        });
      }
      
      console.log("🎤 بدء تسجيل الصوت...");
      await recorderRef.current.startRecording();
      setIsRecording(true);
      onTranscriptChange("جاري الاستماع...");
      
      // Set a timeout to check if no speech is detected
      noSpeechTimeoutRef.current = setTimeout(() => {
        if (audioLevel < 0.1 && isRecording) {
          console.log("⚠️ لم يتم اكتشاف كلام خلال فترة المهلة");
          stopRecording(true);
        }
      }, 6500); // Check just before 7 second max recording time

    } catch (err) {
      console.error("❌ خطأ في بدء التسجيل:", err);
      setIsRecording(false);
      showError("لم نتمكن من تشغيل الميكروفون. يرجى التأكد من السماح بالوصول.", 3000);
    }
  }, [audioLevel, isRecording, onTranscriptChange, showError]);
  
  // Handle end of recording
  const stopRecording = useCallback(async (noSpeechDetected = false) => {
    try {
      if (!recorderRef.current || !recorderRef.current.isRecording()) {
        setIsRecording(false);
        return;
      }
      
      // Clear no speech timeout
      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current);
        noSpeechTimeoutRef.current = null;
      }
      
      setIsRecording(false);
      onTranscriptChange("جاري معالجة الصوت...");
      
      // Stop the recording and get the audio blob
      console.log("🎤 إيقاف التسجيل والحصول على الملف الصوتي...");
      const audioBlob = await recorderRef.current.stopRecording();
      
      // If we detected no speech, show a message
      if (noSpeechDetected || audioBlob.size < 1000) {
        console.warn("⚠️ لم يتم اكتشاف كلام أو الصوت صغير جدًا:", audioBlob.size);
        showError("لم يتم التقاط صوت، حاول مرة أخرى", 2000);
        return;
      }
      
      console.log(`🎤 تم تسجيل ملف صوتي: ${audioBlob.size} بايت، نوع: ${audioBlob.type}`);
      
      // Transcribe the audio
      try {
        console.log("🔄 تحويل الصوت إلى نص...");
        const text = await speechTranscriptionService.transcribeAudio(audioBlob);
        
        if (!text) {
          console.error("❌ لم يتم إرجاع أي نص من عملية التحويل");
          throw new Error("فشل في تحويل الكلام إلى نص");
        }
        
        console.log("✅ نجحت عملية التحويل:", text);
        
        // Process the transcribed text
        await onTranscriptReady(text);
      } catch (transcriptionError) {
        console.error("❌ خطأ في التحويل:", transcriptionError);
        showError(
          transcriptionError instanceof Error 
            ? transcriptionError.message 
            : "لم نتمكن من تحويل الصوت إلى نص. يرجى المحاولة مرة أخرى.", 
          3000
        );
      }
      
    } catch (err) {
      console.error("❌ خطأ في إيقاف التسجيل:", err);
      setIsRecording(false);
      onTranscriptChange("");
      
      showError("خطأ في معالجة الصوت، يرجى المحاولة مرة أخرى.", 3000);
    }
  }, [onTranscriptChange, onTranscriptReady, showError]);

  return {
    isRecording,
    audioLevel,
    startRecording,
    stopRecording,
    recorderRef
  };
};
