import { useState, useEffect } from "react";
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
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock, Loader2 } from "lucide-react";

export default function Events() {
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

  // Get user's followed artists from Spotify
  const { data: followedArtists, isLoading: artistsLoading } = useQuery({
    queryKey: ["/api/spotify/followed-artists"],
    enabled: !!accessToken,
  });

  // Get user's country for region filtering
  const { data: userLocationData, isLoading: locationLoading } = useQuery({
    queryKey: ["/api/spotify/user-country"],
    enabled: !!accessToken,
  });

  // Generate upcoming concerts for followed artists (using mock data - in real app, would use concert API like Songkick, Bandsintown, etc.)
  const generatePersonalizedEvents = () => {
    if (!followedArtists || !Array.isArray(followedArtists) || followedArtists.length === 0) {
      return [];
    }

    const venues = [
      "Madison Square Garden, NYC", "The Forum, Los Angeles", "Red Rocks Amphitheatre, Colorado",
      "Royal Albert Hall, London", "Sydney Opera House", "Hollywood Bowl, LA",
      "Wembley Stadium, London", "Coachella Valley, CA", "Austin City Limits, TX"
    ];

    const dates = [
      "Tonight", "Tomorrow", "This Weekend", "Next Week", "February 15th", 
      "February 22nd", "March 8th", "March 15th", "April 2nd"
    ];

    const times = ["7:30 PM", "8:00 PM", "9:00 PM", "7:00 PM", "8:30 PM"];

    // Generate events for up to the first 6 followed artists
    const events = followedArtists.slice(0, 6).map((artist, index) => ({
      id: index + 1,
      artist: artist.name,
      venue: venues[index % venues.length],
      date: dates[index % dates.length],
      time: times[index % times.length],
      description: `Live concert featuring ${artist.name} with special guests`,
      region: userLocationData?.country || "US",
      image: artist.images?.[0]?.url || null,
      genres: artist.genres?.slice(0, 2) || []
    }));

    return events;
  };

  const personalizedEvents = generatePersonalizedEvents();

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
              <h1 className="text-3xl font-bold">Upcoming Events</h1>
              <div className="flex items-center space-x-2">
                {userLocationData?.country && (
                  <span className="text-sm text-gray-400 bg-listlab-light-gray px-3 py-1 rounded-full">
                    📍 {userLocationData.country}
                  </span>
                )}
                <Button variant="outline" className="text-listlab-green border-listlab-green hover:bg-listlab-green hover:text-black">
                  <Calendar className="h-4 w-4 mr-2" />
                  Connect More Events
                </Button>
              </div>
            </div>

            {artistsLoading || locationLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-listlab-green" />
                <span className="ml-3 text-gray-400">Loading your personalized events...</span>
              </div>
            ) : (
              <div className="grid gap-4">
                {personalizedEvents.length > 0 ? (
                  personalizedEvents.map((event) => (
                    <Card key={event.id} className="bg-listlab-light-gray border-gray-700">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {event.image && (
                              <img 
                                src={event.image} 
                                alt={event.artist}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            )}
                            <div>
                              <CardTitle className="text-white flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-listlab-green" />
                                {event.artist}
                              </CardTitle>
                              {event.genres && event.genres.length > 0 && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {event.genres.join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-gray-400 flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {event.time}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center text-gray-300">
                            <MapPin className="h-4 w-4 mr-2 text-listlab-green" />
                            {event.venue}
                          </div>
                          <div className="text-sm font-medium text-white">
                            📅 {event.date}
                          </div>
                          <p className="text-gray-400">{event.description}</p>
                          <div className="text-xs text-listlab-green font-medium">
                            ✓ From your followed artists
                          </div>
                          <Button 
                            size="sm" 
                            className="listlab-green listlab-green-hover text-black mt-2"
                            onClick={() => setIsCreateModalOpen(true)}
                          >
                            Create Playlist for {event.artist}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-400 mb-2">No Events Found</h3>
                    <p className="text-gray-500 mb-4">
                      We couldn't find upcoming events for the artists you follow in your region ({userLocationData?.country || 'your area'}).
                    </p>
                    <p className="text-sm text-gray-500">
                      Follow more artists on Spotify to see personalized concert recommendations here.
                    </p>
                  </div>
                )}

                <div className="text-center py-8 border-t border-gray-800 mt-8">
                  <p className="text-gray-400 mb-2">Events are personalized based on:</p>
                  <div className="flex justify-center space-x-6 text-sm text-gray-500">
                    <span>• Artists you follow on Spotify</span>
                    <span>• Your region ({userLocationData?.country || 'Unknown'})</span>
                    <span>• Upcoming concert dates</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    To see real events, connect with concert APIs like Songkick or Bandsintown
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