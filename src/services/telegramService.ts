import type { TelegramUser, ThemeMode } from '@/types';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  viewportHeight: number;
  viewportStableHeight: number;
  isExpanded: boolean;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  enableVerticalSwipes?: () => void;
  disableVerticalSwipes?: () => void;
  MainButton: {
    text: string;
    isVisible: boolean;
    setText: (text: string) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    setParams: (params: Record<string, unknown>) => void;
  };
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  onEvent: (event: string, cb: () => void) => void;
  offEvent: (event: string, cb: () => void) => void;
  openLink: (url: string) => void;
  shareMessage?: (msg: string, cb: (success: boolean) => void) => void;
}

let cached: TelegramWebApp | null = null;

function getWebApp(): TelegramWebApp | null {
  if (cached !== null) return cached;
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    cached = window.Telegram.WebApp;
    return cached;
  }
  return null;
}

function isAvailable(): boolean {
  return getWebApp() !== null;
}

function init(): void {
  const wa = getWebApp();
  if (!wa) return;
  wa.ready();
  wa.expand();
  wa.setHeaderColor('#0a0b14');
  wa.setBackgroundColor('#0a0b14');
}

function getUser(): TelegramUser | null {
  const wa = getWebApp();
  if (!wa?.initDataUnsafe?.user) return null;
  return wa.initDataUnsafe.user;
}

function getTheme(): 'light' | 'dark' {
  const wa = getWebApp();
  if (!wa) return 'dark';
  return wa.colorScheme === 'light' ? 'light' : 'dark';
}

function haptic(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light'): void {
  const wa = getWebApp();
  wa?.HapticFeedback?.impactOccurred?.(style);
}

function hapticNotify(type: 'error' | 'success' | 'warning'): void {
  const wa = getWebApp();
  wa?.HapticFeedback?.notificationOccurred?.(type);
}

function hapticSelection(): void {
  const wa = getWebApp();
  wa?.HapticFeedback?.selectionChanged?.();
}

function setMainButton(text: string, onClick: () => void): void {
  const wa = getWebApp();
  if (!wa) return;
  wa.MainButton.setText(text);
  wa.MainButton.show();
  wa.MainButton.enable();
  wa.MainButton.onClick(onClick);
}

function hideMainButton(): void {
  const wa = getWebApp();
  wa?.MainButton?.hide();
}

function showBackButton(onClick: () => void): void {
  const wa = getWebApp();
  if (!wa) return;
  wa.BackButton.show();
  wa.BackButton.onClick(onClick);
}

function hideBackButton(): void {
  const wa = getWebApp();
  wa?.BackButton?.hide();
}

function shareMessage(msg: string): boolean {
  const wa = getWebApp();
  if (wa?.shareMessage) {
    wa.shareMessage(msg, () => {});
    return true;
  }
  return false;
}

function openLink(url: string): void {
  const wa = getWebApp();
  if (wa) wa.openLink(url);
  else window.open(url, '_blank');
}

// Fallback demo user for non-Telegram environments
function getDemoUser(): TelegramUser {
  return {
    id: 700000001,
    firstName: 'AERQVON',
    lastName: 'Demo',
    username: 'aerqvon_demo',
    languageCode: 'en',
  };
}

function resolveUser(): TelegramUser {
  return getUser() ?? getDemoUser();
}

function getInitData(): string {
  const wa = getWebApp();
  return wa?.initData ?? '';
}

export const telegramService = {
  isAvailable,
  init,
  getUser,
  resolveUser,
  getTheme,
  haptic,
  hapticNotify,
  hapticSelection,
  setMainButton,
  hideMainButton,
  showBackButton,
  hideBackButton,
  shareMessage,
  openLink,
  getDemoUser,
  getInitData,
};

export type { TelegramWebApp, ThemeMode };
