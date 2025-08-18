import { Button } from "@/components/ui/button";
import { Music } from "lucide-react";

export function SpotifyAuthButton() {
  const handleSpotifyAuth = () => {
    // Open Spotify auth in a new window to avoid CORS issues
    const authWindow = window.open(
      "/auth/spotify",
      "spotify-auth",
      "width=600,height=700,scrollbars=yes,resizable=yes"
    );

    // Listen for the auth completion
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'SPOTIFY_AUTH_SUCCESS') {
        authWindow?.close();
        window.location.reload(); // Reload to pick up the new token
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Clean up listener if window is closed manually
    const checkClosed = setInterval(() => {
      if (authWindow?.closed) {
        window.removeEventListener('message', handleMessage);
        clearInterval(checkClosed);
      }
    }, 1000);
  };

  return (
    <Button 
      onClick={handleSpotifyAuth}
      variant="outline" 
      className="text-listlab-green border-listlab-green hover:bg-listlab-green hover:text-black"
    >
      <Music className="h-4 w-4 mr-2" />
      Connect Spotify
    </Button>
  );
}