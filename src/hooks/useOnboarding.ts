import { useEffect, useState } from 'react';

const ONBOARDED_KEY = 'aerqvon-onboarded';

export function useOnboarding() {
  const [onboarded, setOnboardedState] = useState<boolean>(() => {
    return localStorage.getItem(ONBOARDED_KEY) === 'true';
  });

  useEffect(() => {
    if (onboarded) localStorage.setItem(ONBOARDED_KEY, 'true');
    else localStorage.removeItem(ONBOARDED_KEY);
  }, [onboarded]);

  const completeOnboarding = () => setOnboardedState(true);
  const resetOnboarding = () => setOnboardedState(false);

  return { onboarded, completeOnboarding, resetOnboarding };
}
