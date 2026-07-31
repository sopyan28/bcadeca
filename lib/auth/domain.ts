const ALLOWED_DOMAIN = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN ?? 'bergen.org';

export function isAllowedEmail(email: string): boolean {
  const at = email.lastIndexOf('@');
  if (at === -1) return false;
  const domain = email.slice(at + 1).toLowerCase();
  return domain === ALLOWED_DOMAIN.toLowerCase() || domain.endsWith(`.${ALLOWED_DOMAIN.toLowerCase()}`);
}

export const allowedDomain = ALLOWED_DOMAIN;
