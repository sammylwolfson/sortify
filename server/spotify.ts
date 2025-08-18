interface SpotifyConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface SpotifyTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: Array<{ url: string }>;
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: Array<{ url: string }>;
  tracks: {
    total: number;
  };
  public: boolean;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  duration_ms: number;
  preview_url: string | null;
}

interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[];
  };
}

export class SpotifyService {
  private config: SpotifyConfig;

  constructor() {
    this.config = {
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:5000/auth/spotify/callback'
    };
  }

  // Generate Spotify authorization URL
  getAuthUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      scope: 'user-read-private user-read-email playlist-read-private playlist-modify-public playlist-modify-private',
      redirect_uri: this.config.redirectUri,
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  // Exchange authorization code for access token
  async getAccessToken(code: string): Promise<SpotifyTokenResponse> {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get access token');
    }

    return await response.json();
  }

  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<SpotifyTokenResponse> {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh access token');
    }

    return await response.json();
  }

  // Get user profile
  async getUserProfile(accessToken: string): Promise<SpotifyUser> {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get user profile');
    }

    return await response.json();
  }

  // Get user's playlists
  async getUserPlaylists(accessToken: string): Promise<SpotifyPlaylist[]> {
    const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get user playlists');
    }

    const data = await response.json();
    return data.items;
  }

  // Get playlist tracks
  async getPlaylistTracks(accessToken: string, playlistId: string): Promise<SpotifyTrack[]> {
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get playlist tracks');
    }

    const data = await response.json();
    return data.items.map((item: any) => item.track);
  }

  // Search for tracks
  async searchTracks(accessToken: string, query: string): Promise<SpotifyTrack[]> {
    const params = new URLSearchParams({
      q: query,
      type: 'track',
      limit: '20'
    });

    const response = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to search tracks');
    }

    const data: SpotifySearchResponse = await response.json();
    return data.tracks.items;
  }

  // Create a playlist
  async createPlaylist(accessToken: string, userId: string, name: string, description?: string): Promise<SpotifyPlaylist> {
    const response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        description,
        public: false
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create playlist');
    }

    return await response.json();
  }

  // Add tracks to playlist
  async addTracksToPlaylist(accessToken: string, playlistId: string, trackIds: string[]): Promise<void> {
    const uris = trackIds.map(id => `spotify:track:${id}`);

    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uris
      })
    });

    if (!response.ok) {
      throw new Error('Failed to add tracks to playlist');
    }
  }

  // Remove tracks from playlist
  async removeTracksFromPlaylist(accessToken: string, playlistId: string, trackIds: string[]): Promise<void> {
    const tracks = trackIds.map(id => ({ uri: `spotify:track:${id}` }));

    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tracks
      })
    });

    if (!response.ok) {
      throw new Error('Failed to remove tracks from playlist');
    }
  }

  // Convert Spotify track to our song format
  convertSpotifyTrackToSong(spotifyTrack: SpotifyTrack) {
    return {
      title: spotifyTrack.name,
      artist: spotifyTrack.artists.map(a => a.name).join(', '),
      album: spotifyTrack.album.name,
      duration: Math.floor(spotifyTrack.duration_ms / 1000),
      coverImage: spotifyTrack.album.images[0]?.url || null,
      spotifyId: spotifyTrack.id,
      previewUrl: spotifyTrack.preview_url,
      audioUrl: spotifyTrack.preview_url
    };
  }

  // Convert Spotify playlist to our playlist format
  convertSpotifyPlaylistToPlaylist(spotifyPlaylist: SpotifyPlaylist, userId: number) {
    return {
      name: spotifyPlaylist.name,
      description: spotifyPlaylist.description || null,
      coverImage: spotifyPlaylist.images[0]?.url || null,
      userId,
      isPublic: spotifyPlaylist.public,
      spotifyId: spotifyPlaylist.id,
      isSpotifyLinked: true
    };
  }
}

export const spotifyService = new SpotifyService();