import axios from 'axios';
import { getAccessToken, getRefreshToken, removeTokens } from '../utils/auth';
import { API_BASE_URL } from '../config/apiConfig';

const api = axios.create({ baseURL: API_BASE_URL });

// Attach access token on every request
api.interceptors.request.use(
  config => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  error => Promise.reject(error)
);

// --- Refresh token flow on 401 responses -----------------------------------
//
// An expired access token is renewed with the refresh token. A *transient*
// refresh failure (rate limit, server error, dropped connection) must never end
// the session: the student is mid-activity, so we retry with backoff and leave
// their tokens alone. Only a refresh token the server actually rejects (401)
// means the session is over.
const REFRESH_RETRY_DELAYS_MS = [1000, 3000, 8000];
const MAX_RETRY_AFTER_MS = 15000;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const isTransientError = err => {
  const status = err?.response?.status;
  return !status || status === 429 || status >= 500;
};

const retryDelayMs = (err, fallbackMs) => {
  const retryAfter = Number(err?.response?.headers?.['retry-after']);
  return Number.isFinite(retryAfter) && retryAfter > 0
    ? Math.min(retryAfter * 1000, MAX_RETRY_AFTER_MS)
    : fallbackMs;
};

async function refreshAccessToken(refresh) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/token/refresh/`, { refresh });
      localStorage.setItem('accessToken', data.access);
      if (data.refresh) localStorage.setItem('refreshToken', data.refresh);
      return data.access;
    } catch (err) {
      if (!isTransientError(err) || attempt >= REFRESH_RETRY_DELAYS_MS.length) throw err;
      await sleep(retryDelayMs(err, REFRESH_RETRY_DELAYS_MS[attempt]));
    }
  }
}

// Requests that 401 together share one refresh instead of each issuing their own.
let refreshInFlight = null;
const refreshOnce = refresh => {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken(refresh).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

const endSession = () => {
  removeTokens();
  // Answers are backed up locally, so skip the "Leave site?" prompt that would
  // otherwise trap the student on a page that can no longer save.
  window.addEventListener('beforeunload', event => event.stopImmediatePropagation(), true);
  window.location.href = '/login';
};

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = getRefreshToken();
      if (!refresh) {
        endSession();
        return Promise.reject(error);
      }
      try {
        const access = await refreshOnce(refresh);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        if (!isTransientError(refreshError)) endSession();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// — Authentication —

// Sign in, store tokens
export const loginUser = async (username, password) => {
  const res = await axios.post(`${API_BASE_URL}/api/token/`, {
    username,
    password,
  });
  localStorage.setItem('accessToken', res.data.access);
  localStorage.setItem('refreshToken', res.data.refresh);
  return res.data;
};

export const guestLogin = async (classroomName = '1001') => {
  const res = await axios.post(`${API_BASE_URL}/api/student/guest-login/`, {
    classroom_name: classroomName,
  });
  localStorage.setItem('accessToken', res.data.access);
  localStorage.setItem('refreshToken', res.data.refresh);
  return res.data;
};

// Sign up a new student
export const signupUser = async userData => {
  const res = await api.post('/api/student/signup/', userData);
  return res.data;
};

// Fetch the current student’s profile
export const getCurrentUser = async () => {
  const res = await api.get('/api/student/profile/');
  return res.data;
};

// — Classroom enrollment —

// List all classrooms a student *could* join
export const getClassrooms = async () => {
  const res = await api.get('/api/classroom/classrooms/');
  return res.data;
};

// Add the current student to a classroom by username
export const addToRoster = async (classroomId, studentUsername) => {
  const res = await api.post(
    `/api/classroom/classrooms/${classroomId}/students/add/`,
    { student_username: studentUsername }
  );
  return res.data;
};

// — Inbox —

// Fetch paginated inbox messages
export const fetchInbox = async () => {
  const res = await api.get('/api/student/inbox/');
  return res.data.results || res.data;
};

// Toggle read/unread status on a message
export const toggleReadMessage = async (messageId, isRead) => {
  const res = await api.patch(
    `/api/student/inbox/${messageId}/read/`,
    { is_read: isRead }
  );
  return res.data;
};

// — Modules —

// Fetch list of all modules (Day 1–5)
export const fetchModules = async () => {
  const res = await api.get('/api/student/modules/');
  return res.data.results || res.data;
};

// Fetch one module’s detail
export const fetchModuleDetail = async moduleId => {
  const res = await api.get(`/api/student/modules/${moduleId}/`);
  return res.data;
};

// — Student Responses —

// Get existing answers for a module
export const getResponseDetail = moduleId =>
  api.get(`/api/student/modules/${moduleId}/response/detail/`).then(res => res.data);

// Create or update answers for a module
export const upsertResponse = (moduleId, answers) =>
  api
    .post(`/api/student/modules/${moduleId}/response/`, { answers })
    .then(res => res.data);

// — Workbooks —

// Fetch all workbooks
export const getWorkbooks = () =>
  api.get('/api/workbooks/workbooks/').then(res => res.data.results || []);

// Fetch one workbook with all of its sections
export const getWorkbookDetail = (workbookId, includeToc = false) =>
  api
    .get(`/api/workbooks/workbooks/${workbookId}/`, {
      params: { include_toc: includeToc }
    })
    .then(res => res.data);

export default api;
