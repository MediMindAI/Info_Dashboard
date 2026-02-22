export interface AppConfig {
  baseUrl: string;
  clientId: string;
  projectId: string;
  displayEmail: string;
  displayPassword: string;
}

const config: AppConfig = {
  baseUrl: import.meta.env.VITE_MEDPLUM_BASE_URL || 'https://api.medplum.com/',
  clientId: import.meta.env.VITE_MEDPLUM_CLIENT_ID || '',
  projectId: import.meta.env.VITE_MEDPLUM_PROJECT_ID || '',
  displayEmail: import.meta.env.VITE_DISPLAY_EMAIL || '',
  displayPassword: import.meta.env.VITE_DISPLAY_PASSWORD || '',
};

export function getConfig(): AppConfig {
  return config;
}
