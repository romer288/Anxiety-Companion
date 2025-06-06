import { useState } from "react";
import APITester from "../components/debug/APITester";
import VoiceDebugger from "../components/VoiceDebugger";

export function DebugPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Debug Tools</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Voice System Debugger</h2>
        <p className="mb-4 text-gray-600">
          This tool lets you test all available voices in your browser to determine which ones work best for Spanish (Microsoft Sabina) 
          and Portuguese (Apple Luciana).
        </p>
        <VoiceDebugger />
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">API Tester</h2>
        <APITester />
      </div>
    </div>
  );
}