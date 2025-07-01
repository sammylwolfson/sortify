import type { Artist } from "@shared/schema";

interface ArtistCardProps {
  artist: Artist;
}

export function ArtistCard({ artist }: ArtistCardProps) {
  return (
    <div className="playlist-card p-4 rounded-lg cursor-pointer text-center">
      <img
        src={artist.image || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300"}
        alt={artist.name}
        className="w-full aspect-square object-cover rounded-full shadow-lg mb-4"
      />
      <h3 className="font-semibold text-white mb-1 truncate">{artist.name}</h3>
      <p className="text-sm spotify-text">Artist</p>
    </div>
  );
}
