import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { PlaybackControls } from "@/components/playback-controls";
import { CreatePlaylistModalEnhanced } from "@/components/create-playlist-modal-enhanced";
import { SearchBar } from "@/components/search-bar";
import { SpotifyConnect } from "@/components/spotify-connect";
import { TokenExpiredNotice } from "@/components/token-expired-notice";
// We'll create a simplified song display since SongList expects a different format
import { useSpotify } from "@/hooks/use-spotify";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Heart, Loader2 } from "lucide-react";

interface LikedSong {
  added_at: string;
  track: {
    id: string;
    name: string;
    artists: Array<{ id: string; name: string }>;
    album: {
      id: string;
      name: string;
      images: Array<{ url: string }>;
    };
    duration_ms: number;
    preview_url: string | null;
    external_urls: {
      spotify: string;
    };
  };
}

interface LikedSongsResponse {
  items: LikedSong[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
  previous: string | null;
}

export default function LikedSongs() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const { accessToken, setAccessToken, isConnected } = useSpotify();

  const handleReconnect = () => {
    const authWindow = window.open("/auth/spotify", "spotify-auth", "width=600,height=700,scrollbars=yes,resizable=yes");
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === 'SPOTIFY_AUTH_SUCCESS') {
        setAccessToken(event.data.accessToken);
        authWindow?.close();
        window.removeEventListener('message', handleMessage);
      }
    };
    window.addEventListener('message', handleMessage);
  };

  const itemsPerPage = 50;
  const offset = currentPage * itemsPerPage;

  // Get user's liked songs from Spotify
  const { data: likedSongsData, isLoading, error } = useQuery({
    queryKey: ["/api/spotify/liked-songs", { limit: itemsPerPage, offset }],
    queryFn: () => 
      fetch(`/api/spotify/liked-songs?limit=${itemsPerPage}&offset=${offset}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }).then(res => res.json()),
    enabled: !!accessToken
  }) as { data: LikedSongsResponse | undefined; isLoading: boolean; error: any };

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const totalPages = Math.ceil((likedSongsData?.total || 0) / itemsPerPage);

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar - Fixed */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col ml-64">
        {/* Top Bar */}
        <div className="bg-listlab-gray border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <SearchBar />
            <div className="flex items-center space-x-4">
              <SpotifyConnect 
                accessToken={accessToken} 
                onConnect={setAccessToken} 
              />
              <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
            </div>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="p-8">
            {!isConnected && (
              <TokenExpiredNotice onReconnect={handleReconnect} />
            )}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-800 to-blue-600 rounded-lg flex items-center justify-center">
                  <Heart className="h-8 w-8 text-white fill-current" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold">Liked Songs</h1>
                  <p className="text-listlab-text mt-2">
                    {likedSongsData?.total || 0} liked songs
                  </p>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-listlab-green" />
                <span className="ml-2 text-listlab-text">Loading your liked songs...</span>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-red-400 mb-4">
                  {error.message?.includes('scope') || error.message?.includes('403') 
                    ? "You need to reconnect Spotify with additional permissions to access liked songs" 
                    : "Failed to load liked songs"}
                </p>
                <Button 
                  onClick={handleReconnect}
                  variant="outline"
                  className="text-listlab-green border-listlab-green hover:bg-listlab-green hover:text-black"
                >
                  Reconnect Spotify
                </Button>
              </div>
            ) : !likedSongsData?.items || likedSongsData.items.length === 0 ? (
              <div className="text-center py-20">
                <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No liked songs yet</h3>
                <p className="text-listlab-text">
                  Start liking songs on Spotify to see them here!
                </p>
              </div>
            ) : (
              <>
                {/* Custom Songs Table */}
                <div className="bg-listlab-gray rounded-lg overflow-hidden">
                  <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-700 text-sm text-gray-400 font-medium">
                    <div className="col-span-1">#</div>
                    <div className="col-span-5">Title</div>
                    <div className="col-span-3">Album</div>
                    <div className="col-span-2">Date Added</div>
                    <div className="col-span-1">Duration</div>
                  </div>
                  {likedSongsData?.items.map((item, index) => (
                    <div
                      key={item.track.id}
                      className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-b-0"
                    >
                      <div className="col-span-1 text-gray-400 text-sm">
                        {offset + index + 1}
                      </div>
                      <div className="col-span-5 flex items-center space-x-3">
                        {item.track.album.images[0] && (
                          <img
                            src={item.track.album.images[0].url}
                            alt={item.track.album.name}
                            className="w-10 h-10 rounded"
                          />
                        )}
                        <div>
                          <div className="font-medium text-white">{item.track.name}</div>
                          <div className="text-sm text-gray-400">
                            {item.track.artists.map(a => a.name).join(', ')}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-3 text-gray-400 text-sm">
                        {item.track.album.name}
                      </div>
                      <div className="col-span-2 text-gray-400 text-sm">
                        {new Date(item.added_at).toLocaleDateString()}
                      </div>
                      <div className="col-span-1 text-gray-400 text-sm">
                        {formatDuration(item.track.duration_ms)}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center space-x-4 mt-8">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                      disabled={currentPage === 0}
                      className="text-listlab-text border-gray-600 hover:text-white hover:border-white"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                    
                    <span className="text-listlab-text">
                      Page {currentPage + 1} of {totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                      disabled={currentPage >= totalPages - 1}
                      className="text-listlab-text border-gray-600 hover:text-white hover:border-white"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Playback Controls */}
      <PlaybackControls />

      {/* Create Playlist Modal */}
      <CreatePlaylistModalEnhanced
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  );
}