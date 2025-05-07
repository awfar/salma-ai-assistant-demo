
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { VolumeX, Volume2, RefreshCw } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  const getErrorIcon = (variant: string | undefined, title: string | undefined) => {
    if (variant === "destructive" && (title?.includes("Audio") || title?.includes("الصوت"))) {
      return <VolumeX className="h-5 w-5 text-destructive" />
    }
    return null
  }

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        // Check if this is an audio-related error
        const isAudioError = (
          (variant === "destructive") && 
          (
            (typeof title === 'string' && (
              title.toLowerCase().includes("audio") || 
              title.toLowerCase().includes("sound") || 
              title.toLowerCase().includes("صوت") ||
              title.includes("تنشيط")
            )) ||
            (typeof description === 'string' && (
              description.toLowerCase().includes("audio") || 
              description.toLowerCase().includes("sound") ||
              description.toLowerCase().includes("صوت") ||
              description.includes("تنشيط")
            ))
          )
        );

        return (
          <Toast key={id} variant={variant} {...props} className={isAudioError ? "border-red-500" : ""}>
            <div className="grid gap-1">
              {title && (
                <ToastTitle className="flex items-center gap-2">
                  {getErrorIcon(variant, title as string)}
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
              {isAudioError && !action && (
                <div className="mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-1 text-xs"
                    onClick={() => {
                      // Create and resume AudioContext
                      try {
                        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                        const audioContext = new AudioContext();
                        
                        // Create silent buffer to unlock audio
                        const buffer = audioContext.createBuffer(1, 1, 22050);
                        const source = audioContext.createBufferSource();
                        source.buffer = buffer;
                        source.connect(audioContext.destination);
                        source.start();
                        
                        // Try to resume if suspended
                        if (audioContext.state === 'suspended') {
                          audioContext.resume().catch(console.error);
                        }
                      } catch (err) {
                        console.error("Failed to initialize audio in toast:", err);
                      }
                    }}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    إعادة تنشيط الصوت
                  </Button>
                </div>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
