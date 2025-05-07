
import React from "react";

interface ErrorMessageProps {
  showError: boolean;
  errorMessage: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  showError, 
  errorMessage 
}) => {
  if (!showError) return null;
  
  return (
    <div className="absolute top-16 left-4 right-4 z-30">
      <div className="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg">
        <h3 className="font-bold">خطأ في معالجة الصوت</h3>
        <p>{errorMessage || "لم نتمكن من تحويل الصوت إلى نص. يرجى المحاولة مرة أخرى."}</p>
      </div>
    </div>
  );
};

export default ErrorMessage;
