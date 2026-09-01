import React, { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { Navigate } from 'react-router-dom';
import { getSessionUser, setSessionUser } from '../utils/session';
import { MFA_SETUP_PATH } from '../utils/mfa';


export default function MfaGate({ children }) {
  const [state, setState] = useState('checking');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiClient.get('/auth/mfa/status');
        const enabled = res.data?.mfa_enabled === true;
        const exempt = res.data?.mfa_exempt === true;
        const current = getSessionUser() || {};
        setSessionUser({ ...current, mfa_enabled: enabled, mfa_exempt: exempt });
        if (active) setState(exempt || enabled ? 'ok' : 'need');
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
