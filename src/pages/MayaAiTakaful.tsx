
import React, { useEffect, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, ExternalLink } from "lucide-react";

const MayaAiTakaful = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // وظيفة لمراقبة الأخطاء في وحدة التحكم
  const setupConsoleErrorCapture = () => {
    const originalError = console.error;
    console.error = function(...args) {
      // تسجيل الأخطاء التي تحتوي على كلمة "d-id" أو "agent"
      const errorStr = args.join(' ');
      if (errorStr.toLowerCase().includes('d-id') || errorStr.toLowerCase().includes('agent') || errorStr.includes('Failed to fetch')) {
        setHasError(true);
        setIsLoading(false);
        setErrorDetails(errorStr);
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  };

  // وظيفة لتحميل سكريبت D-ID
  const loadDidScript = () => {
    setIsLoading(true);
    setHasError(false);
    setErrorDetails(null);
    
    try {
      // إزالة أي سكريبت سابق إذا كان موجوداً
      const existingScript = document.querySelector('script[data-name="did-agent"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
      
      const script = document.createElement("script");
      script.type = "module";
      script.src = "https://agent.d-id.com/v1/index.js";
      script.setAttribute("data-name", "did-agent");
      script.setAttribute("data-mode", "fabio");
      script.setAttribute("data-client-key", "Z29vZ2xlLW9hdXRoMnwxMTUwNzg1NTczODkxNTU3NzIzMDQ6ZFNiR0Z5ckdvSW00UDU4SUEzMGpL");
      script.setAttribute("data-agent-id", "agt_nzxp_loq");
      script.setAttribute("data-monitor", "true");
      
      // إضافة مراقب لحالة التحميل
      script.onload = () => {
        setIsLoading(false);
        console.log("✅ D-ID script loaded successfully");
      };
      
      script.onerror = (e) => {
        setIsLoading(false);
        setHasError(true);
        setErrorDetails("فشل في تحميل السكريبت من خادم D-ID");
        console.error("❌ Failed to load D-ID script:", e);
        toast.error("فشل في تحميل الوكيل الافتراضي", {
          description: "يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى"
        });
      };
      
      // إضافة السكريبت للصفحة
      document.body.appendChild(script);
      
      // مراقبة الأخطاء العامة
      const errorHandler = (event: Event) => {
        if (event.target && (event.target as HTMLElement).tagName === 'SCRIPT' && 
          (event.target as HTMLScriptElement).dataset.name === 'did-agent') {
          setHasError(true);
          setIsLoading(false);
          setErrorDetails("حدث خطأ أثناء تنفيذ السكريبت");
          console.error("❌ D-ID script error:", event);
        }
      };
      
      window.addEventListener('error', errorHandler as EventListener);
      const cleanupConsole = setupConsoleErrorCapture();
      
      return () => {
        window.removeEventListener('error', errorHandler as EventListener);
        cleanupConsole();
        // إزالة السكريبت عند إلغاء تحميل المكون
        const didScript = document.querySelector('script[data-name="did-agent"]');
        if (didScript) {
          document.body.removeChild(didScript);
        }
      };
    } catch (err) {
      setIsLoading(false);
      setHasError(true);
      setErrorDetails(err instanceof Error ? err.message : "خطأ غير معروف");
      console.error("❌ Error setting up D-ID script:", err);
      toast.error("خطأ في إعداد الوكيل الافتراضي");
      return () => {};
    }
  };

  // تحميل السكريبت عند تحميل المكون
  useEffect(() => {
    const cleanup = loadDidScript();
    
    // إعداد مؤقت للتحقق من حالة التحميل
    const timeoutId = setTimeout(() => {
      const agentContainer = document.querySelector('[data-did-agent]');
      if (!agentContainer) {
        setHasError(true);
        setIsLoading(false);
        setErrorDetails("لم يتم تحميل الوكيل بشكل صحيح. قد تكون هناك مشكلة في إعدادات النطاق (Domain)");
      }
    }, 10000); // 10 ثواني
    
    return () => {
      clearTimeout(timeoutId);
      cleanup();
    };
  }, []);

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
      </div>
      
      {/* منطقة الاتصال مع العميل الافتراضي */}
      <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6 mb-10">
        <div className="flex flex-col justify-center items-center min-h-[500px]">
          <div id="did-agent-container" className="w-full h-full">
            {/* D-ID سيقوم بحقن الواجهة هنا */}
            {isLoading && (
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-4"></div>
                <p className="text-gray-500">جاري تحميل الوكيل الافتراضي...</p>
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
                    يبدو أن هناك مشكلة في تكوين الوكيل الافتراضي من D-ID. يطلب الوكيل إضافة الدومين الخاص بالموقع للسماح بالوصول.
                  </p>
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
                    زيارة منصة D-ID لإعداد الوكيل
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
