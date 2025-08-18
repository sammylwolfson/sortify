import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { PlaylistCard } from "@/components/playlist-card";
import { ArtistCard } from "@/components/artist-card";
import { PlaybackControls } from "@/components/playback-controls";
import { CreatePlaylistModal } from "@/components/create-playlist-modal";
import { SearchBar } from "@/components/search-bar";
import { SpotifyConnect } from "@/components/spotify-connect";
import { useSpotify } from "@/hooks/use-spotify";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import type { Playlist, Artist } from "@shared/schema";

export default function Home() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { accessToken, setAccessToken } = useSpotify();

  const { data: playlists, isLoading: playlistsLoading } = useQuery({
    queryKey: ["/api/playlists"],
  });

  const { data: artists, isLoading: artistsLoading } = useQuery({
    queryKey: ["/api/artists"],
  });

  const equipmentItems = [
    {
      id: 1,
      name: "Mixing Console",
      description: "Professional audio equipment",
      image: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=300"
    },
    {
      id: 2,
      name: "Studio Microphone",
      description: "Recording equipment",
      image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300"
    },
    {
      id: 3,
      name: "Studio Headphones",
      description: "Monitoring equipment",
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300"
    },
    {
      id: 4,
      name: "MIDI Controller",
      description: "Music production",
      image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300"
    }
  ];

  return (
    <div className="flex h-screen bg-listlab-dark text-white overflow-hidden">
      <Sidebar onCreatePlaylist={() => setIsCreateModalOpen(true)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
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
              <h1 className="text-3xl font-bold">Your Playlists</h1>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="listlab-green listlab-green-hover text-black font-semibold px-6 py-3 rounded-full flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create Playlist</span>
              </Button>
            </div>
            
            {/* Playlists Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
              {playlistsLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-listlab-light-gray rounded-lg p-4">
                      <div className="aspect-square bg-gray-600 rounded-lg mb-4"></div>
                      <div className="h-4 bg-gray-600 rounded mb-2"></div>
                      <div className="h-3 bg-gray-600 rounded w-3/4"></div>
                    </div>
                  </div>
                ))
              ) : (
                playlists && Array.isArray(playlists) ? playlists.map((playlist: Playlist) => (
                  <PlaylistCard key={playlist.id} playlist={playlist} />
                )) : null
              )}
            </div>
            
            {/* Recently Played Artists */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6">Recently Played Artists</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                {artistsLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-listlab-light-gray rounded-lg p-4 text-center">
                        <div className="aspect-square bg-gray-600 rounded-full mb-4"></div>
                        <div className="h-4 bg-gray-600 rounded mb-2"></div>
                        <div className="h-3 bg-gray-600 rounded w-1/2 mx-auto"></div>
                      </div>
                    </div>
                  ))
                ) : (
                  artists && Array.isArray(artists) ? artists.map((artist: Artist) => (
                    <ArtistCard key={artist.id} artist={artist} />
                  )) : null
                )}
              </div>
            </div>
            
            {/* Music Equipment Section */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6">Studio Equipment</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {equipmentItems.map((item) => (
                  <div key={item.id} className="playlist-card p-4 rounded-lg cursor-pointer">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full aspect-video object-cover rounded-lg shadow-lg mb-4"
                    />
                    <h3 className="font-semibold text-white mb-1">{item.name}</h3>
                    <p className="text-sm listlab-text">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <PlaybackControls />
      <CreatePlaylistModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </div>
  );
}
