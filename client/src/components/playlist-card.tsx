import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import type { Playlist } from "@shared/schema";

interface PlaylistCardProps {
  playlist: Playlist;
}

export function PlaylistCard({ playlist }: PlaylistCardProps) {
  const [, setLocation] = useLocation();

  const handleClick = () => {
    setLocation(`/playlist/${playlist.id}`);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement play functionality
    console.log("Playing playlist:", playlist.name);
  };

  return (
    <div
      className="playlist-card p-4 rounded-lg cursor-pointer relative group"
      onClick={handleClick}
    >
      <div className="relative mb-4">
        <img
          src={playlist.coverImage || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300"}
          alt={playlist.name}
          className="w-full aspect-square object-cover rounded-lg shadow-lg"
        />
        <Button
          size="sm"
          onClick={handlePlayClick}
          className="play-button absolute bottom-2 right-2 w-12 h-12 spotify-green hover:scale-105 transition-all shadow-lg rounded-full p-0"
        >
          <Play className="h-5 w-5 text-black ml-1" fill="currentColor" />
        </Button>
      </div>
      <h3 className="font-semibold text-white mb-1 truncate">{playlist.name}</h3>
      <p className="text-sm spotify-text truncate">
        {playlist.description || "Created by you"}
      </p>
    </div>
  );
}
