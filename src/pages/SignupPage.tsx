import { useNavigate } from 'react-router-dom';
import { AuthPage } from '@/components/auth/AuthPage';

export function SignupPage() {
  const navigate = useNavigate();

  const handleAuthSuccess = () => {
    navigate('/app');
  };

  return <AuthPage initialView="signup" onLogin={handleAuthSuccess} />;
}
