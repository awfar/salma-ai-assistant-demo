
import React, { useEffect, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, ExternalLink, CheckCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const MayaAiTakaful = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [domainAdded, setDomainAdded] = useState(true); // Assuming domain is already added
  const [retryCount, setRetryCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'failed'>('connecting');

  // Function to capture console errors
  const setupConsoleErrorCapture = () => {
    const originalError = console.error;
    console.error = function(...args) {
      // Log errors containing "d-id" or "agent" or "fetch"
      const errorStr = args.join(' ');
      if (
        errorStr.toLowerCase().includes('d-id') || 
        errorStr.toLowerCase().includes('agent') || 
        errorStr.includes('Failed to fetch') ||
        errorStr.includes('TypeError')
      ) {
        setHasError(true);
        setIsLoading(false);
        setConnectionStatus('failed');
        setErrorDetails(errorStr);
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  };

  // Function to load D-ID script
  const loadDidScript = () => {
    setIsLoading(true);
    setHasError(false);
    setErrorDetails(null);
    setConnectionStatus('connecting');
    setRetryCount(prev => prev + 1);
    
    try {
      // Remove any previous script if exists
      const existingScript = document.querySelector('script[data-name="did-agent"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
      
      // Clear any existing did-agent containers
      const existingContainers = document.querySelectorAll('[data-did-agent]');
      existingContainers.forEach(container => {
        container.remove();
      });
      
      const script = document.createElement("script");
      script.type = "module";
      script.src = "https://agent.d-id.com/v1/index.js";
      script.setAttribute("data-name", "did-agent");
      script.setAttribute("data-mode", "fabio");
      script.setAttribute("data-client-key", "Z29vZ2xlLW9hdXRoMnwxMTUwNzg1NTczODkxNTU3NzIzMDQ6ZFNiR0Z5ckdvSW00UDU4SUEzMGpL");
      script.setAttribute("data-agent-id", "agt_nzxp_loq");
      script.setAttribute("data-monitor", "true");
      
      // Log the current environment
      console.log("📊 Current URL:", window.location.href);
      console.log("📊 Current Domain:", window.location.hostname);
      
      // Add load event listener
      script.onload = () => {
        setIsLoading(false);
        setDomainAdded(true);
        setConnectionStatus('connected');
        console.log("✅ D-ID script loaded successfully");
        toast.success("تم تحميل الوكيل الافتراضي بنجاح", {
          description: "يمكنك الآن التفاعل مع مايا للتكافل الاجتماعي"
        });
      };
      
      script.onerror = (e) => {
        setIsLoading(false);
        setHasError(true);
        setConnectionStatus('failed');
        setErrorDetails("فشل في تحميل السكريبت من خادم D-ID");
        console.error("❌ Failed to load D-ID script:", e);
        toast.error("فشل في تحميل الوكيل الافتراضي", {
          description: "يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى"
        });
      };
      
      // Add script to page
      document.body.appendChild(script);
      
      // Monitor general errors
      const errorHandler = (event: Event) => {
        if (event.target && (event.target as HTMLElement).tagName === 'SCRIPT' && 
          (event.target as HTMLScriptElement).dataset.name === 'did-agent') {
          setHasError(true);
          setIsLoading(false);
          setConnectionStatus('failed');
          setErrorDetails("حدث خطأ أثناء تنفيذ السكريبت");
          console.error("❌ D-ID script error:", event);
        }
      };
      
      window.addEventListener('error', errorHandler as EventListener);
      const cleanupConsole = setupConsoleErrorCapture();
      
      return () => {
        window.removeEventListener('error', errorHandler as EventListener);
        cleanupConsole();
        // Remove script when component unmounts
        const didScript = document.querySelector('script[data-name="did-agent"]');
        if (didScript) {
          document.body.removeChild(didScript);
        }
      };
    } catch (err) {
      setIsLoading(false);
      setHasError(true);
      setConnectionStatus('failed');
      setErrorDetails(err instanceof Error ? err.message : "خطأ غير معروف");
      console.error("❌ Error setting up D-ID script:", err);
      toast.error("خطأ في إعداد الوكيل الافتراضي");
      return () => {};
    }
  };

  // Load script when component mounts
  useEffect(() => {
    const cleanup = loadDidScript();
    
    // Setup timer to check loading status
    const timeoutId = setTimeout(() => {
      const agentContainer = document.querySelector('[data-did-agent]');
      if (!agentContainer) {
        setHasError(true);
        setIsLoading(false);
        setConnectionStatus('failed');
        setErrorDetails("لم يتم تحميل الوكيل بشكل صحيح. قد تكون هناك مشكلة في إعدادات النطاق (Domain)");
      }
    }, 10000); // 10 seconds
    
    return () => {
      clearTimeout(timeoutId);
      cleanup();
    };
  }, []);

  // Display a more helpful error message based on the error details
  const getErrorMessage = () => {
    if (errorDetails?.includes("Failed to fetch")) {
      return "فشل الاتصال بخادم D-ID. قد يكون هناك مشكلة في الاتصال بالإنترنت أو قد تكون خدمة D-ID غير متاحة حاليًا.";
    }
    if (errorDetails?.includes("TypeError")) {
      return "حدث خطأ في البرنامج أثناء محاولة الاتصال بالوكيل الافتراضي.";
    }
    if (errorDetails?.includes("agent") || errorDetails?.includes("d-id")) {
      return "حدث خطأ في وكيل D-ID. قد يكون هناك مشكلة في الإعدادات أو الترخيص.";
    }
    return "حدث خطأ غير معروف أثناء محاولة تحميل الوكيل الافتراضي. يرجى المحاولة مرة أخرى لاحقًا.";
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-ministry-light">
      <div className="text-center max-w-2xl mx-auto p-6">
        <img 
          src="/lovable-uploads/f36695b0-0f89-46fe-a680-25254c206da0.png" 
          alt="شعار الوزارة" 
          className="h-24 mx-auto mb-6"
        />
        <h1 className="text-4xl font-bold mb-6">Maya Ai Takaful</h1>
        <p className="text-xl text-gray-600 mb-8">
          الوكيل الافتراضي للتكافل الاجتماعي من وزارة التضامن
        </p>
        
        {domainAdded && (
          <Alert variant="default" className="mb-6 bg-green-50 border-green-200 text-right">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="mr-4 text-green-800">تم إضافة نطاق الموقع</AlertTitle>
            <AlertDescription className="mr-4 text-green-700">
              تم إضافة النطاق https://preview--salma-ai-assistant-demo.lovable.app/ بنجاح إلى قائمة النطاقات المسموح بها في منصة D-ID
            </AlertDescription>
          </Alert>
        )}
        
        {/* Connection status indicator */}
        <div className="mb-6">
          {connectionStatus === 'connecting' && (
            <Alert variant="default" className="bg-blue-50 border-blue-200">
              <div className="flex items-center">
                <div className="animate-spin h-4 w-4 border-t-2 border-b-2 border-blue-600 rounded-full mr-2"></div>
                <AlertTitle className="text-blue-800">جاري الاتصال بالوكيل الافتراضي...</AlertTitle>
              </div>
            </Alert>
          )}
          {connectionStatus === 'connected' && (
            <Alert variant="default" className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="mr-4 text-green-800">تم الاتصال بنجاح</AlertTitle>
            </Alert>
          )}
        </div>
      </div>
      
      {/* Virtual agent interaction area */}
      <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6 mb-10">
        <div className="flex flex-col justify-center items-center min-h-[500px]">
          <div id="did-agent-container" className="w-full h-full">
            {/* D-ID will inject interface here */}
            {isLoading && (
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-4"></div>
                <p className="text-gray-500">جاري تحميل الوكيل الافتراضي...</p>
                <p className="text-gray-400 text-sm mt-2">نحن نستخدم النطاق المضاف: https://preview--salma-ai-assistant-demo.lovable.app/</p>
                <p className="text-gray-400 text-sm mt-1">محاولة رقم: {retryCount}</p>
              </div>
            )}
            
            {hasError && (
              <div className="text-center py-10">
                <div className="flex items-center justify-center mb-4">
                  <AlertCircle className="text-red-500 h-8 w-8 mr-2" />
                  <div className="text-red-500 text-lg">فشل في تحميل الوكيل الافتراضي</div>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 max-w-xl mx-auto text-right">
                  <h3 className="font-bold mb-2">سبب المشكلة المحتمل:</h3>
                  <p className="text-gray-700 mb-4">
                    {getErrorMessage()}
                  </p>
                  
                  <Alert variant="default" className="bg-amber-50 border-amber-200 mb-4">
                    <Info className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="mr-4 text-amber-800">ملاحظة هامة:</AlertTitle>
                    <AlertDescription className="mr-4 text-amber-700">
                      رغم إضافة النطاق <span dir="ltr">https://preview--salma-ai-assistant-demo.lovable.app/</span> إلى منصة D-ID، قد تستغرق التغييرات بعض الوقت لتصبح فعالة. كما قد تكون هناك حاجة لمراجعة إعدادات أخرى في لوحة التحكم الخاصة بـ D-ID.
                    </AlertDescription>
                  </Alert>
                  
                  <p className="text-gray-700">
                    {errorDetails ? (
                      <span className="text-xs font-mono bg-gray-100 p-1 rounded block my-2 overflow-auto max-h-20 dir-ltr text-left">
                        {errorDetails}
                      </span>
                    ) : "لا توجد تفاصيل إضافية للخطأ"}
                  </p>
                </div>
                
                <div className="flex flex-col gap-4 items-center">
                  <Button 
                    onClick={loadDidScript}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" /> إعادة المحاولة
                  </Button>
                  
                  <a 
                    href="https://studio.d-id.com" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    زيارة منصة D-ID للتحقق من إعدادات الوكيل
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="w-full p-4 mt-auto text-center text-gray-600">
        وزارة التضامن الاجتماعي © 2025
      </footer>
    </div>
  );
};

export default MayaAiTakaful;
