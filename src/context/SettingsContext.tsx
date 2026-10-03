import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { AppSettings, NotificationPreferences, GamificationPreferences } from '../types.ts';
import { loadSettings, saveSettings } from '../utils/settingsStorage.ts';
import { saveWaterTarget } from '../utils/waterStorage.ts';

interface SettingsContextType {
  settings: AppSettings;
  updateTheme: (theme: 'dark' | 'light') => void;
  updateAccentColor: (accent: 'blue' | 'purple' | 'red' | 'gold') => void;
  toggleCompactMode: () => void;
  updateWaterTarget: (ml: number) => boolean;
  updateNotificationPref: (key: keyof NotificationPreferences, value: boolean) => void;
  updateGamificationPref: (key: keyof GamificationPreferences, value: boolean) => void;
  resetSettingsToDefault: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  // Save changes to localStorage whenever settings state changes
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateTheme = useCallback((theme: 'dark' | 'light') => {
    setSettings((prev) => ({ ...prev, theme }));
  }, []);

  const updateAccentColor = useCallback((accentColor: 'blue' | 'purple' | 'red' | 'gold') => {
    setSettings((prev) => ({ ...prev, accentColor }));
  }, []);

  const toggleCompactMode = useCallback(() => {
    setSettings((prev) => ({ ...prev, compactMode: !prev.compactMode }));
  }, []);

  const updateWaterTarget = useCallback((ml: number): boolean => {
    if (isNaN(ml) || ml < 500 || ml > 10000) {
      return false;
    }
    setSettings((prev) => ({ ...prev, waterTargetMl: ml }));
    saveWaterTarget(ml);
    return true;
  }, []);

  const updateNotificationPref = useCallback((key: keyof NotificationPreferences, value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value,
      },
    }));
  }, []);

  const updateGamificationPref = useCallback((key: keyof GamificationPreferences, value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      gamification: {
        ...prev.gamification,
        [key]: value,
      },
    }));
  }, []);

  const resetSettingsToDefault = useCallback(() => {
    const defaults = loadSettings();
    setSettings(defaults);
  }, []);

  const value = useMemo<SettingsContextType>(
    () => ({
      settings,
      updateTheme,
      updateAccentColor,
      toggleCompactMode,
      updateWaterTarget,
      updateNotificationPref,
      updateGamificationPref,
      resetSettingsToDefault,
    }),
    [
      settings,
      updateTheme,
      updateAccentColor,
      toggleCompactMode,
      updateWaterTarget,
      updateNotificationPref,
      updateGamificationPref,
      resetSettingsToDefault,
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
