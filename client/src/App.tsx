import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { useTheme } from "./hooks/use-theme";
import { SessionProvider } from "./context/SessionContext";

// Layouts
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CompleteProfilePage } from './pages/CompleteProfilePage';
import { ChatPage } from './pages/ChatPage';
import { TrackPage } from './pages/TrackPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { TherapistsPage } from './pages/TherapistsPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { SettingsPage } from './pages/SettingsPage';
import { HelpPage } from './pages/HelpPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { ProfilePage } from './pages/ProfilePage';
import { DebugPage } from './pages/DebugPage';

// UI Components
import InstallPrompt from "./components/InstallPrompt";
import VersionInfo from "./components/VersionInfo";
import IOSInstallGuide from "./components/IOSInstallGuide";

function App() {
  // Initialize theme if needed
  useTheme();
  
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              {/* Public pages */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/complete-profile" element={<CompleteProfilePage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              
              {/* Protected pages */}
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/track" element={<TrackPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/therapists" element={<TherapistsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/debug" element={<DebugPage />} />
              
              {/* 404 page */}
              <Route path="*" element={<HomePage />} />
            </Route>
          </Routes>
          
          {/* Floating components */}
          <InstallPrompt />
          <IOSInstallGuide />
          <VersionInfo />
          
          {/* Toast notifications */}
          <Toaster />
        </BrowserRouter>
      </SessionProvider>
    </QueryClientProvider>
  );
}

export default App;
