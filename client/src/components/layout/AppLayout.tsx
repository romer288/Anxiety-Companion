import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, initializeAuthListener } from '@/context/auth-store';

// Components
import { Header } from '../Header';
import { Sidebar } from '../Sidebar';
import { Footer } from './Footer';
import { Loading } from './Loading';

export function AppLayout() {
  const { user, loading, initialized } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Initialize auth listener on mount
  useEffect(() => {
    if (!initialized) {
      initializeAuthListener();
    }
  }, [initialized]);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      // Don't redirect from auth pages
      const isAuthPage = location.pathname === '/login' || 
                         location.pathname === '/register' || 
                         location.pathname === '/forgot-password';
      
      if (!isAuthPage) {
        navigate('/login');
      }
    }
  }, [user, loading, navigate, location.pathname]);
  
  // Show loading state
  if (loading && !initialized) {
    return <Loading />;
  }
  
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar (on medium screens and larger) */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-10">
        <Sidebar />
      </div>
      
      {/* Main content area */}
      <div className="flex flex-col flex-1 md:pl-64">
        {/* Header */}
        <Header />
        
        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
        
        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}