import apiClient from './api';

/**
 * Authentication Service
 * Communicates with actual backend endpoints:
 * - POST /api/auth/login
 * - POST /api/auth/register
 * - POST /api/auth/google
 * - GET  /api/auth/me
 */

export const loginWithEmail = async (email, password) => {
  const response = await apiClient.post('/api/auth/login', {
    email: email.trim(),
    password: password,
  });
  return response.data;
};


export const registerWithEmail = async (name, email, password) => {
  const response = await apiClient.post('/api/auth/register', {
    full_name: name.trim(),
    email: email.trim(),
    password: password,
  });
  return response.data;
};


export const verifyGoogleCredential = async (credential) => {
  const response = await apiClient.post('/api/auth/google', {
    credential,
  });
  return response.data;
};

export const fetchCurrentUser = async () => {
  const response = await apiClient.get('/api/auth/me');
  return response.data;
};
