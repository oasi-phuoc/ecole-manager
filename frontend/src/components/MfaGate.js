import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Navigate } from 'react-router-dom';
import { getSessionUser, setSessionUser } from '../utils/session';
import { MFA_SETUP_PATH } from '../utils/mfa';

const API = process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';

export default function MfaGate({ children }) {
  const [state, setState] = useState('checking');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await axios.get(API + '/auth/mfa/status');
        const enabled = res.data?.mfa_enabled === true;
        const current = getSessionUser() || {};
        setSessionUser({ ...current, mfa_enabled: enabled });
        if (active) setState(enabled ? 'ok' : 'need');
      } catch {
        if (active) setState('need');
      }
    })();
    return () => { active = false; };
  }, []);

  if (state === 'checking') return null;
  if (state === 'need') return <Navigate to={MFA_SETUP_PATH} replace />;
  return children;
}
