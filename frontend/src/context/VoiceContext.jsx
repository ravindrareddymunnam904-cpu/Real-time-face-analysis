import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { VoiceAssistant } from '../utils/speechService';
import { useAuth } from './AuthContext';

const VoiceContext = createContext(null);

export function VoiceProvider({ children, onNavigate }) {
  const { user, logout } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [statusText, setStatusText] = useState('Idle');
  const [lastCommand, setLastCommand] = useState('');
  const [lastAction, setLastAction] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [supported, setSupported] = useState(true);

  const assistantRef = useRef(null);
  const actionSubscribersRef = useRef(new Set());

  useEffect(() => {
    const ttsPref = user?.settings?.tts_enabled !== false;

    const assistant = new VoiceAssistant({
      ttsEnabled: ttsPref,
      onCommand: (action, transcript) => {
        setLastCommand(transcript);
        setLastAction({ action, timestamp: Date.now() });

        // Global voice navigation commands
        if (action === 'NAVIGATE_DASHBOARD' && onNavigate) onNavigate('dashboard');
        if (action === 'NAVIGATE_ANALYTICS' && onNavigate) onNavigate('analytics');
        if (action === 'NAVIGATE_HISTORY' && onNavigate) onNavigate('history');
        if (action === 'VOICE_LOGIN' && onNavigate && !user) onNavigate('login');
        if (action === 'LOGOUT') logout();

        // Notify page-specific subscribers (e.g., Live Camera, Login)
        actionSubscribersRef.current.forEach((cb) => cb(action, transcript));
      },
      onStatusChange: (status) => {
        setIsListening(status.isListening);
        setStatusText(status.statusText);
      },
      onError: (err) => {
        setErrorMsg(err);
        setTimeout(() => setErrorMsg(''), 6000);
      },
    });

    assistantRef.current = assistant;
    setSupported(assistant.isSupported());

    return () => {
      assistant.stop();
    };
  }, [user, onNavigate, logout]);

  const toggleVoice = () => {
    if (assistantRef.current) {
      assistantRef.current.toggle();
    }
  };

  const startVoice = () => {
    if (assistantRef.current) assistantRef.current.start();
  };

  const stopVoice = () => {
    if (assistantRef.current) assistantRef.current.stop();
  };

  const speak = (text) => {
    if (assistantRef.current) assistantRef.current.speak(text);
  };

  const subscribeToCommands = (callback) => {
    actionSubscribersRef.current.add(callback);
    return () => {
      actionSubscribersRef.current.delete(callback);
    };
  };

  return (
    <VoiceContext.Provider
      value={{
        isListening,
        statusText,
        lastCommand,
        lastAction,
        errorMsg,
        supported,
        toggleVoice,
        startVoice,
        stopVoice,
        speak,
        subscribeToCommands,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
}
