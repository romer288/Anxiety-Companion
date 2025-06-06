import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { X, Download, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

// Define BeforeInstallPromptEvent since it's not in the standard TypeScript types
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Hook into the beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 76+ from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      
      // Check if we should show the banner (not previously dismissed)
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed || Date.now() > parseInt(dismissed)) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                        !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Show iOS guide if it's iOS and not standalone
    if (isIOSDevice && !window.matchMedia('(display-mode: standalone)').matches) {
      const dismissed = localStorage.getItem('ios-install-dismissed');
      if (!dismissed || Date.now() > parseInt(dismissed)) {
        setShowIOSGuide(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Handle install button click
  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User ${outcome} the installation`);

    // Clear the saved prompt since it can only be used once
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  // Dismiss the banner for 7 days
  const dismissBanner = () => {
    // Set dismissed timestamp 7 days in the future
    const dismissUntil = Date.now() + (7 * 24 * 60 * 60 * 1000);
    localStorage.setItem('pwa-install-dismissed', dismissUntil.toString());
    setShowBanner(false);
  };

  // Dismiss the iOS guide for 7 days
  const dismissIOSGuide = () => {
    const dismissUntil = Date.now() + (7 * 24 * 60 * 60 * 1000);
    localStorage.setItem('ios-install-dismissed', dismissUntil.toString());
    setShowIOSGuide(false);
  };

  // iOS Install Guide Dialog
  const IOSInstallGuide = () => (
    <Dialog open={showIOSGuide} onOpenChange={setShowIOSGuide}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Install on your iOS device</DialogTitle>
          <DialogDescription>
            Add this app to your home screen for easier access.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex flex-col items-center space-y-2">
            <ol className="list-decimal list-inside text-sm space-y-3">
              <li>Tap the <span className="font-bold">Share</span> icon at the bottom of the screen</li>
              <li>Scroll down and tap <span className="font-bold">Add to Home Screen</span></li>
              <li>Tap <span className="font-bold">Add</span> in the top right corner</li>
            </ol>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button onClick={dismissIOSGuide}>Got it</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Only render if we can install or on iOS
  if (!showBanner && !showIOSGuide) {
    return null;
  }

  return (
    <>
      {/* iOS Install Guide */}
      {isIOS && <IOSInstallGuide />}
      
      {/* Install Banner for Android/Chrome */}
      {showBanner && !isIOS && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white shadow-lg border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center">
            <div className="mr-4">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Install Anxiety Companion</h3>
              <p className="text-sm text-gray-500">Add to your home screen for easier access</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={dismissBanner}>
              <X className="h-4 w-4 mr-1" />
              Later
            </Button>
            <Button size="sm" onClick={handleInstallClick}>
              <Download className="h-4 w-4 mr-1" />
              Install
            </Button>
          </div>
        </div>
      )}
    </>
  );
}