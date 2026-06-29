import { AuthSession, User } from '../types.js';

const SESSION_KEY = 'communitycomrade_session';

export function getSession(): AuthSession {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to parse session', e);
  }
  return { user: null, token: null };
}

export function saveSession(user: User, token: string) {
  const session: AuthSession = { user, token };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function getAuthHeaders() {
  const session = getSession();
  return {
    'Content-Type': 'application/json',
    ...(session.token ? { 'Authorization': `Bearer ${session.token}` } : {})
  };
}
