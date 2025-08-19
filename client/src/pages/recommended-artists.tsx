import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { PlaybackControls } from "@/components/playback-controls";
import { CreatePlaylistModalEnhanced } from "@/components/create-playlist-modal-enhanced";
import { SearchBar } from "@/components/search-bar";
import { SpotifyConnect } from "@/components/spotify-connect";
import { TokenExpiredNotice } from "@/components/token-expired-notice";
import { useSpotify } from "@/hooks/use-spotify";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Users, Music, Plus, Loader2, ExternalLink } from "lucide-react";

export default function RecommendedArtists() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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

  // Get recommended artists based on user's listening history
  const { data: recommendedArtists, isLoading: recommendedLoading } = useQuery({
    queryKey: ["/api/spotify/recommended-artists"],
    enabled: !!accessToken,
  });

  // Get user's followed artists to filter out already followed ones
  const { data: followedArtists, isLoading: followedLoading } = useQuery({
    queryKey: ["/api/spotify/followed-artists"],
    enabled: !!accessToken,
  });

  // Filter out artists that user already follows
  const getFilteredRecommendations = () => {
    if (!recommendedArtists || !Array.isArray(recommendedArtists)) return [];
    if (!followedArtists || !Array.isArray(followedArtists)) return recommendedArtists;

    const followedIds = new Set(followedArtists.map((artist: any) => artist.id));
    return recommendedArtists.filter((artist: any) => !followedIds.has(artist.id));
  };

  const filteredRecommendations = getFilteredRecommendations();

  const handleFollowArtist = async (artistId: string) => {
    try {
      const response = await fetch(`https://api.spotify.com/v1/me/following?type=artist&ids=${artistId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Refresh the data
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to follow artist:', error);
    }
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
        <div className="flex-1 overflow-y-auto scrollbar-hide main-content">
          <div className="p-8">
            {!isConnected && (
              <TokenExpiredNotice onReconnect={handleReconnect} />
            )}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">Recommended Artists</h1>
                <p className="text-gray-400">Discover new artists based on your listening preferences</p>
              </div>
            </div>

            {recommendedLoading || followedLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-listlab-green" />
                <span className="ml-3 text-gray-400">Finding artists you might like...</span>
              </div>
            ) : (
              <div>
                {filteredRecommendations.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredRecommendations.map((artist: any) => (
                      <Card key={artist.id} className="bg-listlab-light-gray border-gray-700 hover:bg-gray-700 transition-colors group">
                        <CardContent className="p-6">
                          <div className="text-center">
                            <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden bg-gray-600">
                              {artist.images && artist.images[0] ? (
                                <img
                                  src={artist.images[0].url}
                                  alt={artist.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Music className="h-12 w-12 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <h3 className="font-semibold text-white mb-2 truncate">{artist.name}</h3>
                            <p className="text-sm text-gray-400 mb-4">
                              {artist.followers?.total ? `${Math.floor(artist.followers.total / 1000)}K followers` : 'Artist'}
                            </p>
                            <div className="space-y-2">
                              <Button
                                size="sm"
                                className="w-full listlab-green listlab-green-hover text-black font-medium"
                                onClick={() => handleFollowArtist(artist.id)}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Follow
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-listlab-green border-listlab-green hover:bg-listlab-green hover:text-black"
                                onClick={() => setIsCreateModalOpen(true)}
                              >
                                Create Playlist
                              </Button>
                            </div>
                            {artist.genres && artist.genres.length > 0 && (
                              <div className="mt-3">
                                <div className="flex flex-wrap gap-1 justify-center">
                                  {artist.genres.slice(0, 2).map((genre: string) => (
                                    <span
                                      key={genre}
                                      className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded-full"
                                    >
                                      {genre}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-400 mb-2">No New Recommendations</h3>
                    <p className="text-gray-500 mb-4">
                      We couldn't find new artists to recommend right now.
                    </p>
                    <p className="text-sm text-gray-500">
                      Try listening to more music on Spotify to get better recommendations.
                    </p>
                  </div>
                )}

                <div className="text-center py-8 border-t border-gray-800 mt-12">
                  <p className="text-gray-400 mb-2">Recommendations are based on:</p>
                  <div className="flex justify-center space-x-6 text-sm text-gray-500">
                    <span>• Your top artists</span>
                    <span>• Artists you follow</span>
                    <span>• Your listening history</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    Follow artists to get better recommendations and see their upcoming events
                  </p>
                </div>
              </div>
            )}
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