import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Play, Heart, MoreHorizontal, Clock } from "lucide-react";
import type { PlaylistSong, Song } from "@shared/schema";

interface SongListProps {
  playlistId: number;
  songs: (PlaylistSong & { song: Song })[];
}

export function SongList({ playlistId, songs }: SongListProps) {
  const [hoveredSong, setHoveredSong] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const removeSongMutation = useMutation({
    mutationFn: async (songId: number) => {
      await apiRequest("DELETE", `/api/playlists/${playlistId}/songs/${songId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", playlistId.toString()] });
      toast({
        title: "Success",
        description: "Song removed from playlist",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove song from playlist",
        variant: "destructive",
      });
    },
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlaySong = (song: Song) => {
    // TODO: Implement play functionality
    console.log("Playing song:", song.title);
  };

  const handleRemoveSong = (songId: number) => {
    removeSongMutation.mutate(songId);
  };

  if (songs.length === 0) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold mb-4">No songs in this playlist</h2>
        <p className="spotify-text">Add some songs to get started!</p>
      </div>
    );
  }

  return (
    <div className="px-8 pb-8">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm spotify-text uppercase tracking-wider border-b border-gray-800 mb-4">
        <div className="col-span-1">#</div>
        <div className="col-span-5">Title</div>
        <div className="col-span-3">Album</div>
        <div className="col-span-2">Date Added</div>
        <div className="col-span-1 flex justify-end">
          <Clock className="h-4 w-4" />
        </div>
      </div>

      {/* Songs */}
      <div className="space-y-1">
        {songs.map((playlistSong, index) => (
          <div
            key={playlistSong.id}
            className="group grid grid-cols-12 gap-4 px-4 py-2 rounded-md hover:bg-spotify-light-gray transition-colors"
            onMouseEnter={() => setHoveredSong(playlistSong.id)}
            onMouseLeave={() => setHoveredSong(null)}
          >
            <div className="col-span-1 flex items-center">
              {hoveredSong === playlistSong.id ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handlePlaySong(playlistSong.song)}
                  className="p-0 h-auto text-white hover:text-spotify-green"
                >
                  <Play className="h-4 w-4" fill="currentColor" />
                </Button>
              ) : (
                <span className="text-sm spotify-text">{index + 1}</span>
              )}
            </div>
            
            <div className="col-span-5 flex items-center space-x-3 min-w-0">
              <img
                src={playlistSong.song.coverImage || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=50&h=50"}
                alt={playlistSong.song.title}
                className="w-10 h-10 rounded object-cover flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="font-medium text-white truncate">{playlistSong.song.title}</p>
                <p className="text-sm spotify-text truncate">{playlistSong.song.artist}</p>
              </div>
            </div>
            
            <div className="col-span-3 flex items-center">
              <p className="text-sm spotify-text truncate">{playlistSong.song.album || "Unknown Album"}</p>
            </div>
            
            <div className="col-span-2 flex items-center">
              <p className="text-sm spotify-text">
                {playlistSong.addedAt ? new Date(playlistSong.addedAt).toLocaleDateString() : "Unknown"}
              </p>
            </div>
            
            <div className="col-span-1 flex items-center justify-end space-x-2">
              <Button
                size="sm"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100 p-1 text-spotify-text hover:text-white"
              >
                <Heart className="h-4 w-4" />
              </Button>
              <span className="text-sm spotify-text">
                {formatDuration(playlistSong.song.duration)}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveSong(playlistSong.songId)}
                className="opacity-0 group-hover:opacity-100 p-1 text-spotify-text hover:text-white"
                disabled={removeSongMutation.isPending}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
