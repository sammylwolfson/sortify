import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { List, Music } from "lucide-react";

export default function Login() {
  const handleSpotifyLogin = () => {
    // Clear any existing tokens to force fresh login
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_user_name');
    
    // Open Spotify auth in a new window
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
        // Force page reload to update auth state
        window.location.reload();
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
    <div className="min-h-screen bg-gradient-to-br from-listlab-gray via-black to-listlab-gray flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-listlab-gray border-gray-700">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <List className="text-4xl text-listlab-green" />
            <span className="text-3xl font-bold text-white">ListLab</span>
          </div>
          <CardTitle className="text-2xl text-white">Welcome to ListLab</CardTitle>
          <CardDescription className="text-listlab-text">
            Your personal playlist management studio. Connect with Spotify to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleSpotifyLogin}
            className="w-full bg-listlab-green hover:bg-listlab-green/90 text-black font-semibold py-3"
            size="lg"
          >
            <Music className="h-5 w-5 mr-2" />
            Login with Spotify
          </Button>
          <p className="text-xs text-listlab-text text-center">
            By continuing, you agree to connect your Spotify account to access and manage your music library.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}