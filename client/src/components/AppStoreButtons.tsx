import React, { useState, useEffect } from 'react';

interface AppStoreButtonsProps {
  className?: string;
}

export default function AppStoreButtons({ className = '' }: AppStoreButtonsProps) {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');
  
  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      setPlatform('ios');
    } else if (/android/i.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }
  }, []);
  
  // Placeholder URLs - these would be replaced with actual app store URLs once the app is published
  const appStoreUrl = "https://apps.apple.com/app/your-app-id"; // Replace with actual App Store URL
  const playStoreUrl = "https://play.google.com/store/apps/details?id=your.package.name"; // Replace with actual Play Store URL
  
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <h3 className="text-lg font-medium text-gray-800 mb-1">Download from app stores</h3>
      
      <div className="flex flex-wrap gap-3">
        <a 
          href={appStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`bg-black text-white px-5 py-3 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition ${platform !== 'ios' ? 'opacity-75' : 'shadow-md'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16.5 3c-1.83 0-3.36 1.3-3.77 3H7c-1.66 0-3 1.34-3 3v9c0 .55.45 1 1 1h1.59c.89 0 1.34-1.08.71-1.71L5.88 16c-.4-.4-.4-1.03 0-1.42l1.24-1.24C7.32 13.13 7.5 12.82 7.5 12.5c0-.31-.18-.62-.38-.83l-2.14-2.13c-.8-.8-.21-2.04.9-2.04h8.62c.41 1.69 1.94 3 3.77 3c1.94 0 3.5-1.56 3.5-3.5S18.43 3 16.5 3z"/>
          </svg>
          <div>
            <div className="text-xs">Download on the</div>
            <div className="text-sm font-semibold -mt-1">App Store</div>
          </div>
        </a>
        
        <a 
          href={playStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`bg-[#414141] text-white px-5 py-3 rounded-lg flex items-center gap-2 hover:bg-[#515151] transition ${platform !== 'android' ? 'opacity-75' : 'shadow-md'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.609 1.814L13.792 12l-10.183 10.186q-0.56-0.544-0.897-1.2-0.336-0.655-0.336-1.434V4.448q0-0.779 0.336-1.435 0.336-0.655 0.897-1.2zM14.982 13.192L17.172 15.382l-2.056 1.138-2.252 1.249-0.139 0.077q-0.146 0.083-0.31 0.094-0.164 0.01-0.296-0.054-0.135-0.064-0.241-0.176-0.104-0.112-0.154-0.248l-0.884-2.369 4.142-1.901zM13.325 10.891L9.183 8.989l0.884-2.369q0.05-0.136 0.154-0.248 0.106-0.112 0.241-0.176 0.132-0.064 0.296-0.054 0.164 0.011 0.31 0.094l4.447 2.464-2.19 2.191zM7.734 21.785v0 q-0.58 0.314-1.221 0.132-0.644-0.182-1.081-0.845-0.438-0.663-0.438-1.416 0-0.752 0.438-1.416l5.151-9.185 4.411 2.464-7.26 10.266z"/>
          </svg>
          <div>
            <div className="text-xs">GET IT ON</div>
            <div className="text-sm font-semibold -mt-1">Google Play</div>
          </div>
        </a>
      </div>
      
      <p className="text-xs text-gray-500 mt-1">
        Our app is available for both iOS and Android devices. Download it today!
      </p>
    </div>
  );
}