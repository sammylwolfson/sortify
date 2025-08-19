import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Home, Search, Library, Plus, Heart, List, Music, Calendar, Users } from "lucide-react";
import type { Playlist } from "@shared/schema";
import { useSpotify } from "@/hooks/use-spotify";

interface SidebarProps {
  onCreatePlaylist?: () => void;
}

export function Sidebar({ onCreatePlaylist }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { accessToken } = useSpotify();
  
  const { data: playlists } = useQuery({
    queryKey: ["/api/playlists"],
  });

  const { data: spotifyPlaylists } = useQuery({
    queryKey: ["/api/spotify/playlists"],
    enabled: !!accessToken,
  });

  return (
    <div className="w-60 bg-black flex flex-col">
      {/* Logo and Main Navigation */}
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-8">
          <List className="text-3xl text-listlab-green" />
          <span className="text-xl font-bold">ListLab</span>
        </div>
        
        <nav className="space-y-4">
          <Button
            variant="ghost"
            className={`w-full justify-start space-x-3 p-3 h-auto ${
              location === "/" ? "text-white" : "text-listlab-text hover:text-white"
            }`}
            onClick={() => setLocation("/")}
          >
            <Home className="h-5 w-5" />
            <span className="font-medium">Home</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start space-x-3 p-3 h-auto text-listlab-text hover:text-white"
          >
            <Search className="h-5 w-5" />
            <span className="font-medium">Search</span>
          </Button>

          <Button
            variant="ghost"
            className={`w-full justify-start space-x-3 p-3 h-auto ${
              location === "/events" ? "text-white" : "text-listlab-text hover:text-white"
            }`}
            onClick={() => setLocation("/events")}
          >
            <Calendar className="h-5 w-5" />
            <span className="font-medium">Upcoming Events</span>
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start space-x-3 p-3 h-auto ${
              location === "/recommended-artists" ? "text-white" : "text-listlab-text hover:text-white"
            }`}
            onClick={() => setLocation("/recommended-artists")}
          >
            <Users className="h-5 w-5" />
            <span className="font-medium">Recommended Artists</span>
          </Button>
        </nav>
      </div>
      
      {/* Playlist Actions */}
      <div className="px-6 py-4 border-t border-gray-800">
        <Button
          variant="ghost"
          onClick={onCreatePlaylist}
          className="w-full justify-start space-x-3 p-3 h-auto text-listlab-text hover:text-white mb-4"
        >
          <Plus className="h-5 w-5" />
          <span className="font-medium">Create Playlist</span>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start space-x-3 p-3 h-auto text-listlab-text hover:text-white mb-4"
        >
          <Library className="h-5 w-5" />
          <span className="font-medium">Your Library</span>
        </Button>
        <Button
          variant="ghost"
          onClick={() => setLocation("/liked-songs")}
          className={`w-full justify-start space-x-3 p-3 h-auto ${
            location === "/liked-songs" ? "text-white" : "text-listlab-text hover:text-white"
          }`}
        >
          <Heart className="h-5 w-5 fill-current" />
          <span className="font-medium">Liked Songs</span>
        </Button>
      </div>
      
      {/* Spotify Playlists */}
      {accessToken && (
        <div className="px-6 py-4 border-t border-gray-800">
          <h3 className="text-sm font-semibold text-listlab-text mb-3 uppercase tracking-wider">Your Spotify Playlists</h3>
          {isLoading ? (
            <div className="text-center py-4">
              <div className="text-sm text-listlab-text">Loading playlists...</div>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <div className="text-sm text-red-400 mb-2">
                {error.message?.includes('401') || error.message?.includes('Unauthorized') 
                  ? "Token expired - reconnect needed" 
                  : "Failed to load playlists"}
              </div>
              <Button
                size="sm"
                onClick={() => {
                  const authWindow = window.open("/auth/spotify", "spotify-auth", "width=600,height=700,scrollbars=yes,resizable=yes");
                  const handleMessage = (event: MessageEvent) => {
                    if (event.origin !== window.location.origin) return;
                    if (event.data.type === 'SPOTIFY_AUTH_SUCCESS') {
                      window.location.reload(); // Refresh to get new playlists
                      authWindow?.close();
                      window.removeEventListener('message', handleMessage);
                    }
                  };
                  window.addEventListener('message', handleMessage);
                }}
                variant="outline"
                className="text-listlab-green border-listlab-green hover:bg-listlab-green hover:text-black text-xs"
              >
                Reconnect Spotify
              </Button>
            </div>
          ) : spotifyPlaylists && Array.isArray(spotifyPlaylists) && spotifyPlaylists.length > 0 ? (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {spotifyPlaylists.map((playlist: any) => (
              <Button
                key={playlist.id}
                variant="ghost"
                onClick={() => setLocation(`/spotify-playlist/${playlist.id}`)}
                className={`w-full justify-start text-left p-2 h-auto text-sm truncate ${
                  location === `/spotify-playlist/${playlist.id}` 
                    ? "text-white" 
                    : "text-listlab-text hover:text-white"
                }`}
              >
                <Music className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">{playlist.name}</span>
              </Button>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-sm text-listlab-text">No playlists found</div>
            </div>
          )}
        </div>
      )}

      {/* ListLab Playlists */}
      <div className="flex-1 px-6 overflow-y-auto scrollbar-hide">
        <div className="space-y-2">
          {playlists && Array.isArray(playlists) ? playlists.map((playlist: Playlist) => (
            <Button
              key={playlist.id}
              variant="ghost"
              onClick={() => setLocation(`/playlist/${playlist.id}`)}
              className={`w-full justify-start p-2 h-auto text-left ${
                location === `/playlist/${playlist.id}` 
                  ? "text-white" 
                  : "text-listlab-text hover:text-white"
              }`}
            >
              <span className="truncate">{playlist.name}</span>
            </Button>
          )) : null}
        </div>
      </div>
    </div>
  );
}
