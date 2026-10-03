import '@vitejs/plugin-react/preamble';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safely suppress benign ResizeObserver loop notification warnings across browser engines
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (
      event.message === 'ResizeObserver loop completed with undelivered notifications.' ||
      event.message === 'ResizeObserver loop limit exceeded' ||
      event.message?.includes('ResizeObserver loop')
    ) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

