import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import './styles/mobile.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

axios.defaults.withCredentials = true;
axios.interceptors.response.use(
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

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
