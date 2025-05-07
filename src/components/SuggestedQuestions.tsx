
import React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SuggestedQuestionsProps {
  questions: string[];
  onQuestionSelect: (question: string) => void;
  className?: string;
}

const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({
  questions,
  onQuestionSelect,
  className
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const handleQuestionClick = (question: string) => {
    console.log("Question clicked:", question);
    onQuestionSelect(question);
  };

  if (!questions.length) return null;

  return (
    <div className={cn("w-full relative", className)}>
      {/* أزرار التمرير */}
      <button
        onClick={scrollRight}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-ministry-dark/20 backdrop-blur-sm p-1 rounded-full hover:bg-ministry-dark/30 transition-colors rtl:rotate-180"
        aria-label="تمرير لليسار"
      >
        <ChevronRight className="h-5 w-5 text-white" />
      </button>
      
      <button
        onClick={scrollLeft}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-ministry-dark/20 backdrop-blur-sm p-1 rounded-full hover:bg-ministry-dark/30 transition-colors rtl:rotate-180"
        aria-label="تمرير لليمين"
      >
        <ChevronLeft className="h-5 w-5 text-white" />
      </button>
      
      {/* قائمة الأسئلة المقترحة */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto py-2 px-8 scrollbar-hide snap-x gap-2"
        dir="rtl"
      >
        {questions.map((question, index) => (
          <button
            key={index}
            onClick={() => handleQuestionClick(question)}
            className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white border border-white/30 rounded-full text-sm whitespace-nowrap hover:bg-white/30 transition-colors snap-start active:scale-95 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SuggestedQuestions;
