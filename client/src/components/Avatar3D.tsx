import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Avatar3DProps {
  isListening?: boolean;
  isSpeaking?: boolean;
  anxietyLevel?: number;
  language?: string;
  className?: string;
}

// Simple Avatar model using pure Three.js (no drei dependencies)
function PureThreeAvatarModel({ 
  isListening = false, 
  isSpeaking = false, 
  anxietyLevel = 0 
}: {
  isListening: boolean;
  isSpeaking: boolean;
  anxietyLevel: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [blinkTimer, setBlinkTimer] = useState(0);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    try {
      // Idle animation - subtle head movement
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.03;

      // Breathing animation
      const breathScale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.01;
      groupRef.current.scale.set(1, breathScale, 1);

      // Blinking animation
      setBlinkTimer((prev) => {
        if (prev > 3 + Math.random() * 2) {
          return 0;
        }
        return prev + delta;
      });

      // Anxiety level affects posture
      if (anxietyLevel > 5) {
        groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.01;
      }
    } catch (error) {
      console.error('Avatar animation error:', error);
    }
  });

  return (
    <group ref={groupRef} position={[0, -1, 0]}>
      {/* Head */}
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshStandardMaterial color="#f4c2a1" />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.05, 1.72, 0.12]}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[0.05, 1.72, 0.12]}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshStandardMaterial color="#333" />
      </mesh>

      {/* Nose */}
      <mesh position={[0, 1.68, 0.13]}>
        <coneGeometry args={[0.01, 0.03, 8]} />
        <meshStandardMaterial color="#f4c2a1" />
      </mesh>

      {/* Mouth - animated when speaking */}
      <mesh position={[0, 1.64, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[isSpeaking ? 0.015 : 0.01, 0.01, 0.05, 8]} />
        <meshStandardMaterial color="#d4a574" />
      </mesh>

      {/* Hair */}
      <mesh position={[0, 1.8, -0.05]}>
        <sphereGeometry args={[0.17, 32, 32]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.2, 16]} />
        <meshStandardMaterial color="#f4c2a1" />
      </mesh>

      {/* Body - professional attire */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[0.4, 0.8, 0.2]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>

      {/* Arms */}
      <mesh position={[-0.3, 1.2, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.6, 16]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      <mesh position={[0.3, 1.2, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.6, 16]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>

      {/* Status indicator */}
      {isListening && (
        <mesh position={[0, 2.2, 0]}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshStandardMaterial 
            color="#00ff00" 
            emissive="#00ff00" 
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
    </group>
  );
}

// Simple camera controls without drei
function SimpleCameraControls() {
  const [camera, setCamera] = useState<THREE.Camera | null>(null);

  useEffect(() => {
    if (camera) {
      camera.position.set(0, 0, 3);
      camera.lookAt(0, 1, 0);
    }
  }, [camera]);

  useFrame(({ camera }) => {
    if (!camera) return;
    setCamera(camera);
  });

  return null;
}

// Fallback component if WebGL fails
function AvatarFallback({ isListening, isSpeaking }: { isListening: boolean; isSpeaking: boolean }) {
  return (
    <div className="w-full h-80 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center">
      <div className="text-center text-white">
        <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center">
          <div className="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center">
            👩‍⚕️
          </div>
        </div>
        <div className="text-lg font-medium">AI Therapist</div>
        {isListening && (
          <div className="mt-2 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm">Listening...</span>
          </div>
        )}
        {isSpeaking && (
          <div className="mt-2 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span className="text-sm">Speaking...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Main Avatar3D component using pure Three.js (NO DREI)
export default function Avatar3D({ 
  isListening = false, 
  isSpeaking = false, 
  anxietyLevel = 0,
  language = 'en',
  className = "w-full h-80"
}: Avatar3DProps) {
  const [hasWebGL, setHasWebGL] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check WebGL support
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        console.warn('WebGL not supported, using fallback avatar');
      }
    } catch (err) {
      setHasWebGL(false);
      console.warn('WebGL check failed, using fallback avatar');
    }
  }, []);

  // If WebGL is not supported or there's an error, show fallback
  if (!hasWebGL || error) {
    return (
      <div className={className}>
        <AvatarFallback isListening={isListening} isSpeaking={isSpeaking} />
      </div>
    );
  }

  return (
    <div className={`${className} relative`}>
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        onCreated={(state) => {
          console.log('Pure Three.js Avatar canvas created');
        }}
        onError={(error) => {
          console.error('Canvas error:', error);
          setError('3D rendering failed');
        }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance"
        }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <pointLight position={[-5, 5, 5]} intensity={0.4} />

        {/* Avatar - NO DREI DEPENDENCIES */}
        <PureThreeAvatarModel 
          isListening={isListening}
          isSpeaking={isSpeaking}
          anxietyLevel={anxietyLevel}
        />

        {/* Simple camera controls without drei */}
        <SimpleCameraControls />
      </Canvas>

      {/* Status overlay */}
      <div className="absolute top-2 left-2 text-white text-sm z-10">
        {isListening && (
          <div className="flex items-center gap-2 bg-green-600/80 px-2 py-1 rounded backdrop-blur-sm">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            Listening...
          </div>
        )}
        {isSpeaking && (
          <div className="flex items-center gap-2 bg-blue-600/80 px-2 py-1 rounded backdrop-blur-sm">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            Speaking...
          </div>
        )}
        {anxietyLevel > 0 && (
          <div className="mt-1 text-xs bg-black/20 px-2 py-1 rounded backdrop-blur-sm">
            Anxiety: {anxietyLevel}/10
          </div>
        )}
      </div>
    </div>
  );
}