import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { PlaybackControls } from "@/components/playback-controls";
import { CreatePlaylistModalEnhanced } from "@/components/create-playlist-modal-enhanced";
import { SearchBar } from "@/components/search-bar";
import { SpotifyConnect } from "@/components/spotify-connect";
import { TokenExpiredNotice } from "@/components/token-expired-notice";
import { useSpotify } from "@/hooks/use-spotify";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";

export default function Home() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { accessToken, setAccessToken, isConnected } = useSpotify();

  const handleReconnect = () => {
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
        setAccessToken(event.data.accessToken);
        authWindow?.close();
        window.removeEventListener('message', handleMessage);
      } else if (event.data.type === 'SPOTIFY_AUTH_ERROR') {
        console.error('Spotify auth error:', event.data.error);
        authWindow?.close();
        window.removeEventListener('message', handleMessage);
      }
    };

    window.addEventListener('message', handleMessage);

    // Close the window if it's closed manually
    const checkClosed = setInterval(() => {
      if (authWindow?.closed) {
        window.removeEventListener('message', handleMessage);
        clearInterval(checkClosed);
      }
    }, 1000);
  };

  return (
    <div className="flex h-screen bg-listlab-dark text-white overflow-hidden">
      <div className="w-60 flex-shrink-0 fixed h-full z-10">
        <Sidebar onCreatePlaylist={() => setIsCreateModalOpen(true)} />
      </div>
      
      <div className="flex-1 ml-60 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <div className="bg-listlab-gray px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              size="sm"
              variant="ghost"
              className="p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-70 text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-70 text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <SearchBar spotifyAccessToken={accessToken} />
          
          <div className="flex items-center space-x-4">
            <SpotifyConnect accessToken={accessToken} onConnect={setAccessToken} />
            <Button className="listlab-green listlab-green-hover text-black font-semibold px-6 py-2 rounded-full">
              Upgrade
            </Button>
            <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="p-8">
            {!isConnected && (
              <TokenExpiredNotice onReconnect={handleReconnect} />
            )}
            <div className="text-center py-20">
              <h1 className="text-4xl font-bold mb-4">Welcome to ListLab</h1>
              <p className="text-xl text-gray-400 mb-8">Your personal playlist management studio</p>
              <p className="text-gray-400 mb-8">
                Create new playlists or browse your Spotify playlists from the sidebar
              </p>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="listlab-green listlab-green-hover text-black font-semibold px-8 py-4 rounded-full flex items-center space-x-2 mx-auto text-lg"
              >
                <Plus className="h-5 w-5" />
                <span>Create Your First Playlist</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <PlaybackControls />
      <CreatePlaylistModalEnhanced 
        open={isCreateModalOpen} 
        onOpenChange={setIsCreateModalOpen} 
      />
    </div>
  );
}