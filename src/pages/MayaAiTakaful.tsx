
import React, { useEffect } from "react";

const MayaAiTakaful = () => {
  // إضافة سكريبت D-ID عند تحميل المكون
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://agent.d-id.com/v1/index.js";
    script.setAttribute("data-name", "did-agent");
    script.setAttribute("data-mode", "fabio");
    script.setAttribute("data-client-key", "Z29vZ2xlLW9hdXRoMnwxMTUwNzg1NTczODkxNTU3NzIzMDQ6ZFNiR0Z5ckdvSW00UDU4SUEzMGpL");
    script.setAttribute("data-agent-id", "agt_nzxp_loq");
    script.setAttribute("data-monitor", "true");
    
    // إضافة السكريبت للصفحة
    document.body.appendChild(script);

    // إزالة السكريبت عند إلغاء تحميل المكون
    return () => {
      document.body.removeChild(script);
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
        <div className="flex justify-center items-center min-h-[500px]">
          <div id="did-agent-container" className="w-full h-full">
            {/* D-ID سيقوم بحقن الواجهة هنا */}
            <div className="text-center text-gray-500 mb-4">جاري تحميل الوكيل الافتراضي...</div>
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
