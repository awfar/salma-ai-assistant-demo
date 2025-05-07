
import { useState, useCallback, useRef, useEffect } from "react";
import { useToast } from "./use-toast";
import { supabase } from "@/integrations/supabase/client";
import { testAudioOutput } from "@/utils/audioUtils";

interface TextToSpeechCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onChunk?: (chunk: ArrayBuffer) => void;
  onStreamStart?: (mediaSource: MediaSource | AudioBufferSourceNode) => void;
}

interface UseAIAssistantReturn {
  askAssistant: (question: string) => Promise<string | null>;
  textToSpeech: (text: string, callbacks?: TextToSpeechCallbacks) => Promise<string | null>;
  streamToSpeech: (text: string, callbacks?: TextToSpeechCallbacks) => Promise<void>;
  isLoading: boolean;
  isAudioLoading: boolean;
  cancelRequest?: () => void;
}

export const useAIAssistant = (): UseAIAssistantReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Initialize AudioContext
  useEffect(() => {
    // Create AudioContext immediately but don't play any sound
    try {
      if (!audioContextRef.current) {
        console.log("🔊 Creating AudioContext on component mount");
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
        
        console.log("✅ AudioContext successfully created");
      }
    } catch (err) {
      console.error("❌ Failed to create AudioContext:", err);
    }

    // Explicitly resume AudioContext on user interaction
    const resumeAudioContext = () => {
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        console.log("🔊 Resuming AudioContext after user interaction");
        audioContextRef.current.resume().then(() => {
          console.log("✅ AudioContext resumed successfully");
          
          // Test audio output after resuming
          testAudioOutput(true).then(success => {
            if (success) {
              console.log("✅ Audio output test successful");
            } else {
              console.error("❌ Audio output test failed");
            }
          });
        }).catch(err => {
          console.error("❌ Failed to resume AudioContext:", err);
        });
      }
    };

    // Add handlers for various events that indicate user interaction
    window.addEventListener("click", resumeAudioContext);
    window.addEventListener("touchstart", resumeAudioContext);
    window.addEventListener("keydown", resumeAudioContext);
    
    // Create and play a silent sound to unlock audio on iOS/Safari
    const unlockAudio = () => {
      if (audioContextRef.current) {
        const silentBuffer = audioContextRef.current.createBuffer(1, 1, 22050);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = silentBuffer;
        source.connect(audioContextRef.current.destination);
        source.start(0);
        console.log("✅ Played silent sound to unlock audio");
      }
    };
    
    // Try unlock audio on first load and user interaction
    unlockAudio();
    window.addEventListener("touchstart", unlockAudio, { once: true });
    window.addEventListener("click", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("click", resumeAudioContext);
      window.removeEventListener("touchstart", resumeAudioContext);
      window.removeEventListener("keydown", resumeAudioContext);
      window.removeEventListener("touchstart", unlockAudio);
      window.removeEventListener("click", unlockAudio);
      
      // Clean up AudioContext when component unmounts
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(err => {
          console.error("❌ Error closing AudioContext:", err);
        });
      }
    };
  }, []);
  
  // Cancel any in-progress requests
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      console.log("🛑 Canceling in-progress request");
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setIsAudioLoading(false);
    }
  }, []);
  
  // Ask the AI assistant
  const askAssistant = useCallback(async (question: string): Promise<string | null> => {
    // Cancel any existing request
    cancelRequest();
    
    // Create a new abort controller
    abortControllerRef.current = new AbortController();
    
    try {
      setIsLoading(true);
      
      console.log("🤖 Sending question to AI assistant:", question);
      
      // Use the AI assistant Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { userMessage: question }
      });
      
      if (error) {
        console.error("Error asking assistant:", error);
        throw new Error(error.message);
      }
      
      if (!data || !data.response) {
        console.error("No response received from AI assistant");
        throw new Error("Could not get a response from the AI assistant");
      }
      
      console.log("✅ Received response from AI assistant:", data.response.substring(0, 50) + "...");
      
      return data.response;
    } catch (error) {
      console.error("Error asking assistant:", error);
      
      if (error instanceof Error && error.name === "AbortError") {
        console.log("🛑 Request was canceled");
        return null;
      }
      
      toast({
        title: "Connection Error",
        description: "Could not connect to the AI assistant. Please try again.",
        variant: "destructive",
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast, cancelRequest]);
  
  // Method to stream audio directly from ElevenLabs
  const streamToSpeech = useCallback(async (text: string, callbacks?: TextToSpeechCallbacks): Promise<void> => {
    if (!text.trim()) {
      console.error("❌ Text is empty, cannot convert to speech");
      return;
    }

    try {
      setIsAudioLoading(true);
      callbacks?.onStart?.();
      
      // Get the current origin for building the correct endpoint URL
      const origin = window.location.origin;
      console.log("🌐 Using origin for TTS endpoint:", origin);
      
      // Full URL to text-to-speech edge function
      const functionPath = '/functions/v1/text-to-speech';
      console.log("🔊 Starting text to speech with path:", functionPath);
      
      console.log("🔊 Converting text:", text.substring(0, 50) + "...");

      // Use direct fetch to supabase function
      const response = await fetch(`${origin}${functionPath}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          text, 
          stream: true,
          // Using Leila voice - Arabic female voice
          voice: "Yko7PKHZNXotIFUBdGjp"
        })
      });

      if (!response.ok || !response.body) {
        console.error(`❌ TTS streaming failed with status: ${response.status}`);
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`Failed to stream text to speech: ${response.status}`);
      }

      console.log("✅ Started receiving audio stream from server");

      // Ensure we have an audio context
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
        console.log("✅ Created new AudioContext for streaming");
      }

      // Make sure audio context is in running state
      if (audioContextRef.current.state === "suspended") {
        try {
          console.log("⚠️ AudioContext suspended, attempting to resume");
          await audioContextRef.current.resume();
          console.log("✅ Successfully resumed AudioContext");
        } catch (err) {
          console.error("❌ Failed to resume AudioContext:", err);
          throw new Error("Failed to resume audio playback. Please interact with the page first.");
        }
      }

      // Create a reader for the stream
      const reader = response.body.getReader();
      
      // Process the audio chunks
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log("✅ Audio stream complete");
          break;
        }
        
        if (audioContextRef.current && value) {
          try {
            console.log(`✅ Received audio chunk: ${value.buffer.byteLength} bytes`);
            
            // Decode the audio data
            const audioBuffer = await audioContextRef.current.decodeAudioData(value.buffer.slice(0));
            
            // Create a buffer source
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            
            // Add a gain node to control volume
            const gainNode = audioContextRef.current.createGain();
            gainNode.gain.value = 1.0; // Full volume
            
            source.connect(gainNode);
            gainNode.connect(audioContextRef.current.destination);
            
            // Notify that we're starting to stream audio
            if (callbacks?.onStreamStart) {
              callbacks.onStreamStart(source);
            }
            
            // Play the audio
            source.start(0);
            
            // Wait for this chunk to finish playing
            await new Promise<void>((resolve) => {
              source.onended = () => resolve();
            });
            
            // Notify about the chunk
            if (callbacks?.onChunk) {
              callbacks.onChunk(value.buffer);
            }
          } catch (decodeError) {
            console.error("❌ Error decoding audio chunk:", decodeError);
          }
        }
      }
      
      // Audio stream complete
      callbacks?.onEnd?.();
      
    } catch (error) {
      console.error("❌ Error in text-to-speech streaming:", error);
      
      // Try falling back to non-streaming mode
      console.log("🔄 Attempting fallback to non-streaming TTS...");
      try {
        const audioUrl = await textToSpeech(text, callbacks);
        if (!audioUrl) {
          throw new Error("Failed to get audio URL in fallback mode");
        }
        console.log("✅ Successfully got audio URL from fallback method");
      } catch (fallbackError) {
        console.error("❌ Fallback TTS also failed:", fallbackError);
        toast({
          title: "Error Converting Text to Speech",
          description: "Could not convert text to speech. Please check your connection and try again.",
          variant: "destructive",
        });
      } 
    } finally {
      setIsAudioLoading(false);
      // The onEnd callback is handled by the individual methods
    }
  }, [toast]);
  
  // Convert text to speech (non-streaming method for compatibility)
  const textToSpeech = useCallback(async (text: string, callbacks?: TextToSpeechCallbacks): Promise<string | null> => {
    try {
      setIsAudioLoading(true);
      callbacks?.onStart?.();
      
      // Create a new abort controller
      if (!abortControllerRef.current) {
        abortControllerRef.current = new AbortController();
      }
      
      console.log("🔊 Converting text to speech (non-streaming):", text.substring(0, 50) + "...");
      
      // Get the current origin for building the correct endpoint URL
      const origin = window.location.origin;
      
      // Full URL to text-to-speech edge function
      const functionPath = '/functions/v1/text-to-speech';
      
      // Direct fetch to edge function
      const response = await fetch(`${origin}${functionPath}`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text, 
          stream: false,
          voice: "Yko7PKHZNXotIFUBdGjp" // Leila voice - Arabic female voice
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ TTS endpoint error: ${response.status}`, errorText);
        throw new Error(`Failed to convert text to speech: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.audio) {
        console.error("No audio data returned");
        throw new Error("No audio data returned");
      }
      
      console.log("✅ Successfully received audio data. Data length:", data.audio.length);
      
      // Create audio URL from base64
      const audioUrl = `data:audio/mp3;base64,${data.audio}`;
      console.log("✅ Successfully converted text to speech and created audio URL");
      
      return audioUrl;
    } catch (error) {
      console.error("Error in text-to-speech:", error);
      toast({
        title: "Error Converting Text to Speech",
        description: "Could not convert the response to speech. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsAudioLoading(false);
      // The onEnd callback will be handled when the audio actually plays and ends
    }
  }, [toast]);
  
  return { askAssistant, textToSpeech, streamToSpeech, isLoading, isAudioLoading, cancelRequest };
};
