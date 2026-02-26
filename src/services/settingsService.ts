/**
 * Simple localStorage wrapper for managing reusable lists
 * of departments and procedures — like a "saved contacts" list
 * that appears as dropdown suggestions.
 */

const STORAGE_KEY = 'infoDisplaySettings';

export interface AppSettings {
  departments: string[];
  procedures: string[];
}

const DEFAULT_SETTINGS: AppSettings = {
  departments: [
    'interventional-cardiology',
    'cardiac-surgery',
    'general-surgery',
  ],
  procedures: [],
};

export function getDefaultSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, departments: [...DEFAULT_SETTINGS.departments], procedures: [...DEFAULT_SETTINGS.procedures] };
}

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppSettings;
  } catch { /* ignore corrupt data */ }
  return getDefaultSettings();
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
