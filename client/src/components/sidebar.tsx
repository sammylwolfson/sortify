import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Home, Search, Library, Plus, Heart, List } from "lucide-react";
import type { Playlist } from "@shared/schema";

interface SidebarProps {
  onCreatePlaylist?: () => void;
}

export function Sidebar({ onCreatePlaylist }: SidebarProps) {
  const [location, setLocation] = useLocation();
  
  const { data: playlists } = useQuery({
    queryKey: ["/api/playlists"],
  });

  return (
    <div className="w-60 bg-black flex flex-col">
      {/* Logo and Main Navigation */}
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-8">
          <List className="text-3xl text-listlab-green" />
          <span className="text-xl font-bold">ListLab</span>
        </div>
        
        <nav className="space-y-4">
          <Button
            variant="ghost"
            className={`w-full justify-start space-x-3 p-3 h-auto ${
              location === "/" ? "text-white" : "text-listlab-text hover:text-white"
            }`}
            onClick={() => setLocation("/")}
          >
            <Home className="h-5 w-5" />
            <span className="font-medium">Home</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start space-x-3 p-3 h-auto text-listlab-text hover:text-white"
          >
            <Search className="h-5 w-5" />
            <span className="font-medium">Search</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start space-x-3 p-3 h-auto text-listlab-text hover:text-white"
          >
            <Library className="h-5 w-5" />
            <span className="font-medium">Your Library</span>
          </Button>
        </nav>
      </div>
      
      {/* Playlist Actions */}
      <div className="px-6 py-4 border-t border-gray-800">
        <Button
          variant="ghost"
          onClick={onCreatePlaylist}
          className="w-full justify-start space-x-3 p-3 h-auto text-listlab-text hover:text-white mb-4"
        >
          <Plus className="h-5 w-5" />
          <span className="font-medium">Create Playlist</span>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start space-x-3 p-3 h-auto text-listlab-text hover:text-white"
        >
          <Heart className="h-5 w-5" />
          <span className="font-medium">Liked Songs</span>
        </Button>
      </div>
      
      {/* Playlists List */}
      <div className="flex-1 px-6 overflow-y-auto scrollbar-hide">
        <div className="space-y-2">
          {playlists && Array.isArray(playlists) ? playlists.map((playlist: Playlist) => (
            <Button
              key={playlist.id}
              variant="ghost"
              onClick={() => setLocation(`/playlist/${playlist.id}`)}
              className={`w-full justify-start p-2 h-auto text-left ${
                location === `/playlist/${playlist.id}` 
                  ? "text-white" 
                  : "text-listlab-text hover:text-white"
              }`}
            >
              <span className="truncate">{playlist.name}</span>
            </Button>
          )) : null}
        </div>
      </div>
    </div>
  );
}
