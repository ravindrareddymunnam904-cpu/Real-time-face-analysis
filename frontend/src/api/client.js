// API client for AI Vision backend

const API_BASE = '/api';

export const getStoredToken = () => {
  return localStorage.getItem('ai_vision_token') || null;
};

export const setStoredToken = (token) => {
  if (token) {
    localStorage.setItem('ai_vision_token', token);
  } else {
    localStorage.removeItem('ai_vision_token');
  }
};

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('ai_vision_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

export const setStoredUser = (user) => {
  if (user) {
    localStorage.setItem('ai_vision_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('ai_vision_user');
  }
};

async function request(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
  } catch (netErr) {
    clearTimeout(timeoutId);
    throw new Error(netErr.name === 'AbortError' ? 'Server connection timed out.' : 'Network connection error.');
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401) {
    // If unauthorized, clear token
    setStoredToken(null);
    setStoredUser(null);
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = { detail: 'Unexpected response from server' };
  }

  if (!response.ok) {
    const errorMsg = data.detail || (Array.isArray(data) ? data[0]?.msg : 'Request failed');
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  auth: {
    login: async (email, password) => {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setStoredToken(data.access_token);
      setStoredUser(data.user);
      return data;
    },
    register: async (name, email, password) => {
      const data = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      setStoredToken(data.access_token);
      setStoredUser(data.user);
      return data;
    },
    getMe: async () => {
      const data = await request('/auth/me');
      setStoredUser(data);
      return data;
    },
    updateSettings: async (settings) => {
      return await request('/auth/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
    },
    logout: () => {
      setStoredToken(null);
      setStoredUser(null);
    },
  },
  sessions: {
    getSessions: async () => {
      return await request('/sessions');
    },
    saveSession: async (sessionData) => {
      return await request('/sessions', {
        method: 'POST',
        body: JSON.stringify(sessionData),
      });
    },
    deleteSession: async (id) => {
      return await request(`/sessions/${id}`, {
        method: 'DELETE',
      });
    },
    clearSessions: async () => {
      return await request('/sessions', {
        method: 'DELETE',
      });
    },
  },
  faces: {
    getAll: async () => {
      return await request('/history/faces');
    },
    delete: async (id) => {
      return await request(`/history/faces/${id}`, {
        method: 'DELETE',
      });
    },
  },
  analytics: {
    getAnalytics: async () => {
      return await request('/analytics');
    },
  },
  health: async () => {
    return await request('/health');
  },
};
