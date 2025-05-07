
import React from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CallHeaderProps {
  onSettingsClick: () => void;
}

const CallHeader: React.FC<CallHeaderProps> = ({ onSettingsClick }) => {
  return (
    <div className="w-full flex justify-between items-center p-4 bg-white/80 shadow-sm">
      <div className="flex items-center gap-3 rtl:flex-row-reverse">
        <img 
          src="/lovable-uploads/59b69e9d-ca94-459f-af37-2c5626365a98.png" 
          alt="وزارة التضامن الاجتماعي" 
          className="h-16 w-auto"
        />
        <h1 className="text-xl md:text-2xl font-bold text-ministry-dark">وزارة التضامن الاجتماعي</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSettingsClick}
          className="flex items-center gap-1"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">الإعدادات</span>
        </Button>
        <div className="bg-gray-800 text-white px-3 py-1 rounded-md text-sm">
          <p>Salma AI Demo</p>
        </div>
      </div>
    </div>
  );
};

export default CallHeader;
