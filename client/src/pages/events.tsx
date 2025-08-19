import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { PlaybackControls } from "@/components/playback-controls";
import { CreatePlaylistModalEnhanced } from "@/components/create-playlist-modal-enhanced";
import { SearchBar } from "@/components/search-bar";
import { SpotifyConnect } from "@/components/spotify-connect";
import { useSpotify } from "@/hooks/use-spotify";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock } from "lucide-react";

export default function Events() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { accessToken, setAccessToken } = useSpotify();

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
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold">Upcoming Events</h1>
              <Button variant="outline" className="text-listlab-green border-listlab-green hover:bg-listlab-green hover:text-black">
                <Calendar className="h-4 w-4 mr-2" />
                Connect Calendar
              </Button>
            </div>
            
            <div className="grid gap-4">
              <Card className="bg-listlab-light-gray border-gray-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-listlab-green" />
                      Concert Night
                    </CardTitle>
                    <div className="text-sm text-gray-400 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      8:00 PM
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center text-gray-300">
                      <MapPin className="h-4 w-4 mr-2 text-listlab-green" />
                      Madison Square Garden, NYC
                    </div>
                    <p className="text-gray-400">Live music event featuring your favorite artists</p>
                    <Button 
                      size="sm" 
                      className="listlab-green listlab-green-hover text-black mt-2"
                      onClick={() => setIsCreateModalOpen(true)}
                    >
                      Create Playlist for Event
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-listlab-light-gray border-gray-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-listlab-green" />
                      Music Festival
                    </CardTitle>
                    <div className="text-sm text-gray-400 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      2:00 PM
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center text-gray-300">
                      <MapPin className="h-4 w-4 mr-2 text-listlab-green" />
                      Central Park, NYC
                    </div>
                    <p className="text-gray-400">Weekend festival with multiple artists and genres</p>
                    <Button 
                      size="sm" 
                      className="listlab-green listlab-green-hover text-black mt-2"
                      onClick={() => setIsCreateModalOpen(true)}
                    >
                      Create Playlist for Event
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">Connect your calendar to see personalized upcoming events</p>
                <p className="text-sm text-gray-500">Events will sync with your music preferences to suggest playlist creation</p>
              </div>
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