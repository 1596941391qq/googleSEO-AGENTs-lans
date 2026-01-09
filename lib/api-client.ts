/**
 * API Client Utility
 * Provides authenticated fetch and other API-related helpers
 */

/**
 * Enhanced fetch that automatically adds Authorization header
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('auth_token');
  
  const headers = new Headers(options.headers || {});
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  // Handle 401 Unauthorized globally if needed
  if (response.status === 401) {
    console.warn('[API] Unauthorized (401). User might need to re-login.');
    // Optional: Clear token or redirect to login
    // localStorage.removeItem('auth_token');
    // window.location.href = '/login'; 
  }
  
  return response;
}

/**
 * Helper for POST requests
 */
export async function postWithAuth(url: string, data: any, options: RequestInit = {}): Promise<Response> {
  return fetchWithAuth(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(data),
  });
}
