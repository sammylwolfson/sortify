import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { Song } from "@shared/schema";

interface SearchBarProps {
  spotifyAccessToken?: string | null;
}

export function SearchBar({ spotifyAccessToken }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Use Spotify search if connected, otherwise use local search
  const searchEndpoint = spotifyAccessToken ? "/api/spotify/search" : "/api/songs/search";
  const searchHeaders = spotifyAccessToken ? {
    'Authorization': `Bearer ${spotifyAccessToken}`
  } : {};

  const { data: searchResults, isLoading } = useQuery({
    queryKey: [searchEndpoint, { q: searchQuery }],
    queryFn: () => 
      fetch(`${searchEndpoint}?q=${encodeURIComponent(searchQuery)}`, {
        headers: searchHeaders
      }).then(res => res.json()),
    enabled: searchQuery.length > 2,
  }) as { data: Song[] | undefined; isLoading: boolean };

  return (
    <div className="flex-1 max-w-md mx-8 relative">
      <div className="relative">
        <Input
          type="text"
          placeholder="Search for songs, artists, or albums..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white text-black rounded-full py-2 px-12 focus:outline-none focus:ring-2 focus:ring-listlab-green border-0"
        />
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
      </div>
      
      {/* Search Results Dropdown */}
      {searchQuery.length > 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-listlab-gray rounded-lg shadow-lg border border-gray-700 z-50 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center listlab-text">Searching...</div>
          ) : searchResults && searchResults.length > 0 ? (
            <div className="py-2">
              {searchResults.map((song: Song) => (
                <div
                  key={song.id}
                  className="px-4 py-2 hover:bg-listlab-light-gray cursor-pointer flex items-center space-x-3"
                >
                  <img
                    src={song.coverImage || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=50&h=50"}
                    alt={song.title}
                    className="w-10 h-10 rounded object-cover"
                  />
                  <div>
                    <p className="font-medium text-white">{song.title}</p>
                    <p className="text-sm listlab-text">{song.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center listlab-text">No results found</div>
          )}
        </div>
      )}
    </div>
  );
}
