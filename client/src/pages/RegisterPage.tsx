import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/context/auth-store';

// Components
import { RegisterForm } from '@/components/auth/RegisterForm';

export function RegisterPage() {
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
      <RegisterForm />
    </div>
  );
}