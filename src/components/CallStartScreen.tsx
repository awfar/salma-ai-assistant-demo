
import React from "react";
import CallButton from "@/components/CallButton";

interface CallStartScreenProps {
  onStartCall: () => void;
}

const CallStartScreen: React.FC<CallStartScreenProps> = ({ onStartCall }) => {
  return (
    <div className="relative w-full max-w-md mx-auto p-8 text-center">
      <h2 className="text-2xl font-bold mb-6">اتصل بالمساعدة الذكية سلمى</h2>
      <p className="mb-10 text-gray-600">
        انقر على زر الاتصال للتحدث مع المساعدة الذكية سلمى والحصول على المساعدة في خدمات وزارة التضامن الاجتماعي
      </p>
      
      <div className="flex justify-center mb-8 overflow-hidden rounded-full border-4 border-ministry-green" style={{width: '140px', height: '140px', margin: '0 auto'}}>
        <img 
          src="/lovable-uploads/03798977-4494-41de-b034-de18ed7e25a9.png" 
          alt="سلمى المساعدة الافتراضية" 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="flex justify-center">
        <CallButton 
          type="start_call" 
          onClick={onStartCall} 
          className="p-6" 
        />
      </div>
    </div>
  );
};

export default CallStartScreen;
