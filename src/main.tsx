import { MantineProvider, createTheme, localStorageColorSchemeManager } from '@mantine/core';
import '@mantine/core/styles.css';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import { MedplumClient } from '@medplum/core';
import { MedplumProvider } from '@medplum/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { getConfig } from './config';
import './theme.css';

const config = getConfig();

const medplum = new MedplumClient({
  baseUrl: config.baseUrl,
  clientId: config.clientId,
  cacheTime: 60000,
  onUnauthenticated: () => {
    // No-op: StaffPanel and DisplayBoard handle auth inline
  },
});

const theme = createTheme({
  fontFamily: "'Noto Sans Georgian', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  colors: {
    dark: [
      '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b',
      '#475569', '#334155', '#1e293b', '#0f172a', '#020617',
    ],
    blue: [
      '#e8f0f8', '#c7dbed', '#a5c5e2', '#83afd7', '#6199cc',
      '#3182ce', '#2b6cb0', '#245a8c', '#1d4869', '#1a365d',
    ],
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MedplumProvider medplum={medplum}>
      <MantineProvider theme={theme} defaultColorScheme="light" colorSchemeManager={localStorageColorSchemeManager({ key: 'infoDisplayTheme' })}>
        <Notifications position="top-center" />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MantineProvider>
    </MedplumProvider>
  </StrictMode>
);
