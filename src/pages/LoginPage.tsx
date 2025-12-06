import { useNavigate } from 'react-router-dom';
import { AuthPage } from '@/components/auth/AuthPage';

export function LoginPage() {
  const navigate = useNavigate();

  const handleAuthSuccess = () => {
    navigate('/app');
  };

  return <AuthPage initialView="login" onLogin={handleAuthSuccess} />;
}
