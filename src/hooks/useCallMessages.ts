
import { useState } from 'react';

interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

export const useCallMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Add a new message
  const addMessage = (text: string, sender: "user" | "assistant") => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date()
    };
    
    setMessages(prevMessages => [...prevMessages, newMessage]);
    
    return newMessage;
  };
  
  // Clear all messages
  const clearMessages = () => {
    setMessages([]);
  };
  
  return {
    messages,
    addMessage,
    clearMessages
  };
};
