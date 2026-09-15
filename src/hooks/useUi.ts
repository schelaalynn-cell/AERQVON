import { useCallback } from 'react';
import type { AppUser } from '@/types';

const DEMO_USER: AppUser = {
  id: 700000001,
  firstName: 'AERQVON',
  lastName: 'Demo',
  username: 'aerqvon_demo',
  languageCode: 'en',
};

export function useUi() {
  const haptic = useCallback((_style?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => {}, []);
  const hapticNotify = useCallback((_type: 'error' | 'success' | 'warning') => {}, []);
  const hapticSelection = useCallback(() => {}, []);

  return {
    available: false,
    theme: 'dark' as const,
    user: DEMO_USER,
    haptic,
    hapticNotify,
    hapticSelection,
    setMainButton: (_text: string, _onClick: () => void) => {},
    hideMainButton: () => {},
    showBackButton: (_onClick: () => void) => {},
    hideBackButton: () => {},
    shareMessage: (_msg: string) => false,
    openLink: (url: string) => window.open(url, '_blank'),
  };
}
