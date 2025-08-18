import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Play, Heart, Clock, Plus } from "lucide-react";

interface SpotifyTrack {
  track: {
    id: string;
    name: string;
    artists: Array<{ name: string }>;
    album: {
      name: string;
      images: Array<{ url: string }>;
    };
    duration_ms: number;
    preview_url: string | null;
  };
  added_at: string;
}

interface SpotifyPlaylistDetails {
  id: string;
  name: string;
  description: string;
  images: Array<{ url: string }>;
  tracks: {
    total: number;
    items: SpotifyTrack[];
  };
  public: boolean;
  owner: {
    display_name: string;
  };
}

export function SpotifyPlaylistDetail() {
  const params = useParams();
  const playlistId = params.id;

  const { data: playlist, isLoading } = useQuery<SpotifyPlaylistDetails>({
    queryKey: [`/api/spotify/playlists/${playlistId}`],
    enabled: !!playlistId,
  });

  const formatDuration = (durationMs: number) => {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex-1 bg-gradient-to-b from-listlab-green/20 to-listlab-gray">
        <div className="p-8">
          <div className="animate-pulse">
            <div className="h-64 bg-gray-700 rounded mb-6"></div>
            <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex-1 bg-listlab-gray flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Playlist not found</h2>
          <p className="text-listlab-text">Unable to load this Spotify playlist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-listlab-green/20 to-listlab-gray">
      {/* Playlist Header */}
      <div className="flex items-end p-8 pb-6">
        <img
          src={playlist.images[0]?.url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300"}
          alt={playlist.name}
          className="w-60 h-60 rounded-lg shadow-2xl mr-8"
        />
        <div className="flex-1">
          <p className="text-sm font-semibold uppercase tracking-wider mb-2">Spotify Playlist</p>
          <h1 className="text-6xl font-bold mb-4 text-white">{playlist.name}</h1>
          {playlist.description && (
            <p className="text-listlab-text mb-4 text-lg">{playlist.description}</p>
          )}
          <div className="flex items-center text-sm text-listlab-text space-x-2">
            <span className="font-semibold text-white">{playlist.owner.display_name}</span>
            <span>•</span>
            <span>{playlist.tracks.total} songs</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-8 pb-6">
        <div className="flex items-center space-x-6">
          <Button size="lg" className="rounded-full w-14 h-14 bg-listlab-green hover:bg-listlab-green/90 text-black">
            <Play className="h-6 w-6 ml-1" fill="currentColor" />
          </Button>
          <Button variant="ghost" size="lg" className="text-listlab-text hover:text-white">
            <Heart className="h-8 w-8" />
          </Button>
        </div>
      </div>

      {/* Song List */}
      <div className="px-8 pb-8">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm text-listlab-text uppercase tracking-wider border-b border-gray-800 mb-4">
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
          {playlist.tracks.items.map((item, index) => (
            <div
              key={item.track.id}
              className="group grid grid-cols-12 gap-4 px-4 py-2 rounded-md hover:bg-white/10 transition-colors"
            >
              <div className="col-span-1 flex items-center">
                <span className="text-sm text-listlab-text group-hover:hidden">{index + 1}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-0 h-auto text-white hover:text-listlab-green hidden group-hover:block"
                >
                  <Play className="h-4 w-4" fill="currentColor" />
                </Button>
              </div>
              
              <div className="col-span-5 flex items-center space-x-3 min-w-0">
                <img
                  src={item.track.album.images[2]?.url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=50&h=50"}
                  alt={item.track.name}
                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{item.track.name}</p>
                  <p className="text-sm text-listlab-text truncate">
                    {item.track.artists.map(artist => artist.name).join(', ')}
                  </p>
                </div>
              </div>
              
              <div className="col-span-3 flex items-center">
                <p className="text-sm text-listlab-text truncate">{item.track.album.name}</p>
              </div>
              
              <div className="col-span-2 flex items-center">
                <p className="text-sm text-listlab-text">
                  {new Date(item.added_at).toLocaleDateString()}
                </p>
              </div>
              
              <div className="col-span-1 flex items-center justify-end space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 p-1 text-listlab-text hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="text-sm text-listlab-text">
                  {formatDuration(item.track.duration_ms)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}