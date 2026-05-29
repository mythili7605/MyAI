/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps, react-hooks/immutability, react-hooks/purity */
// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  Sparkles, 
  Image as ImageIcon, 
  PenTool, 
  Globe, 
  Plus, 
  Mic, 
  Send, 
  Settings, 
  MessageSquare, 
  Trash2, 
  Volume2, 
  Compass, 
  Check, 
  X,
  RefreshCw,
  Search,
  FileText,
  Sun,
  Palette,
  Shield,
  Database,
  Info,
  Bug,
  ChevronDown,
  LogOut,
  HelpCircle,
  FileCode,
  Lock,
  ChevronRight,
  BookOpen
} from 'lucide-react';

export default function App() {
  // Navigation & UI States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTool, setActiveTool] = useState('chat'); // 'chat' | 'image' | 'search' | 'write'
  const [chatHistory, setChatHistory] = useState([
    { id: '1', title: 'Welcome Conversation', messages: [] }
  ]);
  const [currentChatId, setCurrentChatId] = useState('1');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false); 
  const [attachedFile, setAttachedFile] = useState(null); 
  const [isListening, setIsListening] = useState(false); 

  // Profile Settings States
  const [showProfile, setShowProfile] = useState(false);
  const [showAboutSubPage, setShowAboutSubPage] = useState(false);
  const [profileName, setProfileName] = useState('Mythili');
  const [profileEmail, setProfileEmail] = useState('24pa1a4520@vishnu.edu.in');
  const [personalizationText, setPersonalizationText] = useState('Always be cheerful, friendly, and address me warmly.');
  const [memories, setMemories] = useState([
    'Enjoys deep technical exploration',
    'Prefers clean structured outputs'
  ]);
  const [newMemory, setNewMemory] = useState('');
  const [showPersonalizationModal, setShowPersonalizationModal] = useState(false);
  const [showMemoriesModal, setShowMemoriesModal] = useState(false);
  const [showAppsModal, setShowAppsModal] = useState(false); 
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // About interactive features state
  const [activeAboutModal, setActiveAboutModal] = useState(null); // 'help' | 'terms' | 'privacy' | 'licenses' | 'version' | null
  const [helpSearchQuery, setHelpSearchQuery] = useState('');
  const [privacyToggles, setPrivacyToggles] = useState({
    dataTraining: true,
    localCache: true,
    telemetry: false
  });

  // Productivity apps connected list state
  const [connectedApps, setConnectedApps] = useState(['Google Drive', 'Google Calendar']); 
  const [appCategoryFilter, setAppCategoryFilter] = useState('All');

  // Appearance & Accent Customizations (FF4081 Rose pink and 111844 Navy base)
  const [appearance, setAppearance] = useState('light'); // 'light' | 'dark' | 'system'
  const [accentColor, setAccentColor] = useState('rose'); // 'rose' (FF4081)
  const [expandedSection, setExpandedSection] = useState(null); 

  const fileInputRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);
  const recognitionRef = useRef(null);

  const currentChat = chatHistory.find(c => c.id === currentChatId) || chatHistory[0];
  const messages = currentChat.messages;

  useEffect(() => {
    const root = document.documentElement;
    if (appearance === 'dark' || (appearance === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark-mode');
    } else {
      root.classList.remove('dark-mode');
    }
  }, [appearance]);

  // Color mapping specs
  const accentHexMap = {
    rose: '#FF4081',
    purple: '#9c27b0',
    emerald: '#10b981',
    indigo: '#6366f1'
  };

  const accentLabelMap = {
    rose: 'Neon Rose (FF4081)',
    purple: 'Royal Purple',
    emerald: 'Mint Emerald',
    indigo: 'Classic Indigo'
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        stopTts(); 
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          handleVoiceSubmit(transcript);
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [messages, activeTool]);

  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      const dummyVoiceAssistantMessage = "Speech recognition is not supported in this browser or permission was denied.";
      setInputValue(dummyVoiceAssistantMessage);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setVoiceEnabled(true);
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start voice listener:", err);
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result.split(',')[1];
      setAttachedFile({
        name: file.name,
        type: file.type,
        base64: base64Data,
        rawUrl: reader.result 
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const playTts = async (textToSpeak) => {
    try {
      if (isTtsPlaying) {
        stopTts();
        return;
      }

      setIsTtsPlaying(true);
      const cleanedText = textToSpeak.replace(/[*#_`]/g, '').substring(0, 300); 
      
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanedText })
      });

      const result = await response.json();
      const pcmBase64 = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!pcmBase64) {
        throw new Error("No speech data received");
      }

      const binaryString = window.atob(pcmBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const sampleRate = 24000;
      const wavBuffer = createWavHeader(bytes.buffer, sampleRate);
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const audioBuffer = await audioContextRef.current.decodeAudioData(wavBuffer);
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
      }
      
      audioSourceRef.current = audioContextRef.current.createBufferSource();
      audioSourceRef.current.buffer = audioBuffer;
      audioSourceRef.current.connect(audioContextRef.current.destination);
      audioSourceRef.current.onended = () => setIsTtsPlaying(false);
      audioSourceRef.current.start();

    } catch (error) {
      console.error("TTS Failed", error);
      setIsTtsPlaying(false);
    }
  };

  const stopTts = () => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
    }
    setIsTtsPlaying(false);
  };

  function createWavHeader(pcmBuffer, sampleRate) {
    const numOfChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (sampleRate * numOfChannels * bitsPerSample) / 8;
    const blockAlign = (numOfChannels * bitsPerSample) / 8;
    const dataSize = pcmBuffer.byteLength;
    const chunkSize = 36 + dataSize;
    
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    
    writeString(view, 0, 'RIFF');
    view.setUint32(4, chunkSize, true);
    writeString(view, 8, 'WAVE');
    
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); 
    view.setUint16(20, 1, true); 
    view.setUint16(22, numOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    
    const combined = new Uint8Array(header.byteLength + pcmBuffer.byteLength);
    combined.set(new Uint8Array(header), 0);
    combined.set(new Uint8Array(pcmBuffer), header.byteLength);
    
    return combined.buffer;
  }

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if ((!inputValue.trim() && !attachedFile) || isLoading) return;

    const userMessageText = inputValue;
    const currentFile = attachedFile; 
    
    setInputValue('');
    setAttachedFile(null);
    setIsLoading(true);

    const updatedMessages = [
      ...messages,
      { 
        id: Date.now().toString(), 
        role: 'user', 
        content: userMessageText, 
        type: activeTool,
        attachment: currentFile ? { name: currentFile.name, type: currentFile.type, rawUrl: currentFile.rawUrl } : null
      }
    ];
    
    updateChatMessages(updatedMessages);

    try {
      if (activeTool === 'image') {
        await generateImage(userMessageText, updatedMessages);
      } else {
        await generateText(userMessageText, updatedMessages, currentFile);
      }
    } catch (error) {
      console.error(error);
      const finalMessages = [
        ...updatedMessages,
        { 
          id: (Date.now() + 1).toString(), 
          role: 'assistant', 
          content: "Sorry, MyAI encountered an issue processing your query. Please try again.", 
          isError: true 
        }
      ];
      updateChatMessages(finalMessages);
      setIsLoading(false);
    }
  };

  const handleVoiceSubmit = async (voiceText) => {
    if (isLoading) return;
    setIsLoading(true);

    const updatedMessages = [
      ...messages,
      { 
        id: Date.now().toString(), 
        role: 'user', 
        content: voiceText, 
        type: activeTool,
        attachment: null
      }
    ];
    
    updateChatMessages(updatedMessages);

    try {
      if (activeTool === 'image') {
        await generateImage(voiceText, updatedMessages);
      } else {
        await generateText(voiceText, updatedMessages, null);
      }
    } catch (error) {
      console.error(error);
      const finalMessages = [
        ...updatedMessages,
        { 
          id: (Date.now() + 1).toString(), 
          role: 'assistant', 
          content: "Sorry, MyAI encountered an issue. Please try speaking again.", 
          isError: true 
        }
      ];
      updateChatMessages(finalMessages);
      setIsLoading(false);
    }
  };

  const generateText = async (promptText, currentMsgList, fileObject) => {
    const customSystemInstruction = `You are MyAI, a delightful, helpful, and highly sophisticated artificial intelligence. Keep responses clear, beautifully structured with clean markdown, and very engaging. Be warm and encouraging.
User Profile context:
- User Name: ${profileName}
- Personalization rule: ${personalizationText}
- Core Memories about user: ${memories.join('; ')}
- Connected Productivity Apps: ${connectedApps.length > 0 ? connectedApps.join(', ') : 'None'}. (If the user asks to manage, list, check schedules, or read documents from any of these connected tools, creatively simulate accessing them with helpful flair!)`;

    const response = await fetch(
      '/api/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemContext: customSystemInstruction,
          activeTool,
          attachment: fileObject ? { name: fileObject.name, type: fileObject.type } : null,
          messages: currentMsgList
            .filter(message => message.role === 'user' || message.role === 'assistant')
            .map(message => ({
              role: message.role,
              content: message.attachment
                ? `${message.content || 'Please analyze the uploaded file.'}\n\nAttached file: ${message.attachment.name} (${message.attachment.type || 'unknown type'}).`
                : message.content
            }))
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to get text response");
    }
    
    const textResponse = result.reply || "I couldn't process that query.";
    const searchGrounding = result.grounding || [];

    const finalMessages = [
      ...currentMsgList,
      { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: textResponse, 
        grounding: searchGrounding,
        type: 'text'
      }
    ];

    updateChatMessages(finalMessages);
    setIsLoading(false);

    if (voiceEnabled) {
      playTts(textResponse);
    }
  };

  const generateImage = async (promptText, currentMsgList) => {
    const placeholderId = (Date.now() + 1).toString();
    const updatedWithPlaceholder = [
      ...currentMsgList,
      {
        id: placeholderId,
        role: 'assistant',
        content: `Generating your beautiful masterpiece: "${promptText}"...`,
        isGeneratingImg: true,
        type: 'image'
      }
    ];
    updateChatMessages(updatedWithPlaceholder);

    try {
      const response = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText })
      });

      if (!response.ok) throw new Error("Failed to generate image");
      const result = await response.json();
      const base64Image = result.image;
      
      if (!base64Image) {
        throw new Error("No image data found in prediction response");
      }

      const imageUrl = `data:image/png;base64,${base64Image}`;

      const finalMessages = updatedWithPlaceholder.map(m => {
        if (m.id === placeholderId) {
          return {
            ...m,
            content: `Here is your custom generated artwork for: "${promptText}"`,
            imageUrl: imageUrl,
            isGeneratingImg: false
          };
        }
        return m;
      });

      updateChatMessages(finalMessages);
    } catch (err) {
      console.error(err);
      const failedMessages = updatedWithPlaceholder.map(m => {
        if (m.id === placeholderId) {
          return {
            ...m,
            content: "Sorry, I couldn't complete your image generation. Please try again with a different description.",
            isGeneratingImg: false,
            isError: true
          };
        }
        return m;
      });
      updateChatMessages(failedMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const updateChatMessages = (newMessages) => {
    setChatHistory(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
        const firstUserMsg = newMessages.find(m => m.role === 'user');
        const title = firstUserMsg 
          ? (firstUserMsg.content.length > 25 ? firstUserMsg.content.substring(0, 22) + "..." : firstUserMsg.content)
          : chat.title;
        return { ...chat, title, messages: newMessages };
      }
      return chat;
    }));
  };

  const handleNewConversation = () => {
    const newId = Date.now().toString();
    const newChat = { id: newId, title: 'New Conversation', messages: [] };
    setChatHistory(prev => [newChat, ...prev]);
    setCurrentChatId(newId);
    setSidebarOpen(false);
    setActiveTool('chat');
    setAttachedFile(null);
  };

  const handleDeleteChat = (idToDelete, e) => {
    e.stopPropagation();
    const filtered = chatHistory.filter(c => c.id !== idToDelete);
    if (filtered.length === 0) {
      const defaultId = Date.now().toString();
      setChatHistory([{ id: defaultId, title: 'Welcome Conversation', messages: [] }]);
      setCurrentChatId(defaultId);
    } else {
      setChatHistory(filtered);
      if (currentChatId === idToDelete) {
        setCurrentChatId(filtered[0].id);
      }
    }
  };

  const triggerQuickAction = (toolName, defaultQuery) => {
    setActiveTool(toolName);
    setInputValue(defaultQuery);
  };

  const handleLogout = () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");
    if (confirmLogout) {
      setChatHistory([{ id: '1', title: 'Welcome Conversation', messages: [] }]);
      setCurrentChatId('1');
      setShowProfile(false);
      setShowAboutSubPage(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-gray-950 font-sans selection:bg-[var(--secondary-color)]/25">
      
      {/* Dynamic style tag for CSS theme variables */}
      <style>{`
        :root {
          --primary-color: #111844;
          --secondary-color: ${accentHexMap[accentColor]};
        }
        
        .dark-mode {
          background-color: #0b0f24 !important;
          color: #f3f4f6 !important;
        }
        .dark-mode .bg-white {
          background-color: #11183c !important;
          color: #f9fafb !important;
        }
        .dark-mode .bg-neutral-50 {
          background-color: #0f1435 !important;
        }
        .dark-mode .text-neutral-800 {
          color: #e5e7eb !important;
        }
        .dark-mode .text-neutral-700 {
          color: #d1d5db !important;
        }
        .dark-mode .text-neutral-905 {
          color: #ffffff !important;
        }
        .dark-mode .border-neutral-200 {
          border-color: #1e295d !important;
        }
        .dark-mode .bg-neutral-100 {
          background-color: #192257 !important;
        }
        .dark-mode .text-neutral-400 {
          color: #9ca3af !important;
        }

        @keyframes soundwave-1 {
          0%, 100% { height: 6px; }
          50% { height: 12px; }
        }
        @keyframes soundwave-2 {
          0%, 100% { height: 12px; }
          50% { height: 4px; }
        }
        @keyframes soundwave-3 {
          0%, 100% { height: 4px; }
          50% { height: 10px; }
        }
        .animate-soundwave-1 {
          animation: soundwave-1 0.8s infinite ease-in-out;
        }
        .animate-soundwave-2 {
          animation: soundwave-2 0.8s infinite ease-in-out;
        }
        .animate-soundwave-3 {
          animation: soundwave-3 0.8s infinite ease-in-out;
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .text-content p {
          margin-bottom: 12px;
        }
        .text-content ul, .text-content ol {
          margin-left: 20px;
          margin-bottom: 12px;
          list-style-type: disc;
        }
      `}</style>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*,application/pdf" 
        className="hidden" 
      />

      {}
      {/* SIDEBAR DRAWER WITH DYNAMIC ACCENTS */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-neutral-50 border-r border-neutral-100 flex flex-col transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-[var(--primary-color)]">
            <Sparkles className="w-5 h-5 text-[var(--secondary-color)] fill-[var(--secondary-color)]/15" />
            <span>MyAI Assistant</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="md:hidden p-1.5 hover:bg-neutral-200 rounded-lg text-neutral-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3">
          <button 
            onClick={() => {
              handleNewConversation();
              setShowProfile(false);
              setShowAboutSubPage(false);
            }}
            className="w-full flex items-center justify-center gap-2 bg-[var(--primary-color)] hover:bg-[var(--secondary-color)] text-white rounded-xl py-3 px-4 font-medium shadow-md transition-all duration-250"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Recent chats</div>
          {chatHistory.map((chat) => (
            <div
              key={chat.id}
              onClick={() => {
                setCurrentChatId(chat.id);
                setShowProfile(false);
                setShowAboutSubPage(false);
                setSidebarOpen(false);
              }}
              className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${chat.id === currentChatId && !showProfile ? 'bg-neutral-200/60 text-[var(--primary-color)] font-semibold' : 'hover:bg-neutral-100 text-neutral-600'}`}
            >
              <div className="flex items-center gap-3 truncate">
                <MessageSquare className={`w-4 h-4 shrink-0 ${chat.id === currentChatId && !showProfile ? 'text-[var(--secondary-color)]' : 'text-neutral-400'}`} />
                <span className="truncate text-sm">{chat.title}</span>
              </div>
              <button 
                onClick={(e) => handleDeleteChat(chat.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-neutral-200 text-neutral-400 hover:text-[var(--secondary-color)] rounded transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-neutral-100 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--primary-color)] to-[var(--secondary-color)] flex items-center justify-center text-white font-bold text-sm shadow-inner">
                AI
              </div>
              <div className="cursor-pointer" onClick={() => { setShowProfile(true); setShowAboutSubPage(false); setSidebarOpen(false); }}>
                <p className="text-xs font-semibold text-neutral-700">{profileName}</p>
                <p className="text-[10px] text-[var(--secondary-color)] flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--secondary-color)] inline-block animate-pulse"></span>
                  MyAI Settings
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`p-2 rounded-full transition-all ${voiceEnabled ? 'bg-[var(--secondary-color)]/15 text-[var(--secondary-color)]' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'}`}
              title={voiceEnabled ? "Mute automatic reading" : "Read assistant messages aloud"}
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {}
      {/* MAIN SCREEN CANVAS */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white relative">
        
        {showProfile ? (
          /* PROFILE VIEW AND ABOUT SUB-PAGES COMPILATION */
          showAboutSubPage ? (
            /* ABOUT SCREEN EXACT GROUPING AS SHOWN IN WhatsApp Image 2026-05-28 at 18.05.29.jpeg */
            <div className="flex-1 overflow-y-auto bg-neutral-50/50 flex flex-col animate-fade-in">
              {/* Back navigation header */}
              <div className="p-4 flex items-center justify-between border-b border-neutral-100 bg-white shadow-sm">
                <button 
                  onClick={() => setShowAboutSubPage(false)}
                  className="p-2.5 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-full shadow-sm text-neutral-800 transition-all"
                  title="Return to Preferences"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <h2 className="text-base font-bold text-neutral-800">About</h2>
                <div className="w-10"></div> {/* Spacer for symmetry */}
              </div>

              {/* Sub-page items container aligned with screenshot */}
              <div className="max-w-xl w-full mx-auto px-4 py-8 space-y-6">
                
                {/* PRIMARY CARD GROUP (Consolidated stack) */}
                <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm divide-y divide-neutral-100">
                  
                  {/* Help center */}
                  <button 
                    onClick={() => setActiveAboutModal('help')}
                    className="w-full flex items-center justify-between p-4 hover:bg-neutral-50/80 transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-neutral-100 text-neutral-800 rounded-xl">
                        <HelpCircle className="w-5 h-5 text-neutral-700" />
                      </div>
                      <span className="text-sm font-semibold text-neutral-800">Help center</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </button>

                  {/* Terms of use */}
                  <button 
                    onClick={() => setActiveAboutModal('terms')}
                    className="w-full flex items-center justify-between p-4 hover:bg-neutral-50/80 transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-neutral-100 text-neutral-800 rounded-xl">
                        <BookOpen className="w-5 h-5 text-neutral-700" />
                      </div>
                      <span className="text-sm font-semibold text-neutral-800">Terms of use</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </button>

                  {/* Privacy policy */}
                  <button 
                    onClick={() => setActiveAboutModal('privacy')}
                    className="w-full flex items-center justify-between p-4 hover:bg-neutral-50/80 transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      {/* High-fidelity custom spectacles outline icon for privacy policy */}
                      <div className="p-2.5 bg-neutral-100 text-neutral-800 rounded-xl">
                        <div className="flex items-center justify-center w-5 h-5">
                          <svg className="w-5 h-5 text-neutral-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5V12m0 0l-4-4m4 4l4-4M3 12h18M5 19h14" />
                          </svg>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-neutral-800">Privacy policy</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </button>

                  {/* Licenses */}
                  <button 
                    onClick={() => setActiveAboutModal('licenses')}
                    className="w-full flex items-center justify-between p-4 hover:bg-neutral-50/80 transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-neutral-100 text-neutral-800 rounded-xl">
                        <FileCode className="w-5 h-5 text-neutral-700" />
                      </div>
                      <span className="text-sm font-semibold text-neutral-800">Licenses</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </button>

                </div>

                {/* SECONDARY CARD GROUP (Standalone Version Card) */}
                <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm p-4 hover:bg-neutral-50/80 transition-all text-left flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Circle icon as shown in screenshot */}
                    <div className="p-2.5 bg-neutral-100 text-neutral-800 rounded-xl">
                      <div className="w-5 h-5 rounded-full border-2 border-neutral-600 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-600"></span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-800">MyAI for Android</p>
                      <p className="text-xs text-neutral-400 mt-0.5">1.2026.125 (19)</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveAboutModal('version')}
                    className="bg-[var(--secondary-color)] text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm hover:opacity-90 transition-all"
                  >
                    Build Info
                  </button>
                </div>

              </div>
            </div>
          ) : (
            /* STANDARD MAIN PROFILE MENU SETTINGS SCREEN */
            <div className="flex-1 overflow-y-auto bg-neutral-50/50 flex flex-col animate-fade-in">
              
              <div className="p-4 flex items-center">
                <button 
                  onClick={() => setShowProfile(false)}
                  className="p-2.5 bg-white border border-neutral-200 hover:bg-neutral-100 rounded-full shadow-sm text-[var(--primary-color)] transition-all"
                  title="Go back to Chat"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
              </div>

              {/* Profile Avatar & Name Area */}
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-[#9c27b0] flex items-center justify-center text-white text-3xl font-semibold shadow-md">
                    {profileName.substring(0, 2).toUpperCase()}
                  </div>
                  <button 
                    onClick={() => {
                      const newName = prompt("Enter new profile name:", profileName);
                      if (newName) setProfileName(newName);
                    }}
                    className="absolute bottom-0 right-0 p-2 bg-white border border-neutral-200 rounded-full shadow-md hover:bg-neutral-50 transition-all text-[var(--primary-color)]"
                    title="Edit Name"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
                <h2 className="text-xl font-bold text-neutral-900 mt-4 tracking-tight">{profileName}</h2>
              </div>

              {/* Content Container */}
              <div className="max-w-xl w-full mx-auto px-4 pb-16 space-y-6">
                
                {/* Category 1: My MyAI */}
                <div>
                  <h3 className="text-sm font-semibold text-neutral-400 mb-2 px-1 uppercase tracking-wider">My MyAI</h3>
                  
                  <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm divide-y divide-neutral-100">
                    
                    {/* Personalization Row */}
                    <button 
                      onClick={() => setShowPersonalizationModal(true)}
                      className="w-full flex items-center justify-between p-4 hover:bg-neutral-50/80 transition-all text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-neutral-100 text-neutral-800 rounded-xl">
                          <svg className="w-5 h-5 text-neutral-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-neutral-800">Personalization</p>
                          <p className="text-xs text-neutral-400">Instruct MyAI on custom rules & behavior</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-400" />
                    </button>

                    {/* Memories Row */}
                    <button 
                      onClick={() => setShowMemoriesModal(true)}
                      className="w-full flex items-center justify-between p-4 hover:bg-neutral-50/80 transition-all text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-neutral-100 text-neutral-800 rounded-xl">
                          <svg className="w-5 h-5 text-neutral-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-neutral-800">Memories</p>
                          <p className="text-xs text-neutral-400">{memories.length} facts remembered about you</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-400" />
                    </button>

                    {/* Apps Row */}
                    <button 
                      onClick={() => setShowAppsModal(true)}
                      className="w-full flex items-center justify-between p-4 hover:bg-neutral-50/80 transition-all text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-neutral-100 text-neutral-800 rounded-xl">
                          <svg className="w-5 h-5 text-neutral-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-neutral-800">Apps & Extensions</p>
                          <p className="text-xs text-neutral-400">
                            {connectedApps.length === 0 ? 'No workspace integrations active' : `${connectedApps.length} tools connected`}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-white bg-[var(--secondary-color)] px-2.5 py-1 rounded-full shadow-sm">
                        Configure
                      </span>
                    </button>

                  </div>
                </div>

                {/* Category 2: Customizations */}
                <div>
                  <h3 className="text-sm font-semibold text-neutral-400 mb-2 px-1 uppercase tracking-wider">Customization</h3>
                  
                  <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm divide-y divide-neutral-100">
                    
                    {/* Appearance Selector Dropdown */}
                    <div className="flex flex-col">
                      <button 
                        onClick={() => setExpandedSection(expandedSection === 'appearance' ? null : 'appearance')}
                        className="w-full flex items-center justify-between p-4 hover:bg-neutral-50/80 transition-all text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-neutral-100 text-neutral-800 rounded-xl">
                            <Sun className="w-5 h-5 text-neutral-700" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-neutral-800">Appearance</p>
                            <p className="text-xs text-neutral-400">
                              {appearance === 'light' ? 'Light Theme' : appearance === 'dark' ? 'Dark Theme' : 'System (Default)'}
                            </p>
                          </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${expandedSection === 'appearance' ? 'rotate-180' : ''}`} />
                      </button>

                      {expandedSection === 'appearance' && (
                        <div className="bg-neutral-50/80 px-4 py-2 flex gap-2 justify-center border-t border-neutral-100">
                          {['light', 'dark', 'system'].map((theme) => (
                            <button
                              key={theme}
                              onClick={() => {
                                setAppearance(theme);
                                setExpandedSection(null);
                              }}
                              className={`flex-1 text-center py-2 text-xs font-semibold rounded-xl border transition-all ${appearance === theme ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-white' : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100'}`}
                            >
                              {theme === 'system' ? 'System' : theme.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Accent Color Selection Tool */}
                    <div className="flex flex-col">
                      <button 
                        onClick={() => setExpandedSection(expandedSection === 'accent' ? null : 'accent')}
                        className="w-full flex items-center justify-between p-4 hover:bg-neutral-50/80 transition-all text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-neutral-100 text-neutral-800 rounded-xl">
                            <Palette className="w-5 h-5 text-neutral-700" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-neutral-800">Accent color</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span 
                                className="w-2.5 h-2.5 rounded-full inline-block border border-black/10" 
                                style={{ backgroundColor: accentHexMap[accentColor] }}
                              />
                              <p className="text-xs text-neutral-400">{accentLabelMap[accentColor]}</p>
                            </div>
                          </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${expandedSection === 'accent' ? 'rotate-180' : ''}`} />
                      </button>

                      {expandedSection === 'accent' && (
                        <div className="bg-neutral-50/80 px-4 py-3 border-t border-neutral-100">
                          <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-2 text-center">Select Accent Glow</p>
                          <div className="grid grid-cols-4 gap-2">
                            {Object.keys(accentHexMap).map((colorKey) => (
                              <button
                                key={colorKey}
                                onClick={() => {
                                  setAccentColor(colorKey);
                                  setExpandedSection(null);
                                }}
                                className={`flex flex-col items-center p-2 rounded-xl border transition-all bg-white ${accentColor === colorKey ? 'border-[var(--primary-color)] ring-2 ring-[var(--primary-color)]/10' : 'border-neutral-200 hover:bg-neutral-100'}`}
                              >
                                <span 
                                  className="w-6 h-6 rounded-full border border-black/5 shadow-sm" 
                                  style={{ backgroundColor: accentHexMap[colorKey] }}
                                />
                                <span className="text-[8px] uppercase font-bold text-neutral-500 mt-1">{colorKey}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* Category 3: Preferences & Sub-Pages */}
                <div>
                  <h3 className="text-sm font-semibold text-neutral-400 mb-2 px-1 uppercase tracking-wider">Preferences</h3>
                  
                  <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm divide-y divide-neutral-100">
                    
                    {/* General settings */}
                    <div className="w-full flex items-center justify-between p-4 hover:bg-neutral-50/50 transition-all cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-neutral-100 text-neutral-800 rounded-xl">
                          <Settings className="w-5 h-5 text-neutral-700" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-neutral-800">General</p>
                          <p className="text-xs text-neutral-400">Configure engine speeds, notifications, and prompts</p>
                        </div>
                      </div>
                    </div>

                    {/* Voice setting */}
                    <div 
                      onClick={() => setVoiceEnabled(!voiceEnabled)}
                      className="w-full flex items-center justify-between p-4 hover:bg-neutral-50/50 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-neutral-100 text-neutral-800 rounded-xl">
                          <Volume2 className="w-5 h-5 text-neutral-700" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-neutral-800">Voice</p>
                          <p className="text-xs text-neutral-400">Currently: {voiceEnabled ? 'Hands-Free Speech On' : 'Silent Chat Log Only'}</p>
                        </div>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full ${voiceEnabled ? 'bg-[var(--secondary-color)] animate-ping' : 'bg-neutral-300'}`} />
                    </div>

                    {/* Data controls */}
                    <div className="w-full flex items-center justify-between p-4 hover:bg-neutral-50/50 transition-all cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-neutral-100 text-neutral-800 rounded-xl">
                          <Database className="w-5 h-5 text-neutral-700" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-neutral-800">Data controls</p>
                          <p className="text-xs text-neutral-400">Download or clear conversation caches</p>
                        </div>
                      </div>
                    </div>

                    {/* Security */}
                    <div className="w-full flex items-center justify-between p-4 hover:bg-neutral-50/50 transition-all cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-neutral-100 text-neutral-800 rounded-xl">
                          <Shield className="w-5 h-5 text-neutral-700" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-neutral-800">Security</p>
                          <p className="text-xs text-neutral-400">Update credentials and delegacy codes</p>
                        </div>
                      </div>
                    </div>

                    {/* Report bug */}
                    <div 
                      onClick={() => alert("Telemetry analytics report dispatched successfully.")}
                      className="w-full flex items-center justify-between p-4 hover:bg-neutral-50/50 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-neutral-100 text-neutral-800 rounded-xl">
                          <Bug className="w-5 h-5 text-neutral-700" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-neutral-800">Report bug</p>
                          <p className="text-xs text-neutral-400">Flag glitches or upload console logs</p>
                        </div>
                      </div>
                    </div>

                    {/* About setting row -> MOVES TO ABOUT SUB-PAGE AS SHOWN IN SCREENSHOT */}
                    <button 
                      onClick={() => setShowAboutSubPage(true)}
                      className="w-full flex items-center justify-between p-4 hover:bg-neutral-50/50 transition-all text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-neutral-100 text-neutral-800 rounded-xl">
                          <Info className="w-5 h-5 text-neutral-700" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-neutral-800">About</p>
                          <p className="text-xs text-neutral-400">Help center, legal policy rules, and version code</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-400" />
                    </button>

                  </div>
                </div>

                {/* Log Out Button Group */}
                <div className="pt-2">
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2.5 bg-red-50 hover:bg-red-100 border border-red-200/50 text-red-600 rounded-3xl py-4 font-semibold shadow-sm transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Log out</span>
                  </button>
                </div>

              </div>

            </div>
          )
        ) : (
          /* STANDARD CHAT VIEW PANEL */
          <>
            {/* HEADER BAR */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-50 md:py-4">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="p-2.5 bg-white border border-neutral-100 hover:bg-neutral-50 text-neutral-700 rounded-full shadow-sm hover:shadow transition-all"
              >
                <Menu className="w-5 h-5 text-[var(--primary-color)]" />
              </button>

              <div 
                onClick={() => setShowUpgradeModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[var(--primary-color)]/5 to-[var(--secondary-color)]/5 hover:from-[var(--primary-color)]/10 hover:to-[var(--secondary-color)]/10 text-[var(--primary-color)] rounded-full border border-[var(--secondary-color)]/20 font-semibold text-xs sm:text-sm cursor-pointer shadow-sm transition-all duration-200"
              >
                <Sparkles className="w-3.5 h-3.5 text-[var(--secondary-color)] fill-[var(--secondary-color)]/20" />
                <span>MyAI</span>
              </div>

              {/* DASHED CIRCLE PROFILE BUTTON */}
              <button 
                onClick={() => {
                  setShowProfile(true);
                  setShowAboutSubPage(false);
                }} 
                className="p-2 w-10 h-10 bg-white border border-neutral-100 hover:bg-neutral-50 text-neutral-700 rounded-full shadow-sm hover:shadow transition-all flex items-center justify-center"
                title="Open Settings Profile"
              >
                <svg className="w-6 h-6 text-neutral-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" strokeDasharray="4 4" />
                  <circle cx="12" cy="12" r="3.5" />
                </svg>
              </button>
            </header>

            {/* SCROLLABLE DIALOG CONTROLLER */}
            <div className="flex-1 overflow-y-auto px-4 py-6 md:px-12 lg:px-24">
              
              {messages.length === 0 ? (
                /* EMPTY/HOME STATE */
                <div className="max-w-2xl mx-auto h-full flex flex-col justify-end pb-12 animate-fade-in">
                  
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-4 mb-8">
                    <div className="w-16 h-16 bg-neutral-50 border border-neutral-150 text-[var(--primary-color)] rounded-3xl flex items-center justify-center shadow-sm mb-4">
                      <Sparkles className="w-8 h-8 text-[var(--secondary-color)]" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--primary-color)]">How can I help today?</h1>
                    <p className="text-sm text-neutral-500 mt-2 max-w-sm">Tap the plus to add files, select smart paths below, or simply begin speaking.</p>
                  </div>

                  {/* Shortcuts list */}
                  <div className="space-y-3 mb-8">
                    
                    <button 
                      onClick={() => triggerQuickAction('image', 'An aesthetic workspace in a high-rise building with large windows overlooking a rainy Tokyo street at night')}
                      className="w-full flex items-center justify-between p-4 bg-white hover:bg-neutral-50/50 rounded-2xl border border-neutral-200 text-left transition-all group hover:border-[var(--secondary-color)]/50 duration-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-neutral-100 rounded-xl text-neutral-800 group-hover:bg-[var(--secondary-color)]/10 group-hover:text-[var(--secondary-color)] transition-colors">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">Create an image</p>
                          <p className="text-xs text-neutral-500 mt-0.5">Visualize layout styles, creative concepts, or characters</p>
                        </div>
                      </div>
                    </button>

                    <button 
                      onClick={() => triggerQuickAction('write', `Write a lovely welcome message for ${profileName}`)}
                      className="w-full flex items-center justify-between p-4 bg-white hover:bg-neutral-50/50 rounded-2xl border border-neutral-200 text-left transition-all group hover:border-[var(--secondary-color)]/50 duration-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-neutral-100 rounded-xl text-neutral-800 group-hover:bg-[var(--secondary-color)]/10 group-hover:text-[var(--secondary-color)] transition-colors">
                          <PenTool className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">Write or edit</p>
                          <p className="text-xs text-neutral-500 mt-0.5">Draft essays, rewrite PDFs, or proofread text structures</p>
                        </div>
                      </div>
                    </button>

                    <button 
                      onClick={() => triggerQuickAction('search', 'What are the upcoming space missions scheduled for next year?')}
                      className="w-full flex items-center justify-between p-4 bg-white hover:bg-neutral-50/50 rounded-2xl border border-neutral-200 text-left transition-all group hover:border-[var(--secondary-color)]/50 duration-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-neutral-100 rounded-xl text-neutral-800 group-hover:bg-[var(--secondary-color)]/10 group-hover:text-[var(--secondary-color)] transition-colors">
                          <Globe className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">Look something up</p>
                          <p className="text-xs text-neutral-500 mt-0.5">Ground answers using live global Google Search queries</p>
                        </div>
                      </div>
                    </button>

                  </div>

                </div>
              ) : (
                /* ACTIVE CHAT DISPLAY */
                <div className="max-w-2xl mx-auto space-y-6 pb-12">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      
                      {/* User content block */}
                      {msg.role === 'user' && (
                        <div className="max-w-[85%] bg-neutral-100 rounded-2xl px-4 py-3 text-sm text-neutral-800 shadow-sm relative group flex flex-col gap-2 border border-neutral-200/80">
                          <div className="flex items-center gap-2">
                            {msg.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-[var(--secondary-color)]" />}
                            {msg.type === 'search' && <Globe className="w-3.5 h-3.5 text-emerald-500" />}
                            {msg.type === 'write' && <PenTool className="w-3.5 h-3.5 text-[var(--secondary-color)]" />}
                            <span className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
                              {msg.type || 'Chat'}
                            </span>
                          </div>

                          {msg.attachment && (
                            <div className="flex items-center gap-2 p-1.5 bg-white border border-neutral-200 rounded-xl max-w-full">
                              {msg.attachment.type.startsWith('image/') ? (
                                <img src={msg.attachment.rawUrl} alt="Attached file" className="w-10 h-10 object-cover rounded-lg shrink-0" />
                              ) : (
                                <div className="w-10 h-10 bg-neutral-100 text-[var(--secondary-color)] rounded-lg flex items-center justify-center shrink-0">
                                  <FileText className="w-5 h-5" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-neutral-800 truncate">{msg.attachment.name}</p>
                                <p className="text-[9px] text-neutral-400 uppercase font-sans">Uploaded Attachment</p>
                              </div>
                            </div>
                          )}

                          {msg.content && <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                        </div>
                      )}

                      {/* Assistant content block */}
                      {msg.role === 'assistant' && (
                        <div className="max-w-[90%] w-full flex gap-3 items-start">
                          
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--primary-color)] to-[var(--secondary-color)] text-white flex items-center justify-center text-[10px] font-bold shadow-md shrink-0">
                            MyAI
                          </div>

                          <div className="flex-1 space-y-3 bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm hover:shadow transition-all">
                            
                            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                              <span className="text-[10px] font-semibold text-[var(--primary-color)] uppercase tracking-wider">Assistant Response</span>
                              <div className="flex items-center gap-1.5">
                                <button 
                                  onClick={() => playTts(msg.content)} 
                                  className={`p-1.5 rounded-lg text-neutral-400 hover:text-[var(--secondary-color)] hover:bg-neutral-50 transition-all ${isTtsPlaying ? 'text-[var(--secondary-color)] bg-[var(--secondary-color)]/10 animate-pulse' : ''}`}
                                  title="Listen to response"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {msg.isGeneratingImg ? (
                              <div className="flex flex-col items-center justify-center py-6 text-neutral-600 space-y-2">
                                <RefreshCw className="w-6 h-6 animate-spin text-[var(--secondary-color)]" />
                                <p className="text-xs font-medium text-neutral-500">Creating custom pixels...</p>
                              </div>
                            ) : (
                              <div className="text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap text-content">
                                {msg.content}
                              </div>
                            )}

                            {msg.imageUrl && (
                              <div className="mt-3 rounded-xl overflow-hidden bg-neutral-50 border border-neutral-200 shadow-inner group relative">
                                <img 
                                  src={msg.imageUrl} 
                                  alt="Generated by MyAI" 
                                  className="w-full max-h-96 object-cover object-center transition-all duration-300 hover:scale-[1.02]"
                                />
                                <a 
                                  href={msg.imageUrl} 
                                  download="myai-artwork.png" 
                                  className="absolute bottom-3 right-3 bg-[var(--primary-color)]/95 hover:bg-[var(--secondary-color)] text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm transition-all font-medium shadow-md"
                                >
                                  Download Image
                                </a>
                              </div>
                            )}

                            {msg.grounding && msg.grounding.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-neutral-100">
                                <p className="text-[10px] font-semibold text-neutral-400 flex items-center gap-1 mb-2">
                                  <Search className="w-3 h-3 text-[var(--secondary-color)]" /> Grounded Search Sources:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {msg.grounding.slice(0, 3).map((source, idx) => (
                                    <a 
                                      key={idx} 
                                      href={source.uri} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100 text-[11px] text-neutral-800 font-semibold rounded-md hover:bg-neutral-200 border border-neutral-300 transition-all truncate max-w-xs"
                                    >
                                      <Globe className="w-2.5 h-2.5 text-[var(--secondary-color)]" />
                                      <span className="truncate">{source.title || "Reference Source"}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                          </div>

                        </div>
                      )}

                    </div>
                  ))}

                  {isLoading && !messages[messages.length - 1]?.isGeneratingImg && (
                    <div className="flex gap-3 items-start animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--primary-color)] to-[var(--secondary-color)] text-white flex items-center justify-center text-[10px] font-bold shadow-md shrink-0">
                        MyAI
                      </div>
                      <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 shadow-sm w-32 flex items-center justify-center space-x-1.5">
                        <span className="w-2 h-2 bg-[var(--primary-color)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-[var(--secondary-color)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-[var(--primary-color)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}

            </div>

            {/* BOTTOM INPUT CONSOLE */}
            <div className="px-4 pb-6 pt-2 bg-white border-t border-neutral-150 md:px-12 lg:px-24">
              <div className="max-w-2xl mx-auto">
                
                {/* Mode Tagbar */}
                <div className="flex items-center gap-2 mb-2 px-2.5">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Mode:</span>
                  <div className="flex gap-1">
                    {[
                      { name: 'chat', label: 'Chat', color: 'bg-[var(--primary-color)] text-white border-[var(--primary-color)]' },
                      { name: 'image', label: 'Image Creator', color: 'bg-[var(--secondary-color)] text-white border-[var(--secondary-color)]' },
                      { name: 'search', label: 'Web Search', color: 'bg-neutral-200 text-neutral-800 border-neutral-400' },
                      { name: 'write', label: 'Document Write', color: 'bg-neutral-800 text-white border-neutral-800' }
                    ].map((t) => (
                      <button
                        key={t.name}
                        onClick={() => setActiveTool(t.name)}
                        className={`px-2 py-0.5 text-[10px] font-bold border rounded-md transition-all ${activeTool === t.name ? t.color : 'bg-transparent text-neutral-500 border-transparent hover:bg-neutral-100'}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload preview */}
                {attachedFile && (
                  <div className="flex items-center gap-2 mb-3.5 p-2.5 bg-neutral-100 border border-neutral-300 rounded-2xl max-w-sm animate-fade-in relative group">
                    {attachedFile.type.startsWith('image/') ? (
                      <img src={attachedFile.rawUrl} alt="preview" className="w-12 h-12 object-cover rounded-lg shadow-sm" />
                    ) : (
                      <div className="w-12 h-12 bg-neutral-200 text-neutral-800 rounded-lg flex flex-col items-center justify-center font-bold text-xs shrink-0 shadow-sm border border-neutral-300">
                        <FileText className="w-6 h-6 text-neutral-800" />
                        <span className="text-[8px] uppercase tracking-wider">PDF</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0 pr-6">
                      <p className="text-xs font-bold text-neutral-800 truncate">{attachedFile.name}</p>
                      <p className="text-[9px] text-neutral-500 uppercase font-sans font-semibold tracking-wider">Ready to upload</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setAttachedFile(null)}
                      className="absolute right-2 p-1 bg-white border border-neutral-300 rounded-full text-neutral-400 hover:text-[var(--secondary-color)] shadow-sm transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Floating input bar */}
                <form onSubmit={handleSubmit} className="flex items-center justify-between gap-2.5 bg-white border border-neutral-300 rounded-full px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-[var(--secondary-color)]/15 focus-within:border-[var(--secondary-color)] transition-all">
                  
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    className="p-2 text-neutral-400 hover:text-[var(--secondary-color)] hover:bg-neutral-100 rounded-full transition-all shrink-0"
                    title="Upload PDF or Image attachment"
                  >
                    <Plus className="w-5 h-5 text-neutral-800 stroke-[2.5]" />
                  </button>

                  <input 
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={isListening ? "Listening... Speak now!" : "Ask MyAI"}
                    className="flex-1 bg-transparent border-none outline-none text-sm text-neutral-800 placeholder-neutral-400 py-1"
                    disabled={isLoading}
                  />

                  <button 
                    type="button"
                    onClick={toggleListening}
                    className={`p-2 rounded-full transition-all shrink-0 relative ${isListening ? 'bg-[var(--secondary-color)] text-white animate-pulse' : 'text-neutral-400 hover:text-[var(--secondary-color)] hover:bg-neutral-100'}`}
                    title={isListening ? "Stop listening" : "Start Voice Assistant"}
                  >
                    <Mic className={`w-5 h-5 ${isListening ? 'scale-110 text-white' : 'text-neutral-800'}`} />
                    {isListening && (
                      <span className="absolute -inset-1 bg-[var(--secondary-color)]/30 rounded-full animate-ping -z-10"></span>
                    )}
                  </button>

                  {(inputValue.trim() || attachedFile) ? (
                    <button 
                      type="submit"
                      className="w-10 h-10 bg-[var(--secondary-color)] hover:bg-[var(--secondary-color)]/90 text-white rounded-full flex items-center justify-center transition-all shadow-md shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => playTts(`Hello ${profileName}! I am MyAI. You can tap the microphone to chat with me using your voice, or click the plus symbol to upload images and files.`)}
                      className={`w-9 h-9 bg-neutral-905 text-white rounded-full flex items-center justify-center hover:bg-[var(--primary-color)] transition-all shrink-0 shadow ${isTtsPlaying ? 'animate-pulse scale-105 bg-[var(--secondary-color)]' : ''}`}
                      title="Play info summary speech"
                    >
                      <div className="flex gap-0.5 items-end h-3">
                        <span className={`w-0.5 bg-white rounded-full ${isTtsPlaying ? 'animate-soundwave-1' : 'h-2'}`}></span>
                        <span className={`w-0.5 bg-white rounded-full ${isTtsPlaying ? 'animate-soundwave-2' : 'h-3'}`}></span>
                        <span className={`w-0.5 bg-white rounded-full ${isTtsPlaying ? 'animate-soundwave-3' : 'h-1.5'}`}></span>
                        <span className={`w-0.5 bg-white rounded-full ${isTtsPlaying ? 'animate-soundwave-2' : 'h-2.5'}`}></span>
                      </div>
                    </button>
                  )}

                </form>
              </div>
            </div>
          </>
        )}

      </div>

      {}
      {/* DYNAMIC SETTINGS INTERACTION OVERLAY MODALS */}

      {/* INTERACTIVE ABOUT MODALS COMPILATION */}
      {activeAboutModal === 'help' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-150 animate-fade-in">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2">
              <h3 className="text-base font-bold text-neutral-800 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[var(--secondary-color)]" />
                MyAI Help Center
              </h3>
              <button onClick={() => setActiveAboutModal(null)} className="p-1.5 hover:bg-neutral-100 rounded-xl text-neutral-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="relative mb-4">
              <input 
                type="text" 
                value={helpSearchQuery}
                onChange={(e) => setHelpSearchQuery(e.target.value)}
                placeholder="Search queries, tools, models..." 
                className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[var(--secondary-color)]"
              />
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {[
                { q: "How to use the voice assistant?", a: "Tap the Microphone symbol on the bottom chat bar. Grant microphone access to search or converse with MyAI hands-free!" },
                { q: "What format of files are accepted?", a: "The plus (+) symbol accepts high-resolution images (PNG, JPEG, WEBP) as well as document formats such as PDF files." },
                { q: "How do I change the theme accent?", a: "Head into Settings (dashed-circle) and open the Customization category to switch the theme and custom accent colors instantly!" },
                { q: "Are workspaces synchronized?", a: "Yes, once connected in the Apps directory, MyAI dynamically references Google Drive, Calendars, Slack, and Gmail in context." }
              ]
              .filter(item => item.q.toLowerCase().includes(helpSearchQuery.toLowerCase()) || item.a.toLowerCase().includes(helpSearchQuery.toLowerCase()))
              .map((item, idx) => (
                <div key={idx} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                  <p className="text-xs font-bold text-neutral-800 mb-1">Q: {item.q}</p>
                  <p className="text-[11px] text-neutral-500 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeAboutModal === 'terms' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-150 flex flex-col max-h-[80vh] animate-fade-in">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2 shrink-0">
              <h3 className="text-base font-bold text-neutral-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[var(--secondary-color)]" />
                Terms of Use
              </h3>
              <button onClick={() => setActiveAboutModal(null)} className="p-1.5 hover:bg-neutral-100 rounded-xl text-neutral-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1 text-[11px] text-neutral-600 space-y-3 leading-relaxed">
              <p className="font-bold text-neutral-800 text-xs">Last Updated: May 2026</p>
              <p>Welcome to MyAI. By utilizing our local generative features, you agree to comply with the terms detailed below.</p>
              <h4 className="font-bold text-neutral-700">1. Services and Intelligence</h4>
              <p>MyAI provides conversational access utilizing experimental multi-modal capabilities. All generated text outputs and artwork representations are provided as-is without representations of correctness.</p>
              <h4 className="font-bold text-neutral-700">2. Upload Integrity</h4>
              <p>You bear responsibility for the files and images uploaded via the plus (+) interface. Uploading malware, copyright-infringing content, or unlawful imagery is strictly forbidden.</p>
              <h4 className="font-bold text-neutral-700">3. Workspace Synchronization</h4>
              <p>Connections to Google Drive, Calendar, Notion, or Slack are handled through secure OAuth pipelines. Disconnecting any integrated product immediately terminates read/write synchronization tokens.</p>
            </div>
            
            <div className="mt-4 pt-3 border-t border-neutral-100 text-right shrink-0">
              <button 
                onClick={() => setActiveAboutModal(null)}
                className="bg-[var(--primary-color)] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[var(--secondary-color)] transition-all"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {activeAboutModal === 'privacy' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-150 animate-fade-in">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2">
              <h3 className="text-base font-bold text-neutral-800 flex items-center gap-2">
                <Lock className="w-5 h-5 text-[var(--secondary-color)]" />
                Privacy & Data Controls
              </h3>
              <button onClick={() => setActiveAboutModal(null)} className="p-1.5 hover:bg-neutral-100 rounded-xl text-neutral-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-[11px] text-neutral-500 mb-4 leading-relaxed">
              Configure parameters regarding how your dialog feeds, files, and voice audio snippets are handled.
            </p>

            <div className="space-y-3">
              {[
                { key: 'dataTraining', label: "Share data for model training", desc: "Allow Gemini models to study files and custom instructions to improve overall intelligence." },
                { key: 'localCache', label: "Local Conversation caching", desc: "Keep dialogues in browser cookies for faster startup and persistence." },
                { key: 'telemetry', label: "Anonymous telemetry tracking", desc: "Send crash notifications and rendering stats to diagnostics." }
              ].map(toggle => (
                <div key={toggle.key} className="flex items-start justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="pr-4">
                    <p className="text-xs font-bold text-neutral-800">{toggle.label}</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5 leading-tight">{toggle.desc}</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={privacyToggles[toggle.key]}
                    onChange={() => setPrivacyToggles({ ...privacyToggles, [toggle.key]: !privacyToggles[toggle.key] })}
                    className="w-4 h-4 rounded mt-1 accent-[var(--secondary-color)] cursor-pointer"
                  />
                </div>
              ))}
            </div>
            
            <div className="mt-5 text-right">
              <button 
                onClick={() => {
                  alert("Privacy configurations synchronized securely.");
                  setActiveAboutModal(null);
                }}
                className="bg-[var(--secondary-color)] text-white text-xs font-bold px-4 py-2 rounded-xl shadow hover:opacity-90 transition-all"
              >
                Apply Data Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {activeAboutModal === 'licenses' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-150 flex flex-col max-h-[80vh] animate-fade-in">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2 shrink-0">
              <h3 className="text-base font-bold text-neutral-800 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-[var(--secondary-color)]" />
                Software Licensing
              </h3>
              <button onClick={() => setActiveAboutModal(null)} className="p-1.5 hover:bg-neutral-100 rounded-xl text-neutral-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 text-[11px] text-neutral-600">
              <p>MyAI builds upon high-grade open-source libraries. Licensing structures are compiled below:</p>
              
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                <p className="font-bold text-neutral-800 text-xs">React Library</p>
                <p className="text-[10px] text-neutral-400 font-mono">MIT License | Copyright (c) Meta Platforms, Inc.</p>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                <p className="font-bold text-neutral-800 text-xs">Tailwind CSS framework</p>
                <p className="text-[10px] text-neutral-400 font-mono">MIT License | Copyright (c) Tailwind Labs</p>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                <p className="font-bold text-neutral-800 text-xs">Lucide Icons package</p>
                <p className="text-[10px] text-neutral-400 font-mono">ISC License | Copyright (c) Lucide Contributors</p>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                <p className="font-bold text-neutral-800 text-xs">Gemini Flash API Wrapper</p>
                <p className="text-[10px] text-neutral-400 font-mono">Apache License 2.0 | Copyright (c) Google LLC</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeAboutModal === 'version' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-neutral-150 text-center animate-fade-in">
            <div className="w-12 h-12 bg-neutral-100 text-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <div className="w-6 h-6 rounded-full border-2 border-neutral-600 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-600"></span>
              </div>
            </div>
            <h3 className="text-base font-bold text-neutral-800">MyAI for Android</h3>
            <p className="text-xs text-neutral-400 mt-1 font-mono">Build ID: 1.2026.125 (19)</p>
            
            <div className="bg-neutral-50 rounded-2xl p-4 my-4 text-left border border-neutral-200 space-y-1.5 text-[11px] text-neutral-600">
              <p><strong>Device architecture:</strong> ARM64-v8a</p>
              <p><strong>SDK Level:</strong> Target Android 14 (API 34)</p>
              <p><strong>Engine release:</strong> Stable v3.4.1</p>
              <p><strong>API endpoint:</strong> Google Flash 2.5 Multi-Modal</p>
            </div>

            <button 
              onClick={() => {
                alert("You are running the most up-to-date stable release.");
                setActiveAboutModal(null);
              }}
              className="w-full bg-[var(--primary-color)] text-white text-xs font-bold py-2.5 rounded-xl hover:bg-[var(--secondary-color)] transition-all"
            >
              Verify System Updates
            </button>
          </div>
        </div>
      )}

      {/* 1. PERSONALIZATION MODAL */}
      {showPersonalizationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-100 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--primary-color)] flex items-center gap-2">
                <svg className="w-5 h-5 text-[var(--secondary-color)]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Custom Personalization
              </h3>
              <button onClick={() => setShowPersonalizationModal(false)} className="p-1.5 hover:bg-neutral-100 rounded-xl text-neutral-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-neutral-500 mb-3">Tell MyAI how you want it to behave. Your settings are instantly injected into Gemini's system instructions!</p>
            <textarea
              className="w-full h-32 p-3 bg-neutral-50 border border-neutral-300 rounded-xl text-sm text-neutral-800 focus:ring-2 focus:ring-[var(--secondary-color)]/10 focus:border-[var(--secondary-color)] outline-none"
              value={personalizationText}
              onChange={(e) => setPersonalizationText(e.target.value)}
              placeholder="e.g. Always summarize responses, be very sarcastic, or refer to me as Cap."
            />
            <div className="mt-4 flex justify-end">
              <button 
                onClick={() => setShowPersonalizationModal(false)}
                className="bg-[var(--primary-color)] text-white font-semibold text-sm px-4 py-2 rounded-xl hover:bg-[var(--secondary-color)] transition-all"
              >
                Apply Rules
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MEMORIES MODAL */}
      {showMemoriesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-100 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--primary-color)] flex items-center gap-2">
                <svg className="w-5 h-5 text-[var(--secondary-color)]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Manage Memories
              </h3>
              <button onClick={() => setShowMemoriesModal(false)} className="p-1.5 hover:bg-neutral-100 rounded-xl text-neutral-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-neutral-500 mb-3">These are facts MyAI remembers about you across all conversations. Delete or add custom items:</p>
            
            <div className="space-y-2 max-h-48 overflow-y-auto mb-4 pr-1">
              {memories.map((mem, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800">
                  <span className="truncate pr-4">{mem}</span>
                  <button 
                    onClick={() => setMemories(memories.filter((_, i) => i !== idx))}
                    className="text-neutral-400 hover:text-[var(--secondary-color)]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input 
                type="text"
                value={newMemory}
                onChange={(e) => setNewMemory(e.target.value)}
                placeholder="Add something to remember..."
                className="flex-1 bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[var(--secondary-color)]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newMemory.trim()) {
                    setMemories([...memories, newMemory.trim()]);
                    setNewMemory('');
                  }
                }}
              />
              <button 
                onClick={() => {
                  if (newMemory.trim()) {
                    setMemories([...memories, newMemory.trim()]);
                    setNewMemory('');
                  }
                }}
                className="bg-[var(--primary-color)] hover:bg-[var(--secondary-color)] text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCTIVITY APPS MODAL */}
      {showAppsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-neutral-100 flex flex-col max-h-[90vh] animate-fade-in">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-[var(--primary-color)] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[var(--secondary-color)]" />
                  Productivity & Workspace Apps
                </h3>
                <p className="text-[11px] text-neutral-400 mt-1">Connect your workspace tools to let MyAI process your schedules, documents, and emails.</p>
              </div>
              <button 
                onClick={() => setShowAppsModal(false)} 
                className="p-1.5 hover:bg-neutral-100 rounded-xl text-neutral-500 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category selection bar */}
            <div className="flex gap-1.5 mb-4 border-b border-neutral-150 pb-2">
              {['All', 'Productivity', 'Storage', 'Communication'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setAppCategoryFilter(cat)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all border ${appCategoryFilter === cat ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)]' : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Apps Listing Directory */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
              {[
                { 
                  name: 'Google Drive', 
                  category: 'Storage', 
                  desc: 'Search, index, and query personal spreadsheets, presentations, and documents directly.',
                  iconColor: 'text-blue-500',
                  svgPath: 'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z'
                },
                { 
                  name: 'Google Calendar', 
                  category: 'Productivity', 
                  desc: 'Check busy periods, synchronize calendar tasks, and schedule upcoming meetings automatically.',
                  iconColor: 'text-emerald-500',
                  svgPath: 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm-5-7H7v2h7v-2z'
                },
                { 
                  name: 'Notion', 
                  category: 'Productivity', 
                  desc: 'Export structured text notes, read collaborative project wikis, and organize task databases.',
                  iconColor: 'text-neutral-800',
                  svgPath: 'M3 3h18v18H3V3zm15 11.1c0-.6.1-.8.4-1 .3-.2.9-.3 1.6-.3V13h-4v.8c.6.1 1.1.2 1.3.4.2.2.2.4.2.9v4c0 .3-.1.5-.4.6-.2.1-.6.2-1.1.2V20h5v-.8c-.7-.1-1.2-.2-1.4-.4-.2-.2-.2-.5-.2-1v-3.7z'
                },
                { 
                  name: 'Todoist', 
                  category: 'Productivity', 
                  desc: 'Create and retrieve checklists, review priority tasks, and mark daily actions complete.',
                  iconColor: 'text-rose-500',
                  svgPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'
                },
                { 
                  name: 'Slack', 
                  category: 'Communication', 
                  desc: 'Broadcast updates to team workspace channels or query direct-message highlights with simple triggers.',
                  iconColor: 'text-indigo-500',
                  svgPath: 'M6 15a2 2 0 1 1-2-2h2v2zm1 0a2 2 0 1 1 4 0v-2H7v2zm0-5a2 2 0 1 1-2-2h2v2zm1 0a2 2 0 1 1 4 0V8H8v2zm5-4a2 2 0 1 1 2 2h-2V6zm-1 0a2 2 0 1 1-4 0v2h4V6zm0 5a2 2 0 1 1 2 2h-2v-2zm-1 0a2 2 0 1 1-4 0v2h4v-2z'
                },
                { 
                  name: 'Gmail', 
                  category: 'Communication', 
                  desc: 'Access inbox threads, summarize unread emails, and schedule draft replies.',
                  iconColor: 'text-red-500',
                  svgPath: 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z'
                }
              ]
              .filter(app => appCategoryFilter === 'All' || app.category === appCategoryFilter)
              .map(app => {
                const isConnected = connectedApps.includes(app.name);
                return (
                  <div key={app.name} className="p-4 border border-neutral-200 hover:border-[var(--secondary-color)]/30 rounded-2xl flex gap-4 transition-all bg-white relative overflow-hidden group">
                    {isConnected && (
                      <div className="absolute top-0 bottom-0 left-0 w-1 bg-[var(--secondary-color)]"></div>
                    )}
                    
                    <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl flex items-center justify-center shrink-0 self-start">
                      <svg className={`w-6 h-6 ${app.iconColor}`} viewBox="0 0 24 24" fill="currentColor">
                        <path d={app.svgPath} />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-neutral-800">{app.name}</h4>
                        <span className="text-[9px] font-bold text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded uppercase">
                          {app.category}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{app.desc}</p>
                    </div>

                    <button
                      onClick={() => {
                        if (isConnected) {
                          setConnectedApps(connectedApps.filter(name => name !== app.name));
                        } else {
                          setConnectedApps([...connectedApps, app.name]);
                        }
                      }}
                      className={`h-9 px-4 rounded-xl text-xs font-bold transition-all shrink-0 self-center border ${isConnected ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-600' : 'bg-[var(--primary-color)] hover:bg-[var(--secondary-color)] border-[var(--primary-color)] hover:border-[var(--secondary-color)] text-white shadow-sm'}`}
                    >
                      {isConnected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
              <p className="text-[10px] text-neutral-400 font-medium">Workspace integrations are end-to-end encrypted.</p>
              <button 
                onClick={() => setShowAppsModal(false)}
                className="bg-[var(--primary-color)] text-white font-semibold text-xs px-4 py-2.5 rounded-xl hover:bg-[var(--secondary-color)] transition-all"
              >
                Save Integrations
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRO UPGRADE MODAL */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-100 text-center animate-fade-in">
            <div className="w-12 h-12 bg-[var(--secondary-color)]/15 text-[var(--secondary-color)] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[var(--primary-color)]">Upgrade to MyAI Plus</h3>
            <p className="text-sm text-neutral-500 mt-2">Unlock unlimited generations, premium voice outputs, web grounding depth, and real-time reasoning triggers.</p>
            
            <div className="bg-gradient-to-tr from-[var(--primary-color)] to-[var(--secondary-color)] text-white p-4 rounded-2xl my-5 text-left relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-[10px] uppercase tracking-wider font-bold opacity-80">Premium Access Pass</p>
                <p className="text-2xl font-bold mt-1">$20/month</p>
                <ul className="text-xs space-y-1 mt-3 opacity-95 font-medium">
                  <li>✦ Highest Priority Access</li>
                  <li>✦ Imagen 4.0 Ultra Fine Rendering</li>
                  <li>✦ Infinite PDF & Multi-Modal Context size</li>
                </ul>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl py-3 text-xs font-bold transition-all"
              >
                Maybe Later
              </button>
              <button 
                onClick={() => {
                  alert(`Thank you for choosing MyAI Pro, ${profileName}!`);
                  setShowUpgradeModal(false);
                }}
                className="flex-1 bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] text-white rounded-xl py-3 text-xs font-bold shadow-md hover:opacity-90 transition-all"
              >
                Unlock Pro Access
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
