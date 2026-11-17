import { env } from '../../config/env';
export function paymentRedirect(value?: string) {
  if (!value) return 'aibus://payment-result';
  try {
    const url = new URL(value);
    if (url.protocol === 'aibus:' && url.hostname === 'payment-result') return url.toString();
    const origins = env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter((s) => s !== '*');
    if ((url.protocol === 'https:' || (env.NODE_ENV !== 'production' && url.protocol === 'http:')) && origins.includes(url.origin) && url.pathname === '/payment-result') return url.toString();
  } catch { /* Return to the application rather than an untrusted redirect destination. */ }
  return 'aibus://payment-result';
}
