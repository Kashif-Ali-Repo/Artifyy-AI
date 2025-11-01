import React, { useState } from 'react';
import { SparklesIcon, ChatBubbleIcon } from './components/icons';
import PhotoAITab from './components/PhotoAITab';
import AgentTab from './components/AgentTab';

type Tab = 'photo' | 'agent';

interface TabButtonProps {
  tabName: Tab;
  label: string;
  activeTab: Tab;
  onClick: (tabName: Tab) => void;
  children: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({ tabName, label, activeTab, onClick, children }) => {
  const isActive = activeTab === tabName;
  return (
    <button
      onClick={() => onClick(tabName)}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        isActive
          ? 'bg-indigo-600 text-white'
          : 'text-gray-300 hover:bg-gray-700'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
      {label}
    </button>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('photo');

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4">
      <header className="text-center mb-6">
        <div className="flex items-center justify-center gap-3">
          <SparklesIcon className="w-10 h-10 text-indigo-400" />
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Artifyy AI
          </h1>
        </div>
        <p className="mt-3 text-lg text-gray-400 max-w-2xl mx-auto">
          {activeTab === 'photo' 
            ? 'Upload a photo and let our AI transform it into a professional-grade masterpiece.'
            : 'Chat with your personal AI art director for tips and creative ideas.'
          }
        </p>
      </header>
      
      <nav className="flex justify-center items-center gap-2 p-2 mb-8 bg-gray-800/50 rounded-lg border border-gray-700">
        <TabButton tabName="photo" label="Studio" activeTab={activeTab} onClick={setActiveTab}>
          <SparklesIcon className="w-5 h-5" />
        </TabButton>
        <TabButton tabName="agent" label="Muse" activeTab={activeTab} onClick={setActiveTab}>
          <ChatBubbleIcon className="w-5 h-5" />
        </TabButton>
      </nav>

      <main className="w-full flex-grow flex flex-col items-center justify-center">
        <div className={`w-full max-w-6xl ${activeTab === 'photo' ? 'block' : 'hidden'}`}>
          <PhotoAITab />
        </div>
        <div className={`w-full max-w-6xl ${activeTab === 'agent' ? 'block' : 'hidden'}`}>
          <AgentTab />
        </div>
      </main>
    </div>
  );
};

export default App;