import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/context/auth-store';

// Components
import { LoginForm } from '@/components/auth/LoginForm';

export function LoginPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  // Redirect to home if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);
  
  return (
    <div className="container mx-auto max-w-md py-8">
      <LoginForm />
    </div>
  );
}