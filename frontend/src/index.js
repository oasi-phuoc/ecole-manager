import React from 'react';
import ReactDOM from 'react-dom/client';
import apiClient from './lib/apiClient';
import './index.css';
import './styles/mobile.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

apiClient.defaults.withCredentials = true;
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    if (
      err.response?.status === 403
      && err.response?.data?.mfa_required
      && path !== '/activer-mfa'
      && path !== '/login'
    ) {
      window.location.replace('/activer-mfa');
    }
    return Promise.reject(err);
  }
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
