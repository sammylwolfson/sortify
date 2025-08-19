// Clear all authentication tokens to force login
export function clearAuth() {
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_user_name');
  sessionStorage.clear();
}

// Force logout and redirect to login
export function forceLogout() {
  clearAuth();
  window.location.reload();
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('spotify_access_token');
}