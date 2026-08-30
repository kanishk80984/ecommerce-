import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import * as rrdPkg from 'react-router-dom';
const { BrowserRouter } = rrdPkg;
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import App from './App';
import { SsrDataProvider } from './ssr/SsrDataContext';
import './index.css';

const rootElement = document.getElementById('root');

// Read initial SSR data from window if present
const initialSsrData = window.__SSR_DATA__ || null;

const app = (
  <React.StrictMode>
    <Provider store={store}>
      <SsrDataProvider initialData={initialSsrData}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SsrDataProvider>
    </Provider>
  </React.StrictMode>
);

if (import.meta.env.SSR || window.__SSR_DATA__) {
  hydrateRoot(rootElement, app);
} else {
  createRoot(rootElement).render(app);
}


