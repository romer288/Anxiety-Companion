import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';
import { apiRequest } from '../lib/utils';

// Firebase configuration would be imported here in a real implementation
// import { getAuth, onAuthStateChanged, signOut, etc } from 'firebase/auth';

// Define the User type
export type User = {
  id: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  emailVerified: boolean;
};

// Define the UserProfile type
export type UserProfile = {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  zipCode?: string | null;
  age?: number | null;
  language: 'en' | 'es' | 'pt';
  locationPermission: boolean;
  notificationsEnabled: boolean;
  notificationTime?: string | null;
  therapistId?: string | null;
};

// AuthState interface
interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  
  // Action creators
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setInitialized: (initialized: boolean) => void;
  
  // Auth methods
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>; 
  googleLogin: () => Promise<boolean>; // Returns true if new user
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateLanguage: (language: 'en' | 'es' | 'pt') => Promise<void>;
}

// Firebase auth listener setup
export const initializeAuthListener = () => {
  // In a real implementation, this would set up an auth state listener with Firebase
  // Example with Firebase:
  /*
  const auth = getAuth();
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      // Map Firebase user to our User type
      const user: User = {
        id: firebaseUser.uid,
        displayName: firebaseUser.displayName,
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified,
      };
      
      // Set the user in our store
      useAuthStore.getState().setUser(user);
      
      // Fetch the user profile from our backend
      try {
        const response = await fetch(`/api/profiles/${user.id}`);
        if (response.ok) {
          const profile = await response.json();
          useAuthStore.getState().setProfile(profile);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    } else {
      // Clear user data when logged out
      useAuthStore.getState().setUser(null);
      useAuthStore.getState().setProfile(null);
    }
    
    // Mark initialization as complete
    useAuthStore.getState().setInitialized(true);
    useAuthStore.getState().setLoading(false);
  });
  */
  
  // For now, we'll just simulate a completed auth initialization
  setTimeout(() => {
    useAuthStore.getState().setInitialized(true);
    useAuthStore.getState().setLoading(false);
  }, 1000);
};

// Create the auth store with persist middleware
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      loading: true,
      error: null,
      initialized: false,
      
      // Actions
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setInitialized: (initialized) => set({ initialized }),
      
      // Auth methods
      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          // In a real implementation, this would call Firebase auth methods
          // Example: await signInWithEmailAndPassword(auth, email, password);
          
          // For demo purposes, we'll set a mock user
          await new Promise(resolve => setTimeout(resolve, 1000));
          const user: User = {
            id: '1',
            displayName: 'Demo User',
            email: email,
            photoURL: null,
            emailVerified: true,
          };
          const profile: UserProfile = {
            userId: '1',
            firstName: 'Demo',
            lastName: 'User',
            zipCode: '12345',
            age: 30,
            language: 'en',
            locationPermission: true,
            notificationsEnabled: true,
          };
          set({ user, profile, loading: false });
        } catch (error: any) {
          console.error('Login error:', error);
          set({ error: error.message || 'Failed to log in', loading: false });
          throw error;
        }
      },
      
      register: async (email, password, name) => {
        set({ loading: true, error: null });
        try {
          // In a real implementation, this would call Firebase auth methods
          // Example: const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          // Then: await updateProfile(userCredential.user, { displayName: name });
          
          // For demo purposes, we'll set a mock user
          await new Promise(resolve => setTimeout(resolve, 1000));
          const user: User = {
            id: '1',
            displayName: name,
            email: email,
            photoURL: null,
            emailVerified: false,
          };
          const profile: UserProfile = {
            userId: '1',
            firstName: name.split(' ')[0],
            lastName: name.split(' ').slice(1).join(' ') || null,
            language: 'en',
            locationPermission: false,
            notificationsEnabled: false,
          };
          set({ user, profile, loading: false });
        } catch (error: any) {
          console.error('Registration error:', error);
          set({ error: error.message || 'Failed to register', loading: false });
          throw error;
        }
      },
      
      googleLogin: async () => {
        set({ loading: true, error: null });
        try {
          // In a real implementation, this would use Firebase Google auth
          // Example: const provider = new GoogleAuthProvider();
          // Then: const result = await signInWithPopup(auth, provider);
          
          // For demo purposes, we'll set a mock user
          await new Promise(resolve => setTimeout(resolve, 1000));
          const user: User = {
            id: '1',
            displayName: 'Google User',
            email: 'google.user@example.com',
            photoURL: 'https://randomuser.me/api/portraits/lego/1.jpg',
            emailVerified: true,
          };
          const profile: UserProfile = {
            userId: '1',
            firstName: 'Google',
            lastName: 'User',
            language: 'en',
            locationPermission: false,
            notificationsEnabled: true,
          };
          set({ user, profile, loading: false });
          
          // Return true to indicate this is a new user
          return true;
        } catch (error: any) {
          console.error('Google login error:', error);
          set({ error: error.message || 'Failed to log in with Google', loading: false });
          throw error;
        }
      },
      
      logout: async () => {
        set({ loading: true, error: null });
        try {
          // In a real implementation, this would call Firebase auth signOut
          // Example: await signOut(auth);
          
          // For demo purposes, we'll just clear the user
          await new Promise(resolve => setTimeout(resolve, 500));
          set({ user: null, profile: null, loading: false });
        } catch (error: any) {
          console.error('Logout error:', error);
          set({ error: error.message || 'Failed to log out', loading: false });
          throw error;
        }
      },
      
      updateProfile: async (data) => {
        set({ loading: true, error: null });
        try {
          const currentProfile = get().profile;
          if (!currentProfile) {
            throw new Error('No profile to update');
          }
          
          // In a real implementation, this would call your API
          // Example: await apiRequest('PATCH', `/api/profiles/${currentProfile.userId}`, data);
          
          // For demo purposes, we'll just update the profile in state
          await new Promise(resolve => setTimeout(resolve, 500));
          const updatedProfile = { ...currentProfile, ...data };
          set({ profile: updatedProfile, loading: false });
        } catch (error: any) {
          console.error('Profile update error:', error);
          set({ error: error.message || 'Failed to update profile', loading: false });
          throw error;
        }
      },
      
      updateLanguage: async (language) => {
        set({ loading: true, error: null });
        try {
          const currentProfile = get().profile;
          if (!currentProfile) {
            throw new Error('No profile to update');
          }
          
          // In a real implementation, this would call your API
          // Example: await apiRequest('PATCH', `/api/profiles/${currentProfile.userId}`, { language });
          
          // For demo purposes, we'll just update the profile in state
          await new Promise(resolve => setTimeout(resolve, 300));
          const updatedProfile = { ...currentProfile, language };
          set({ profile: updatedProfile, loading: false });
        } catch (error: any) {
          console.error('Language update error:', error);
          set({ error: error.message || 'Failed to update language', loading: false });
          throw error;
        }
      },
    }),
    {
      name: 'anxiety-companion-auth',
      partialize: (state) => ({ user: state.user, profile: state.profile }),
    }
  )
);