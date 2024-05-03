import { getCookie } from 'cookies-next';

// getServerSideProps for the dashboard routes. The backend already refuses these writes and
// listings to anyone without the role; this keeps the wrong people from landing on pages full of
// forms that would all fail. Roles come from the backend (only it can read the token), asked the
// same way the browser asks.
const requireRole = (...allowed) => async ({ req, res }) => {
  const token = getCookie('authorization', { req, res });
  if (!token) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  let roles = [];
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BE_HOST_URL}/api/user/get-user-roles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    roles = response.ok ? await response.json() : [];
  } catch {
    // Backend unreachable: treat as not allowed; the dashboard API would fail anyway.
  }

  if (!Array.isArray(roles) || !allowed.some(role => roles.includes(role))) {
    return { redirect: { destination: '/home', permanent: false } };
  }

  return { props: { isLoggedIn: true } };
};

// /admin — the accounts and what players send in: admins and nobody else.
export const adminOnly = requireRole('ROLE_ADMIN');

// /content — the quiz content (categories, glossaries, questions, knowledge base), which the
// content roles work in alongside admins.
export const contentOnly = requireRole('ROLE_ADMIN', 'ROLE_CONTENT_EDITOR', 'ROLE_CONTENT_PUBLISHER');
