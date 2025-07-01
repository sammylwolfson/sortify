import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { Song } from "@shared/schema";

export function SearchBar() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["/api/songs/search", { q: searchQuery }],
    enabled: searchQuery.length > 2,
  });

  return (
    <div className="flex-1 max-w-md mx-8 relative">
      <div className="relative">
        <Input
          type="text"
          placeholder="Search for songs, artists, or albums..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white text-black rounded-full py-2 px-12 focus:outline-none focus:ring-2 focus:ring-spotify-green border-0"
        />
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
      </div>
      
      {/* Search Results Dropdown */}
      {searchQuery.length > 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-spotify-gray rounded-lg shadow-lg border border-gray-700 z-50 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center spotify-text">Searching...</div>
          ) : searchResults && searchResults.length > 0 ? (
            <div className="py-2">
              {searchResults.map((song: Song) => (
                <div
                  key={song.id}
                  className="px-4 py-2 hover:bg-spotify-light-gray cursor-pointer flex items-center space-x-3"
                >
                  <img
                    src={song.coverImage || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=50&h=50"}
                    alt={song.title}
                    className="w-10 h-10 rounded object-cover"
                  />
                  <div>
                    <p className="font-medium text-white">{song.title}</p>
                    <p className="text-sm spotify-text">{song.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center spotify-text">No results found</div>
          )}
        </div>
      )}
    </div>
  );
}
