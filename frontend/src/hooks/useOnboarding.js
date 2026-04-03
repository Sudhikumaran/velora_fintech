import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export function useOnboarding() {
  const [show, setShow] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    if (user && !localStorage.getItem('velora_onboarded')) {
      setShow(true);
    }
  }, [user]);

  const complete = () => {
    localStorage.setItem('velora_onboarded', 'true');
    setShow(false);
  };

  return [show, complete];
}
