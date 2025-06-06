import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useSession } from "@/context/SessionContext";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import ChatInterface from "@/components/ChatInterface";
import TherapistDashboard from "@/components/TherapistDashboard";
import AppStoreButtons from "@/components/AppStoreButtons";

export default function Home() {
  const [location, setLocation] = useLocation();
  const { currentSession, isSessionActive, startNewSession } = useSession();
  const [activeTab, setActiveTab] = useState<"chat" | "progress" | "tools">("chat");
  const [showTherapistDashboard, setShowTherapistDashboard] = useState(false);

  // State for UI display
  const [loading, setLoading] = useState(false);
  const [noSession, setNoSession] = useState(false);
  
  // Check for active session and create one automatically with a small delay
  useEffect(() => {
    // If there's no session, and we're not in a loading state
    if (!isSessionActive && currentSession.id === 0) {
      console.log('No active session found, showing welcome screen');
      setNoSession(true);
      
      // Auto-create a session after a short delay (1.5 seconds) for better UX
      const timer = setTimeout(() => {
        console.log('Auto-creating session after delay');
        handleStartSession();
      }, 1500);
      
      // Cleanup timer on unmount
      return () => clearTimeout(timer);
    } else {
      console.log('Active session found:', currentSession.id);
      setNoSession(false);
    }
  }, [isSessionActive, currentSession.id]);
  
  // Function to handle starting a new session
  const handleStartSession = async () => {
    setLoading(true);
    try {
      await startNewSession("1"); // Default to user with ID "1"
      setNoSession(false);
    } catch (error) {
      console.error("Error starting session:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: "chat" | "progress" | "tools") => {
    setActiveTab(tab);
    
    // Show therapist dashboard on progress tab
    if (tab === "progress") {
      setShowTherapistDashboard(true);
    } else {
      setShowTherapistDashboard(false);
    }
  };

  return (
    <div className="font-sans bg-secondary-50 text-secondary-800 min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow flex flex-col md:flex-row">
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
        />
        
        {noSession ? (
          <div className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-blue-50 to-white">
            <div className="welcome-card max-w-lg">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M18 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"></path>
                    <path d="M6 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"></path>
                    <path d="M18 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"></path>
                    <path d="M8 10h8"></path>
                    <path d="M8 14v-4"></path>
                    <path d="M16 14v-4"></path>
                    <path d="M16 18V6"></path>
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">Welcome to Anxiety Companion</h2>
              <p className="mb-8 text-gray-600 text-lg">
                Your personal AI assistant to help manage anxiety using evidence-based techniques. Start a new session to begin your journey to better mental health.
              </p>
              <button
                onClick={handleStartSession}
                disabled={loading}
                className="welcome-button"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Starting session...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <svg className="mr-2 -ml-1 w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Start a New Session
                  </span>
                )}
              </button>
              <p className="mt-6 text-xs text-gray-500">
                Powered by Claude 3.7 Sonnet AI
              </p>
              
              <div className="border-t border-gray-200 mt-8 pt-6">
                <AppStoreButtons />
              </div>
            </div>
          </div>
        ) : showTherapistDashboard ? (
          <TherapistDashboard />
        ) : (
          <ChatInterface />
        )}
      </main>
    </div>
  );
}
