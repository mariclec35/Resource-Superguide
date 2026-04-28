import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { logger } from './lib/logger';
import type { HomepageStats } from './types';

// Initialize global error capture
logger.initGlobalCapture();

const defaultHomepageStats: HomepageStats = {
  resources: 0,
  meetings: 0,
  events: 0,
};

async function bootstrap() {
  try {
    const response = await fetch(`/api/stats/homepage?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch initial homepage stats: ${response.status}`);
    }

    const data = await response.json();
    window.__INITIAL_HOMEPAGE_STATS__ = {
      resources: Number(data.resources) || 0,
      meetings: Number(data.meetings) || 0,
      events: Number(data.events) || 0,
    };
  } catch (error) {
    console.error('Unable to preload homepage stats:', error);
    window.__INITIAL_HOMEPAGE_STATS__ = defaultHomepageStats;
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
