import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface SpotifyContextType {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  isConnected: boolean;
}

const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined);

export function SpotifyProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // Check if there's a stored token in localStorage
    const storedToken = localStorage.getItem('spotify_access_token');
    if (storedToken) {
      setAccessToken(storedToken);
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
    } else {
      localStorage.removeItem('spotify_access_token');
    }
  };

  return (
    <SpotifyContext.Provider value={{
      accessToken,
      setAccessToken: handleSetAccessToken,
      isConnected: !!accessToken
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