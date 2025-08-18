import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Music, ExternalLink, Download, CheckCircle } from "lucide-react";

interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: Array<{ url: string }>;
  tracks: { total: number };
  public: boolean;
}

interface SpotifyConnectProps {
  accessToken: string | null;
  onConnect: (token: string) => void;
}

export function SpotifyConnect({ accessToken, onConnect }: SpotifyConnectProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: spotifyPlaylists, isLoading } = useQuery({
    queryKey: ["/api/spotify/playlists"],
    queryFn: () => 
      fetch("/api/spotify/playlists", {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }).then(res => res.json()),
    enabled: !!accessToken
  }) as { data: SpotifyPlaylist[] | undefined; isLoading: boolean };

  const syncPlaylistMutation = useMutation({
    mutationFn: async (spotifyId: string) => {
      return await apiRequest("POST", `/api/spotify/sync-playlist/${spotifyId}`, {}, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      toast({
        title: "Success",
        description: "Playlist synced successfully from Spotify",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to sync playlist from Spotify",
        variant: "destructive",
      });
    },
  });

  const handleSpotifyConnect = () => {
    window.location.href = "/auth/spotify";
  };

  const handleSyncPlaylist = (spotifyId: string) => {
    syncPlaylistMutation.mutate(spotifyId);
  };

  if (!accessToken) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="text-listlab-green border-listlab-green hover:bg-listlab-green hover:text-black">
            <Music className="h-4 w-4 mr-2" />
            Connect Spotify
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-listlab-gray border-gray-700" aria-describedby="spotify-connect-description">
          <DialogHeader>
            <DialogTitle className="text-white">Connect to Spotify</DialogTitle>
          </DialogHeader>
          <div id="spotify-connect-description" className="sr-only">
            Connect your Spotify account to import playlists and access the full music catalog
          </div>
          <div className="space-y-4">
            <p className="text-listlab-text">
              Connect your Spotify account to import your playlists and access millions of songs.
            </p>
            <div className="space-y-2">
              <h4 className="font-medium text-white">What you'll get:</h4>
              <ul className="text-sm text-listlab-text space-y-1">
                <li>• Import your existing playlists</li>
                <li>• Search the full Spotify catalog</li>
                <li>• Sync changes back to Spotify</li>
                <li>• Access high-quality album artwork</li>
              </ul>
            </div>
            <Button 
              onClick={handleSpotifyConnect}
              className="w-full bg-listlab-green text-black hover:bg-green-400"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect with Spotify
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-listlab-green border-listlab-green hover:bg-listlab-green hover:text-black">
          <CheckCircle className="h-4 w-4 mr-2" />
          Spotify Connected
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-listlab-gray border-gray-700 max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" aria-describedby="spotify-playlists-description">
        <DialogHeader>
          <DialogTitle className="text-white">Your Spotify Playlists</DialogTitle>
        </DialogHeader>
        <div id="spotify-playlists-description" className="sr-only">
          View and import your Spotify playlists into ListLab
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8 text-listlab-text">Loading your playlists...</div>
          ) : spotifyPlaylists && spotifyPlaylists.length > 0 ? (
            <div className="space-y-3">
              {spotifyPlaylists.map((playlist) => (
                <div key={playlist.id} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
                  <img
                    src={playlist.images[0]?.url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=60&h=60"}
                    alt={playlist.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white truncate">{playlist.name}</h4>
                    <p className="text-sm text-listlab-text truncate">
                      {playlist.tracks.total} tracks
                      {playlist.description && ` • ${playlist.description}`}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant={playlist.public ? "default" : "secondary"} className="text-xs">
                        {playlist.public ? "Public" : "Private"}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSyncPlaylist(playlist.id)}
                    disabled={syncPlaylistMutation.isPending}
                    className="bg-listlab-green text-black hover:bg-green-400"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Import
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-listlab-text">
              No playlists found in your Spotify account.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}