import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface SpotifyContextType {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  isConnected: boolean;
  forceReconnect: () => void;
}

const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined);

export function SpotifyProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Function to validate token by making a test API call
  const validateToken = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  // Function to clear expired token and force re-authentication
  const forceReconnect = () => {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_user_name');
    setAccessToken(null);
  };

  useEffect(() => {
    // Check if there's a stored token in localStorage
    const storedToken = localStorage.getItem('spotify_access_token');
    const tokenTimestamp = localStorage.getItem('spotify_token_timestamp');
    
    if (storedToken && tokenTimestamp) {
      const tokenAge = Date.now() - parseInt(tokenTimestamp);
      const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
      
      // If token is less than 55 minutes old, use it (Spotify tokens expire after 1 hour)
      if (tokenAge < (55 * 60 * 1000)) {
        setAccessToken(storedToken);
      } else {
        // Token might be expired, validate it
        validateToken(storedToken).then(isValid => {
          if (isValid) {
            setAccessToken(storedToken);
            // Update timestamp since token is still valid
            localStorage.setItem('spotify_token_timestamp', Date.now().toString());
          } else {
            // Token is invalid/expired, try to refresh or clear it
            forceReconnect();
          }
        });
      }
    }

    // Check if we're coming back from Spotify auth
    const urlParams = new URLSearchParams(window.location.search);
    const spotifyToken = urlParams.get('spotify_token');
    const spotifyError = urlParams.get('spotify_error');
    const spotifyUser = urlParams.get('spotify_user');
    
    if (spotifyToken) {
      setAccessToken(spotifyToken);
      localStorage.setItem('spotify_access_token', spotifyToken);
      if (spotifyUser) {
        localStorage.setItem('spotify_user_name', spotifyUser);
      }
      // Remove the tokens from the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (spotifyError) {
      console.error('Spotify authentication error:', spotifyError);
      // Remove the error from the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSetAccessToken = (token: string | null) => {
    setAccessToken(token);
    if (token) {
      localStorage.setItem('spotify_access_token', token);
      localStorage.setItem('spotify_token_timestamp', Date.now().toString());
    } else {
      localStorage.removeItem('spotify_access_token');
      localStorage.removeItem('spotify_token_timestamp');
      localStorage.removeItem('spotify_refresh_token');
    } else {
      localStorage.removeItem('spotify_access_token');
    }
  };

  return (
    <SpotifyContext.Provider value={{
      accessToken,
      setAccessToken: handleSetAccessToken,
      isConnected: !!accessToken,
      forceReconnect
    }}>
      {children}
    </SpotifyContext.Provider>
  );
}

export function useSpotify() {
  const context = useContext(SpotifyContext);
  if (context === undefined) {
    throw new Error('useSpotify must be used within a SpotifyProvider');
  }
  return context;
}