
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ministry-light">
      <div className="text-center max-w-2xl mx-auto p-6">
        <img 
          src="/lovable-uploads/f36695b0-0f89-46fe-a680-25254c206da0.png" 
          alt="وزارة التضامن الاجتماعي" 
          className="h-32 mx-auto mb-6"
        />
        <h1 className="text-4xl font-bold mb-6">سلمى - الموظفة الذكية</h1>
        <p className="text-xl text-gray-600 mb-8">
          واجهة عرض توضيحية للمساعد الافتراضي من وزارة التضامن الاجتماعي
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={() => navigate("/ai-call-demo")}
            className="text-lg px-8 py-6"
          >
            عرض واجهة المكالمات
          </Button>
        </div>

        <div className="mt-12 p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4 text-right">معلومات عن المشروع</h2>
          <ul className="text-right space-y-2">
            <li><strong>اسم المشروع:</strong> سلمى - الموظفة الذكية من وزارة التضامن</li>
            <li><strong>الهدف:</strong> تقديم مساعدة رقمية ذكية لمستخدمي خدمات الوزارة</li>
            <li><strong>المميزات:</strong> واجهة محادثة صوتية، دعم باللغة العربية، استجابة سريعة</li>
          </ul>
        </div>
      </div>
      
      <footer className="w-full p-4 mt-auto text-center text-gray-600">
        وزارة التضامن الاجتماعي © 2025
      </footer>
    </div>
  );
};

export default Index;
