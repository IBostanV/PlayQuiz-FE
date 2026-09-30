import { getCookie, hasCookie } from 'cookies-next';
import { CLIENT_ERROR_PATH } from '../api/constant';

// A page stuck in an error loop stops reporting after this many; the server caps it too.
const MAX_REPORTS = 20;
let reported = 0;

// Logs an error to the console and sends it to the backend log. Plain fetch, not the request
// helper: a report that fails must not toast, nor report its own failure. No CSRF token needed
// (the server exempts this path).
export const reportError = (kind, error) => {
  console.error(`[PlayQuiz] ${kind}`, error);
  if (typeof window === 'undefined' || reported >= MAX_REPORTS) {
    return;
  }
  reported++;

  const message = error instanceof Error ? error.message : (typeof error === 'string' ? error : JSON.stringify(error));
  fetch(`${process.env.NEXT_PUBLIC_BE_HOST_URL ?? ''}${CLIENT_ERROR_PATH}`, {
    method: 'POST',
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
      ...(hasCookie('authorization') ? { Authorization: `Bearer ${getCookie('authorization')}` } : undefined),
    },
    body: JSON.stringify({
      kind: kind.slice(0, 50),
      message: (message || 'Unknown error').slice(0, 2000),
      stack: error?.stack?.slice(0, 8000),
      page: window.location.href.slice(0, 500),
      userAgent: navigator.userAgent.slice(0, 500),
    }),
  }).catch(() => undefined);
};
