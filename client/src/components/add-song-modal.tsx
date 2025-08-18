import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import type { Song } from "@shared/schema";

interface AddSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlistId: number;
}

export function AddSongModal({ isOpen, onClose, playlistId }: AddSongModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["/api/songs/search", { q: searchQuery }],
    enabled: searchQuery.length > 2,
  });

  const addSongMutation = useMutation({
    mutationFn: async ({ songId, position }: { songId: number; position: number }) => {
      const response = await apiRequest("POST", `/api/playlists/${playlistId}/songs`, {
        songId,
        position,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", playlistId.toString()] });
      toast({
        title: "Success",
        description: "Song added to playlist!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add song to playlist",
        variant: "destructive",
      });
    },
  });

  const handleAddSong = (song: Song) => {
    // Add song at the end of the playlist
    addSongMutation.mutate({ songId: song.id, position: 999 });
  };

  const handleClose = () => {
    setSearchQuery("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-spotify-gray border-gray-600 text-white max-w-2xl max-h-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Add Songs to Playlist</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Input
              type="text"
              placeholder="Search for songs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-spotify-light-gray border-gray-600 text-white focus:ring-spotify-green focus:border-transparent pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>

          {/* Search Results */}
          <div className="max-h-96 overflow-y-auto">
            {searchQuery.length <= 2 ? (
              <div className="text-center py-8 spotify-text">
                <p>Type at least 3 characters to search for songs</p>
              </div>
            ) : isLoading ? (
              <div className="text-center py-8 spotify-text">
                <p>Searching...</p>
              </div>
            ) : searchResults && Array.isArray(searchResults) && searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((song: Song) => (
                  <div
                    key={song.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-spotify-light-gray transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <img
                        src={song.coverImage || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=50&h=50"}
                        alt={song.title}
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white truncate">{song.title}</p>
                        <p className="text-sm spotify-text truncate">{song.artist}</p>
                        {song.album && (
                          <p className="text-xs spotify-text truncate">{song.album}</p>
                        )}
                      </div>
                      <div className="text-sm spotify-text flex-shrink-0">
                        {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddSong(song)}
                      disabled={addSongMutation.isPending}
                      className="ml-4 spotify-green spotify-green-hover text-black font-semibold px-4 py-2 rounded-full flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add</span>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 spotify-text">
                <p>No songs found. Try a different search term.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-600">
          <Button
            onClick={handleClose}
            variant="outline"
            className="bg-transparent border-gray-600 text-white hover:border-gray-400"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}