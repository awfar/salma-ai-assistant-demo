
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Settings, ArrowLeft, Save } from "lucide-react";

const AISettings: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // أعددنا حالة بيانات مبدئية
  const [settings, setSettings] = useState({
    agentName: "سلمى",
    language: "ar-EG",
    voiceId: "EXAVITQu4vr4xnSDxMaL", // Sarah voice
    instructions: `أنت مساعد ذكي يسمى سلمى تابع لوزارة التضامن الاجتماعي المصرية.
مهمتك هي مساعدة المواطنين في الاستفسارات المتعلقة بخدمات الوزارة.
يجب أن تكون إجاباتك مختصرة ومفيدة وباللغة العربية الفصحى البسيطة.`,
  });
  
  const availableVoices = [
    { id: "EXAVITQu4vr4xnSDxMaL", name: "سارة - صوت عربي أنثوي" },
    { id: "onwK4e9ZLuTAKqWW03F9", name: "دانيال - صوت إنجليزي ذكوري" },
    { id: "N2lVS1w4EtoT3dr4eOWO", name: "كالوم - صوت إنجليزي ذكوري" },
    { id: "XB0fDUnXU5powFXDhCwa", name: "شارلوت - صوت إنجليزي أنثوي" },
  ];
  
  const availableLanguages = [
    { id: "ar-EG", name: "العربية - مصر" },
    { id: "ar-SA", name: "العربية - السعودية" },
    { id: "en-US", name: "الإنجليزية - أمريكا" },
    { id: "en-GB", name: "الإنجليزية - بريطانيا" },
  ];
  
  const handleSubmit = () => {
    setIsLoading(true);
    
    // حفظ الإعدادات في localStorage
    localStorage.setItem('aiSettings', JSON.stringify(settings));
    
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "تم حفظ الإعدادات",
        description: "تم حفظ إعدادات المساعد الذكي بنجاح",
      });
    }, 800);
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-ministry-light">
      {/* شعار الوزارة كامل */}
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
          <div className="bg-gray-800 text-white px-3 py-1 rounded-md text-sm">
            <p>Salma AI Settings</p>
          </div>
        </div>
      </div>
      
      {/* المحتوى الرئيسي */}
      <div className="flex-1 container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-ministry-dark" />
            <h2 className="text-2xl font-bold text-ministry-dark">إعدادات المساعد الذكي</h2>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate('/ai-call-demo')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>العودة للمكالمة</span>
          </Button>
        </div>
        
        <Card className="mb-8 shadow-md">
          <CardHeader>
            <CardTitle className="text-right">الإعدادات العامة</CardTitle>
            <CardDescription className="text-right">
              اضبط إعدادات المساعد الذكي حسب احتياجاتك
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-right text-sm font-medium">اسم المساعد</label>
                  <Input
                    dir="rtl"
                    value={settings.agentName}
                    onChange={(e) => setSettings({...settings, agentName: e.target.value})}
                    placeholder="أدخل اسم المساعد الذكي"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-right text-sm font-medium">اللغة</label>
                  <Select 
                    value={settings.language} 
                    onValueChange={(value) => setSettings({...settings, language: value})}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="اختر اللغة" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLanguages.map((lang) => (
                        <SelectItem key={lang.id} value={lang.id}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-right text-sm font-medium">صوت المساعد</label>
                <Select 
                  value={settings.voiceId} 
                  onValueChange={(value) => setSettings({...settings, voiceId: value})}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر الصوت" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVoices.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        {voice.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="block text-right text-sm font-medium">إرشادات المساعد</label>
                <Textarea
                  dir="rtl"
                  value={settings.instructions}
                  onChange={(e) => setSettings({...settings, instructions: e.target.value})}
                  placeholder="أدخل الإرشادات للمساعد الذكي"
                  className="h-40 resize-none"
                />
                <p className="text-sm text-gray-500 text-right">
                  هذه الإرشادات ستوجه سلوك المساعد الذكي وطريقة رده على الاستفسارات.
                </p>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              <span>{isLoading ? "جاري الحفظ..." : "حفظ الإعدادات"}</span>
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* تذييل */}
      <div className="w-full text-center py-4">
        <p className="text-gray-600 text-sm">
          سلمى - الموظفة الذكية من وزارة التضامن © 2025
        </p>
      </div>
    </div>
  );
};

export default AISettings;
