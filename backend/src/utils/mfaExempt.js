const appliquerMfaExempt = async (db, userId, exempt) => {
  if (exempt === true || exempt === 'true') {
    await db.query(
      `UPDATE utilisateurs
       SET mfa_exempt = true,
           mfa_enabled = false,
           mfa_secret = NULL,
           mfa_enabled_at = NULL,
           mfa_backup_codes = '[]'::jsonb
       WHERE id = $1`,
      [userId]
    );
    return true;
  }
  if (exempt === false || exempt === 'false') {
    await db.query('UPDATE utilisateurs SET mfa_exempt = false WHERE id = $1', [userId]);
    return false;
  }
  return null;
};

module.exports = { appliquerMfaExempt };
