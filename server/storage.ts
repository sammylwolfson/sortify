import { 
  playlists, 
  songs, 
  playlistSongs, 
  artists, 
  users,
  type Playlist, 
  type Song, 
  type PlaylistSong, 
  type Artist, 
  type User,
  type InsertPlaylist, 
  type InsertSong, 
  type InsertPlaylistSong, 
  type InsertArtist, 
  type InsertUser,
  type PlaylistWithSongs
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Playlists
  getPlaylists(userId: number): Promise<Playlist[]>;
  getPlaylist(id: number): Promise<Playlist | undefined>;
  getPlaylistWithSongs(id: number): Promise<PlaylistWithSongs | undefined>;
  createPlaylist(playlist: InsertPlaylist & { userId: number }): Promise<Playlist>;
  updatePlaylist(id: number, playlist: Partial<InsertPlaylist>): Promise<Playlist | undefined>;
  deletePlaylist(id: number): Promise<boolean>;

  // Songs
  getSongs(): Promise<Song[]>;
  getSong(id: number): Promise<Song | undefined>;
  getSongBySpotifyId(spotifyId: string): Promise<Song | undefined>;
  createSong(song: InsertSong): Promise<Song>;
  searchSongs(query: string): Promise<Song[]>;

  // Playlist Songs
  addSongToPlaylist(playlistSong: InsertPlaylistSong): Promise<PlaylistSong>;
  removeSongFromPlaylist(playlistId: number, songId: number): Promise<boolean>;
  getPlaylistSongs(playlistId: number): Promise<(PlaylistSong & { song: Song })[]>;

  // Artists
  getArtists(): Promise<Artist[]>;
  getArtist(id: number): Promise<Artist | undefined>;
  createArtist(artist: InsertArtist): Promise<Artist>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private playlists: Map<number, Playlist>;
  private songs: Map<number, Song>;
  private playlistSongs: Map<number, PlaylistSong>;
  private artists: Map<number, Artist>;
  private currentUserId: number;
  private currentPlaylistId: number;
  private currentSongId: number;
  private currentPlaylistSongId: number;
  private currentArtistId: number;

  constructor() {
    this.users = new Map();
    this.playlists = new Map();
    this.songs = new Map();
    this.playlistSongs = new Map();
    this.artists = new Map();
    this.currentUserId = 1;
    this.currentPlaylistId = 1;
    this.currentSongId = 1;
    this.currentPlaylistSongId = 1;
    this.currentArtistId = 1;

    // Initialize with sample data
    this.initializeData();
  }

  private initializeData() {
    // Create sample user
    const user: User = {
      id: this.currentUserId++,
      username: "user",
      password: "password"
    };
    this.users.set(user.id, user);

    // Create sample songs with audio features
    const sampleSongs: (Song & { audioFeatures: any })[] = [
      { 
        id: this.currentSongId++, title: "Blinding Lights", artist: "The Weeknd", album: "After Hours", duration: 200, 
        coverImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300", audioUrl: null,
        audioFeatures: { bpm: 171, energy: 0.78, danceability: 0.51, loudness: -5.9, valence: 0.33, acousticness: 0.001, popularity: 85, genres: ["pop", "electronic"] }
      },
      { 
        id: this.currentSongId++, title: "Watermelon Sugar", artist: "Harry Styles", album: "Fine Line", duration: 174, 
        coverImage: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=300&h=300", audioUrl: null,
        audioFeatures: { bpm: 95, energy: 0.54, danceability: 0.55, loudness: -4.7, valence: 0.56, acousticness: 0.122, popularity: 81, genres: ["pop", "indie"] }
      },
      { 
        id: this.currentSongId++, title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", duration: 203, 
        coverImage: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300", audioUrl: null,
        audioFeatures: { bpm: 103, energy: 0.82, danceability: 0.70, loudness: -3.1, valence: 0.92, acousticness: 0.003, popularity: 88, genres: ["pop", "disco"] }
      },
      { 
        id: this.currentSongId++, title: "Good 4 U", artist: "Olivia Rodrigo", album: "SOUR", duration: 178, 
        coverImage: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=300", audioUrl: null,
        audioFeatures: { bpm: 166, energy: 0.66, danceability: 0.56, loudness: -5.1, valence: 0.56, acousticness: 0.102, popularity: 79, genres: ["pop", "rock"] }
      },
      { 
        id: this.currentSongId++, title: "Stay", artist: "The Kid LAROI & Justin Bieber", album: "F*CK LOVE 3", duration: 141, 
        coverImage: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=300&h=300", audioUrl: null,
        audioFeatures: { bpm: 169, energy: 0.76, danceability: 0.59, loudness: -5.5, valence: 0.75, acousticness: 0.012, popularity: 92, genres: ["pop", "hip-hop"] }
      },
      { 
        id: this.currentSongId++, title: "Heat Waves", artist: "Glass Animals", album: "Dreamland", duration: 238, 
        coverImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300", audioUrl: null,
        audioFeatures: { bpm: 80, energy: 0.76, danceability: 0.76, loudness: -6.7, valence: 0.44, acousticness: 0.44, popularity: 90, genres: ["indie", "alternative"] }
      },
      { 
        id: this.currentSongId++, title: "As It Was", artist: "Harry Styles", album: "Harry's House", duration: 167, 
        coverImage: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=300&h=300", audioUrl: null,
        audioFeatures: { bpm: 173, energy: 0.54, danceability: 0.51, loudness: -8.3, valence: 0.70, acousticness: 0.35, popularity: 100, genres: ["pop", "indie"] }
      },
      { 
        id: this.currentSongId++, title: "Anti-Hero", artist: "Taylor Swift", album: "Midnights", duration: 200, 
        coverImage: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300", audioUrl: null,
        audioFeatures: { bpm: 97, energy: 0.65, danceability: 0.71, loudness: -6.8, valence: 0.65, acousticness: 0.11, popularity: 95, genres: ["pop", "indie"] }
      },
      { 
        id: this.currentSongId++, title: "Unholy", artist: "Sam Smith ft. Kim Petras", album: "Gloria", duration: 156, 
        coverImage: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=300", audioUrl: null,
        audioFeatures: { bpm: 132, energy: 0.85, danceability: 0.80, loudness: -4.2, valence: 0.39, acousticness: 0.001, popularity: 87, genres: ["pop", "electronic"] }
      },
      { 
        id: this.currentSongId++, title: "Flowers", artist: "Miley Cyrus", album: "Endless Summer Vacation", duration: 200, 
        coverImage: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=300&h=300", audioUrl: null,
        audioFeatures: { bpm: 96, energy: 0.70, danceability: 0.69, loudness: -4.9, valence: 0.64, acousticness: 0.03, popularity: 93, genres: ["pop", "rock"] }
      },
    ];

    sampleSongs.forEach(songWithFeatures => {
      const { audioFeatures, ...song } = songWithFeatures;
      this.songs.set(song.id, song);
      // Store audio features separately for filtering (in real app, would be in database)
      (this as any).audioFeatures = (this as any).audioFeatures || new Map();
      (this as any).audioFeatures.set(song.id, audioFeatures);
    });

    // Create sample artists
    const sampleArtists: Artist[] = [
      { id: this.currentArtistId++, name: "The Weeknd", image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300", bio: null },
      { id: this.currentArtistId++, name: "Harry Styles", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300", bio: null },
      { id: this.currentArtistId++, name: "Dua Lipa", image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=300&h=300", bio: null },
      { id: this.currentArtistId++, name: "Olivia Rodrigo", image: "https://images.unsplash.com/photo-1563089145-599997674d42?w=300&h=300", bio: null },
      { id: this.currentArtistId++, name: "The Kid LAROI", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300", bio: null },
      { id: this.currentArtistId++, name: "Justin Bieber", image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300", bio: null },
    ];

    sampleArtists.forEach(artist => this.artists.set(artist.id, artist));

    // Create sample playlists
    const samplePlaylists: Playlist[] = [
      { id: this.currentPlaylistId++, name: "My Playlist #1", description: "My awesome playlist", coverImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300", userId: user.id, isPublic: false, createdAt: new Date() },
      { id: this.currentPlaylistId++, name: "Chill Vibes", description: "Relaxing music for work", coverImage: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=300&h=300", userId: user.id, isPublic: true, createdAt: new Date() },
      { id: this.currentPlaylistId++, name: "Workout Mix", description: "High energy songs", coverImage: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300", userId: user.id, isPublic: false, createdAt: new Date() },
    ];

    samplePlaylists.forEach(playlist => this.playlists.set(playlist.id, playlist));

    // Add songs to playlists
    const playlistSongMappings = [
      { playlistId: 1, songId: 1, position: 0 },
      { playlistId: 1, songId: 2, position: 1 },
      { playlistId: 2, songId: 3, position: 0 },
      { playlistId: 2, songId: 4, position: 1 },
      { playlistId: 3, songId: 5, position: 0 },
    ];

    playlistSongMappings.forEach(mapping => {
      const playlistSong: PlaylistSong = {
        id: this.currentPlaylistSongId++,
        ...mapping,
        addedAt: new Date()
      };
      this.playlistSongs.set(playlistSong.id, playlistSong);
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = { ...insertUser, id: this.currentUserId++ };
    this.users.set(user.id, user);
    return user;
  }

  async getPlaylists(userId: number): Promise<Playlist[]> {
    return Array.from(this.playlists.values()).filter(playlist => playlist.userId === userId);
  }

  async getPlaylist(id: number): Promise<Playlist | undefined> {
    return this.playlists.get(id);
  }

  async getPlaylistWithSongs(id: number): Promise<PlaylistWithSongs | undefined> {
    const playlist = this.playlists.get(id);
    if (!playlist) return undefined;

    const playlistSongs = await this.getPlaylistSongs(id);
    const totalDuration = playlistSongs.reduce((total, ps) => total + ps.song.duration, 0);

    return {
      ...playlist,
      songs: playlistSongs,
      songCount: playlistSongs.length,
      totalDuration
    };
  }

  async createPlaylist(playlist: InsertPlaylist & { userId: number }): Promise<Playlist> {
    const newPlaylist: Playlist = {
      id: this.currentPlaylistId++,
      name: playlist.name,
      description: playlist.description || null,
      coverImage: playlist.coverImage || null,
      userId: playlist.userId,
      isPublic: playlist.isPublic || null,
      createdAt: new Date(),
      spotifyId: playlist.spotifyId || null,
      isSpotifyLinked: playlist.isSpotifyLinked || null
    };
    this.playlists.set(newPlaylist.id, newPlaylist);
    return newPlaylist;
  }

  async updatePlaylist(id: number, playlist: Partial<InsertPlaylist>): Promise<Playlist | undefined> {
    const existing = this.playlists.get(id);
    if (!existing) return undefined;

    const updated: Playlist = { ...existing, ...playlist };
    this.playlists.set(id, updated);
    return updated;
  }

  async deletePlaylist(id: number): Promise<boolean> {
    const deleted = this.playlists.delete(id);
    if (deleted) {
      // Remove all songs from this playlist
      Array.from(this.playlistSongs.values())
        .filter(ps => ps.playlistId === id)
        .forEach(ps => this.playlistSongs.delete(ps.id));
    }
    return deleted;
  }

  async getSongs(): Promise<Song[]> {
    return Array.from(this.songs.values());
  }

  async getSong(id: number): Promise<Song | undefined> {
    return this.songs.get(id);
  }

  async getSongBySpotifyId(spotifyId: string): Promise<Song | undefined> {
    return Array.from(this.songs.values()).find(song => song.spotifyId === spotifyId);
  }

  async createSong(song: InsertSong): Promise<Song> {
    const newSong: Song = {
      id: this.currentSongId++,
      title: song.title,
      artist: song.artist,
      album: song.album || null,
      duration: song.duration,
      coverImage: song.coverImage || null,
      audioUrl: song.audioUrl || null,
      spotifyId: song.spotifyId || null,
      previewUrl: song.previewUrl || null
    };
    this.songs.set(newSong.id, newSong);
    return newSong;
  }

  async searchSongs(query: string): Promise<Song[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.songs.values()).filter(song =>
      song.title.toLowerCase().includes(lowerQuery) ||
      song.artist.toLowerCase().includes(lowerQuery) ||
      song.album?.toLowerCase().includes(lowerQuery)
    );
  }

  async addSongToPlaylist(playlistSong: InsertPlaylistSong): Promise<PlaylistSong> {
    const newPlaylistSong: PlaylistSong = {
      ...playlistSong,
      id: this.currentPlaylistSongId++,
      addedAt: new Date()
    };
    this.playlistSongs.set(newPlaylistSong.id, newPlaylistSong);
    return newPlaylistSong;
  }

  async removeSongFromPlaylist(playlistId: number, songId: number): Promise<boolean> {
    const playlistSong = Array.from(this.playlistSongs.values())
      .find(ps => ps.playlistId === playlistId && ps.songId === songId);
    
    if (playlistSong) {
      return this.playlistSongs.delete(playlistSong.id);
    }
    return false;
  }

  async getPlaylistSongs(playlistId: number): Promise<(PlaylistSong & { song: Song })[]> {
    return Array.from(this.playlistSongs.values())
      .filter(ps => ps.playlistId === playlistId)
      .map(ps => ({
        ...ps,
        song: this.songs.get(ps.songId)!
      }))
      .sort((a, b) => a.position - b.position);
  }

  async getArtists(): Promise<Artist[]> {
    return Array.from(this.artists.values());
  }

  async getArtist(id: number): Promise<Artist | undefined> {
    return this.artists.get(id);
  }

  async createArtist(artist: InsertArtist): Promise<Artist> {
    const newArtist: Artist = {
      id: this.currentArtistId++,
      name: artist.name,
      image: artist.image || null,
      bio: artist.bio || null
    };
    this.artists.set(newArtist.id, newArtist);
    return newArtist;
  }

}

export const storage = new MemStorage();
