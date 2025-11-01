
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { SparklesIcon, UserIcon, ClipboardIcon, CheckIcon } from './icons';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const systemInstruction = `You are Artifyy AI, an intelligent photo-enhancement assistant. Your personality is creative, helpful, and inspiring.
- Your primary role is to assist users with photo editing, provide photography tips, and suggest creative ideas.
- You can answer questions about composition, lighting, color theory, and post-processing techniques.
- When asked for ideas, provide actionable and imaginative suggestions.
- Keep your responses concise and easy to understand. Use formatting like bullet points or bold text to improve readability.
- Maintain a friendly and encouraging tone. Your goal is to be a trusted creative partner.`;

// Moved MessageBubble outside of AgentTab to prevent re-creation on every render.
const MessageBubble: React.FC<{ role: 'user' | 'model', text: string }> = ({ role, text }) => {
  const isModel = role === 'model';
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (isCopied || !text) return;
    navigator.clipboard.writeText(text).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
  };

  return (
    <div className={`group flex items-start gap-3 ${isModel ? 'justify-start' : 'justify-end'}`}>
      {isModel && (
        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-indigo-500 flex items-center justify-center">
          <SparklesIcon className="w-5 h-5 text-white" />
        </div>
      )}
      <div className="relative">
        <div 
          className={`max-w-md rounded-lg px-4 py-3 ${isModel ? 'bg-gray-700' : 'bg-indigo-600'}`}
          style={{ whiteSpace: 'pre-wrap' }}
        >
          {text || <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse rounded-sm" />}
        </div>
        {isModel && text && (
            <button 
                onClick={handleCopy}
                className="absolute -right-10 top-1 p-1 rounded-full bg-gray-600/50 text-gray-300 transition-all duration-200 opacity-0 group-hover:opacity-100 hover:bg-gray-500"
                aria-label="Copy message"
            >
                {isCopied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <ClipboardIcon className="w-5 h-5" />}
            </button>
        )}
      </div>
      {!isModel && (
         <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gray-600 flex items-center justify-center">
          <UserIcon className="w-5 h-5 text-gray-300" />
        </div>
      )}
    </div>
  );
};

const AgentTab: React.FC = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const chatSession = ai.chats.create({
      model: 'gemini-2.5-pro',
      config: {
        systemInstruction,
      },
    });
    setChat(chatSession);

    // Initial message from the agent
    setMessages([
        { role: 'model', text: "Hello! I'm Artifyy AI, your personal art director. How can I help you with your photos today?" }
    ]);

  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !chat || isLoading) return;

    setIsLoading(true);
    setError(null);
    const userMessage = userInput;
    setUserInput('');

    // Add user message and a placeholder for the model's response
    setMessages(prev => [
      ...prev,
      { role: 'user', text: userMessage },
      { role: 'model', text: '' },
    ]);

    try {
      const stream = await chat.sendMessageStream({ message: userMessage });
      for await (const chunk of stream) {
        const chunkText = chunk.text;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text += chunkText;
          return newMessages;
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Sorry, I couldn't get a response. ${errorMessage}`);
      // Remove the placeholder message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col h-[75vh] bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg animate-fade-in">
      <div ref={messagesEndRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, index) => (
          <MessageBubble key={index} role={msg.role} text={msg.text} />
        ))}
        {error && <p className="text-red-400 text-center">{error}</p>}
      </div>
      <div className="p-4 border-t border-gray-700 bg-gray-800/70">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Ask for creative photo ideas..."
            disabled={isLoading}
            className="flex-grow w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-full text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:opacity-50"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={isLoading || !userInput.trim()}
            className="px-6 py-2 text-base font-semibold text-white transition-all duration-200 bg-indigo-600 border border-transparent rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AgentTab;
