import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if the prompt has been dismissed before
    const promptDismissed = localStorage.getItem('installPromptDismissed') === 'true';
    
    if (promptDismissed) {
      return;
    }

    // Listen for the beforeinstallprompt event
    const handler = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      
      // Store the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show our custom install prompt
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the browser install prompt
    await deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const choiceResult = await deferredPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // Clear the deferred prompt
    setDeferredPrompt(null);
    
    // Hide our custom prompt
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('installPromptDismissed', 'true');
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-primary text-white p-4 rounded-lg shadow-lg z-50">
      <div className="flex justify-between items-center">
        <div className="flex-1">Install Anxiety Companion for easier access</div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleInstall}
            className="bg-white text-primary px-4 py-2 rounded-md font-medium"
          >
            Install
          </button>
          <button 
            onClick={handleDismiss}
            className="text-white p-2"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="mt-2 text-sm">
        <a 
          href="/install-guide.html" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-white underline opacity-80 hover:opacity-100"
        >
          Need help installing?
        </a>
      </div>
    </div>
  );
}