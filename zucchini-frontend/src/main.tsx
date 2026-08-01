import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import 'antd/dist/reset.css';
import 'leaflet/dist/leaflet.css';
import './utils/leafletIconFix';

const queryClient = new QueryClient();

// Disable MSW for now
// if (import.meta.env.DEV) {
//   import('./mocks/browser').then(({ worker }) =>
//     worker.start({ onUnhandledRequest: 'bypass' })
//   );
// }

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);