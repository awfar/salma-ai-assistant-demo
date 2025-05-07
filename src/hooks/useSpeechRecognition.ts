
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { setupAudioLevelAnalysis } from '@/utils/audioUtils';
import { speechTranscriptionService } from '@/services/speechTranscriptionService';
import { MediaRecorderManager } from '@/utils/mediaRecorderManager';

interface SpeechRecognitionOptions {
  onResult?: (text: string) => void;
  onError?: (error: string) => void;
  autoStart?: boolean;
  language?: string;
  onListeningChange?: (isListening: boolean) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
}

export const useSpeechRecognition = (options?: SpeechRecognitionOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const { toast } = useToast();
  
  const recorderManagerRef = useRef(new MediaRecorderManager());
  const audioAnalysisRef = useRef(setupAudioLevelAnalysis());
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const micInitializedRef = useRef(false);
  
  const { 
    onResult, 
    onError, 
    autoStart = false, 
    language = 'ar',
    onListeningChange,
    onProcessingChange
  } = options || {};

  // Update external listening state
  useEffect(() => {
    if (onListeningChange) {
      onListeningChange(isListening);
    }
  }, [isListening, onListeningChange]);

  // Update external processing state
  useEffect(() => {
    if (onProcessingChange) {
      onProcessingChange(isProcessing);
    }
  }, [isProcessing, onProcessingChange]);

  // Process recorded audio
  const processRecordedAudio = useCallback(async () => {
    console.log("🎤 توقف التسجيل الصوتي، جاري معالجة البيانات...");
    setIsListening(false);
    
    const audioBlob = recorderManagerRef.current.getAudioBlob();
    
    if (!audioBlob) {
      console.log("⚠️ لم يتم التقاط أي بيانات صوتية");
      toast({
        title: "لم يتم التقاط أي صوت",
        description: "الرجاء التأكد من أن الميكروفون يعمل بشكل صحيح",
        variant: "default",
      });
      return;
    }
    
    console.log("✅ تم إنشاء ملف صوتي بحجم:", audioBlob.size, "بايت");
    
    // Log detailed audio blob information for debugging
    speechTranscriptionService.logAudioBlobInfo(audioBlob);
    
    if (audioBlob.size > 1000) { // Only process if there's actually audio data
      try {
        setIsProcessing(true);
        console.log("🔍 جاري تحويل الصوت إلى نص...");
        const text = await speechTranscriptionService.transcribeAudio(audioBlob);
        console.log("✅ تم الحصول على النص:", text);
        setIsProcessing(false);
        
        if (text) {
          setTranscript(text);
          if (onResult) onResult(text);
        } else {
          console.log("⚠️ لم يتم التعرف على أي نص");
          toast({
            title: "لم نتمكن من سماعك",
            description: "الرجاء المحاولة مرة أخرى والتحدث بوضوح",
            variant: "default",
          });
        }
      } catch (err) {
        console.error("❌ خطأ في معالجة الصوت:", err);
        setIsProcessing(false);
        setError('حدث خطأ أثناء معالجة الصوت');
        toast({
          title: "خطأ في معالجة الصوت",
          description: "حدث خطأ أثناء تحويل الصوت إلى نص",
          variant: "destructive",
        });
        if (onError) onError('حدث خطأ أثناء معالجة الصوت');
      }
    } else {
      console.log("⚠️ الملف الصوتي صغير جدًا، يبدو أنه لم يتم التقاط أي صوت");
      toast({
        title: "لم نتمكن من سماعك",
        description: "الرجاء المحاولة مرة أخرى والتحدث بوضوح",
      });
    }
  }, [onResult, onError, toast]);

  // Clean up resources
  const cleanupResources = useCallback(() => {
    recorderManagerRef.current.cleanup();
    audioAnalysisRef.current.cleanup();
    
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }
    
    setAudioLevel(0);
  }, []);

  // Initialize microphone once and keep reference
  const initializeMicrophone = useCallback(async () => {
    if (micInitializedRef.current) {
      console.log("🎤 الميكروفون تم تهيئته بالفعل، استخدام النسخة المخزنة");
      return;
    }

    try {
      console.log("🎤 طلب إذن الوصول إلى الميكروفون...");
      
      // Request microphone permission with optimized settings
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      // Setup the recorder manager with this stream
      await recorderManagerRef.current.setupMediaRecorder(stream);
      
      // Initialize audio analyzer with this stream
      audioAnalysisRef.current.initializeAnalyzer(stream);
      
      micInitializedRef.current = true;
      console.log("✅ تم تهيئة الميكروفون بنجاح");
      
      return stream;
    } catch (err) {
      console.error('❌ خطأ في الوصول إلى الميكروفون:', err);
      setError('لا يمكن الوصول إلى الميكروفون');
      
      if (onError) onError('لا يمكن الوصول إلى الميكروفون');
      throw err;
    }
  }, [onError]);

  // Start listening to microphone
  const startListening = useCallback(async () => {
    try {
      // First check if we're already listening
      if (isListening) {
        console.log("🎤 الميكروفون نشط بالفعل");
        return;
      }
      
      // Clean up any previous resources
      cleanupResources();
      
      setError(null);
      setTranscript(''); // Clear previous transcript when starting to listen
      
      console.log("🎤 بدء الاستماع...");
      
      // Initialize microphone if not already initialized
      await initializeMicrophone();
      
      // Start analyzing audio levels
      const { analyzeAudio } = audioAnalysisRef.current;
      analyzeAudio(setAudioLevel);
      
      // Also set up a regular interval to update audio level from MediaRecorderManager
      audioLevelIntervalRef.current = setInterval(() => {
        const level = recorderManagerRef.current.getCurrentAudioLevel();
        if (level > 0) {
          setAudioLevel(level);
        }
      }, 100);
      
      // Create and configure media recorder
      recorderManagerRef.current.createMediaRecorder(
        // onStart
        () => {
          console.log("🎤 بدأ التسجيل الصوتي");
          setIsListening(true);
        },
        // onDataAvailable
        (data) => {
          console.log(`🔊 تم التقاط شريحة صوتية بحجم: ${data.size} بايت`);
        },
        // onStop
        processRecordedAudio,
        // onError
        (event) => {
          console.error('❌ خطأ في التسجيل الصوتي:', event);
          setError('حدث خطأ أثناء التسجيل الصوتي');
          setIsListening(false);
          cleanupResources();
        }
      );
      
      // Start recording
      recorderManagerRef.current.startRecording();
      
    } catch (err) {
      console.error('❌ خطأ في الوصول إلى الميكروفون:', err);
      setError('لا يمكن الوصول إلى الميكروفون');
      setIsListening(false);
      toast({
        title: "خطأ في الوصول إلى الميكروفون",
        description: "الرجاء السماح بالوصول إلى الميكروفون في إعدادات المتصفح",
        variant: "destructive",
      });
      if (onError) onError('لا يمكن الوصول إلى الميكروفون');
      cleanupResources();
    }
  }, [cleanupResources, onError, toast, processRecordedAudio, isListening, initializeMicrophone]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (isListening) {
      console.log("🛑 إيقاف التسجيل الصوتي");
      try {
        recorderManagerRef.current.stopRecording();
      } catch (err) {
        console.error("❌ خطأ في إيقاف التسجيل الصوتي:", err);
        setIsListening(false);
        cleanupResources();
      }
    }
  }, [isListening, cleanupResources]);

  // Pre-initialize microphone permission on mount
  useEffect(() => {
    // Try to initialize microphone permission early
    if (!micInitializedRef.current) {
      console.log("🎤 تهيئة إذن الميكروفون عند التحميل");
      initializeMicrophone().catch(err => {
        console.error("❌ فشل في الحصول على إذن الميكروفون:", err);
      });
    }
    
    return () => {
      cleanupResources();
    };
  }, [initializeMicrophone, cleanupResources]);

  // Auto-start if requested
  useEffect(() => {
    if (autoStart && !isListening && !isProcessing) {
      console.log("🔄 بدء التسجيل التلقائي");
      startListening();
    }
    
    return () => {
      cleanupResources();
    };
  }, [autoStart, startListening, cleanupResources, isListening, isProcessing]);

  return {
    isListening,
    startListening,
    stopListening,
    transcript,
    error,
    isProcessing,
    audioLevel,
    resetTranscript: () => setTranscript('')
  };
};
