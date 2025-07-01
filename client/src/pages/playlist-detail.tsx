import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { SongList } from "@/components/song-list";
import { PlaybackControls } from "@/components/playback-controls";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Play, MoreHorizontal, Heart } from "lucide-react";
import type { PlaylistWithSongs } from "@shared/schema";

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  
  const { data: playlist, isLoading } = useQuery({
    queryKey: ["/api/playlists", id],
    enabled: !!id,
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTotalDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-spotify-dark">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-spotify-green mx-auto mb-4"></div>
            <p className="text-lg spotify-text">Loading playlist...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex h-screen bg-spotify-dark">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Playlist not found</h1>
            <p className="spotify-text">The playlist you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  const playlistData = playlist as PlaylistWithSongs;

  return (
    <div className="flex h-screen bg-spotify-dark text-white overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <div className="bg-spotify-gray px-8 py-4 flex items-center justify-between">
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
          
          <SearchBar />
          
          <div className="flex items-center space-x-4">
            <Button className="spotify-green spotify-green-hover text-black font-semibold px-6 py-2 rounded-full">
              Upgrade
            </Button>
            <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
          </div>
        </div>
        
        {/* Playlist Header */}
        <div className="relative">
          <div className="bg-gradient-to-b from-purple-900 to-spotify-gray p-8">
            <div className="flex items-end space-x-6">
              <div className="flex-shrink-0">
                <img
                  src={playlistData.coverImage || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300"}
                  alt={playlistData.name}
                  className="w-48 h-48 rounded-lg shadow-2xl"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold uppercase tracking-wider mb-2">Playlist</p>
                <h1 className="text-5xl font-bold mb-4 break-words">{playlistData.name}</h1>
                {playlistData.description && (
                  <p className="text-lg spotify-text mb-4">{playlistData.description}</p>
                )}
                <div className="flex items-center space-x-1 text-sm">
                  <span className="font-semibold">Created by you</span>
                  <span className="spotify-text">•</span>
                  <span className="spotify-text">{playlistData.songCount} songs</span>
                  <span className="spotify-text">•</span>
                  <span className="spotify-text">{formatTotalDuration(playlistData.totalDuration)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Playlist Actions */}
          <div className="bg-spotify-gray px-8 py-6 flex items-center space-x-6">
            <Button
              size="lg"
              className="w-14 h-14 rounded-full spotify-green hover:scale-105 transition-transform shadow-lg"
            >
              <Play className="h-6 w-6 text-black ml-1" fill="currentColor" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-spotify-text hover:text-white"
            >
              <Heart className="h-8 w-8" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-spotify-text hover:text-white"
            >
              <MoreHorizontal className="h-8 w-8" />
            </Button>
          </div>
        </div>
        
        {/* Song List */}
        <div className="flex-1 overflow-y-auto">
          <SongList playlistId={parseInt(id!)} songs={playlistData.songs} />
        </div>
      </div>
      
      <PlaybackControls />
    </div>
  );
}
