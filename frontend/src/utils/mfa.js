export const MFA_SETUP_PATH = '/activer-mfa';

export const needsMfaSetup = (user) => Boolean(user) && user.mfa_enabled !== true;

export const redirectAfterAuth = (navigate, user) => {
  if (user?.doit_changer_mdp) return 'change-mdp';
  if (needsMfaSetup(user)) {
    navigate(MFA_SETUP_PATH, { replace: true });
    return 'mfa';
  }
  navigate('/dashboard', { replace: true });
  return 'ok';
};
