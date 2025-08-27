import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPlaylistSchema, insertSongSchema, insertPlaylistSongSchema } from "@shared/schema";
import { z } from "zod";
import { spotifyService } from "./spotify";

export async function registerRoutes(app: Express): Promise<Server> {
  // Default user ID for demo purposes
  const defaultUserId = 1;

  // Playlists routes
  app.get("/api/playlists", async (req, res) => {
    try {
      const playlists = await storage.getPlaylists(defaultUserId);
      res.json(playlists);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch playlists" });
    }
  });

  app.get("/api/playlists/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const playlist = await storage.getPlaylistWithSongs(id);
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      res.json(playlist);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch playlist" });
    }
  });

  app.post("/api/playlists", async (req, res) => {
    try {
      // Extract criteria and access token before validation
      const { criteria, accessToken, ...playlistData } = req.body;
      const validatedData = insertPlaylistSchema.parse(playlistData);
      
      // Create the playlist first
      const playlist = await storage.createPlaylist({
        ...validatedData,
        userId: defaultUserId
      });
      
      // If criteria provided, generate songs from user's library
      if (criteria && accessToken) {
        try {
          await generateAutoPlaylist(playlist.id, criteria, accessToken);
        } catch (error) {
          console.error("Error generating automatic playlist:", error);
          // Don't fail the playlist creation if auto-generation fails
        }
      }
      
      res.status(201).json(playlist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid playlist data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create playlist" });
    }
  });

  // Helper function to generate automatic playlist using Spotify data
  async function generateAutoPlaylist(playlistId: number, criteria: any, accessToken: string) {
    try {
      // Get user's library
      const libraryResponse = await fetch(`http://localhost:5000/api/spotify/user-library`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (!libraryResponse.ok) throw new Error('Failed to fetch user library');
      
      const libraryData = await libraryResponse.json();
      const userTracks = libraryData.tracks;
      
      // Get audio features for tracks (in batches)
      const eligibleTracks = [];
      const trackIds = userTracks.map((track: any) => track.id).slice(0, 100); // Limit to first 100 tracks
      
      if (trackIds.length > 0) {
        const audioFeaturesResponse = await fetch(`https://api.spotify.com/v1/audio-features?ids=${trackIds.join(',')}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (audioFeaturesResponse.ok) {
          const audioFeatures = await audioFeaturesResponse.json();
          
          // Filter tracks based on criteria
          for (let i = 0; i < userTracks.length && i < audioFeatures.audio_features.length; i++) {
            const track = userTracks[i];
            const features = audioFeatures.audio_features[i];
            
            if (!features) continue;
            
            let matches = true;
            const { enabledCriteria } = criteria;
            
            // Check each enabled criterion
            if (enabledCriteria?.bpm && features.tempo && (features.tempo < criteria.bpm[0] || features.tempo > criteria.bpm[1])) {
              matches = false;
            }
            
            if (enabledCriteria?.energy && (features.energy < criteria.energy[0] || features.energy > criteria.energy[1])) {
              matches = false;
            }
            
            if (enabledCriteria?.danceability && (features.danceability < criteria.danceability[0] || features.danceability > criteria.danceability[1])) {
              matches = false;
            }
            
            if (enabledCriteria?.loudness && (features.loudness < criteria.loudness[0] || features.loudness > criteria.loudness[1])) {
              matches = false;
            }
            
            if (enabledCriteria?.valence && (features.valence < criteria.valence[0] || features.valence > criteria.valence[1])) {
              matches = false;
            }
            
            if (enabledCriteria?.length && track.duration_ms) {
              const durationSeconds = track.duration_ms / 1000;
              if (durationSeconds < criteria.length[0] || durationSeconds > criteria.length[1]) {
                matches = false;
              }
            }
            
            if (enabledCriteria?.acousticness && (features.acousticness < criteria.acousticness[0] || features.acousticness > criteria.acousticness[1])) {
              matches = false;
            }
            
            if (enabledCriteria?.popularity && track.popularity && (track.popularity < criteria.popularity[0] || track.popularity > criteria.popularity[1])) {
              matches = false;
            }
            
            if (matches) {
              eligibleTracks.push(track);
            }
          }
        }
      }
      
      // Shuffle and limit tracks
      const shuffledTracks = eligibleTracks.sort(() => Math.random() - 0.5);
      let selectedTracks = shuffledTracks.slice(0, Math.min(25, shuffledTracks.length));
      
      // Apply artist separation if enabled
      if (criteria.artistSeparation) {
        const seenArtists = new Set<string>();
        selectedTracks = selectedTracks.filter(track => {
          const artistName = track.artists[0]?.name;
          if (seenArtists.has(artistName)) {
            return false;
          }
          seenArtists.add(artistName);
          return true;
        });
      }
      
      // Add selected tracks to the playlist
      for (let i = 0; i < selectedTracks.length; i++) {
        const track = selectedTracks[i];
        
        // First, ensure the song exists in our database
        let song = await storage.getSongBySpotifyId(track.id);
        if (!song) {
          // Create the song if it doesn't exist
          song = await storage.createSong({
            title: track.name,
            artist: track.artists.map((a: any) => a.name).join(', '),
            album: track.album?.name || '',
            duration: Math.round(track.duration_ms / 1000),
            coverImage: track.album?.images?.[0]?.url || null,
            audioUrl: null,
            spotifyId: track.id,
            previewUrl: track.preview_url
          });
        }
        
        // Add song to playlist
        await storage.addSongToPlaylist({
          playlistId,
          songId: song.id,
          position: i
        });
      }
      
      console.log(`Generated playlist with ${selectedTracks.length} tracks from ${userTracks.length} available tracks`);
    } catch (error) {
      console.error('Error in generateAutoPlaylist:', error);
      throw error;
    }
  }

  app.patch("/api/playlists/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPlaylistSchema.partial().parse(req.body);
      const playlist = await storage.updatePlaylist(id, validatedData);
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      res.json(playlist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid playlist data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update playlist" });
    }
  });

  app.delete("/api/playlists/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePlaylist(id);
      if (!deleted) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete playlist" });
    }
  });

  // Songs routes
  app.get("/api/songs", async (req, res) => {
    try {
      const songs = await storage.getSongs();
      res.json(songs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch songs" });
    }
  });

  app.get("/api/songs/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      const songs = await storage.searchSongs(query);
      res.json(songs);
    } catch (error) {
      res.status(500).json({ message: "Failed to search songs" });
    }
  });

  app.post("/api/songs", async (req, res) => {
    try {
      const validatedData = insertSongSchema.parse(req.body);
      const song = await storage.createSong(validatedData);
      res.status(201).json(song);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid song data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create song" });
    }
  });

  // Playlist songs routes
  app.get("/api/playlists/:id/songs", async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id);
      const songs = await storage.getPlaylistSongs(playlistId);
      res.json(songs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch playlist songs" });
    }
  });

  app.post("/api/playlists/:id/songs", async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id);
      const validatedData = insertPlaylistSongSchema.parse({
        ...req.body,
        playlistId
      });
      const playlistSong = await storage.addSongToPlaylist(validatedData);
      res.status(201).json(playlistSong);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid playlist song data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add song to playlist" });
    }
  });

  app.delete("/api/playlists/:playlistId/songs/:songId", async (req, res) => {
    try {
      const playlistId = parseInt(req.params.playlistId);
      const songId = parseInt(req.params.songId);
      const deleted = await storage.removeSongFromPlaylist(playlistId, songId);
      if (!deleted) {
        return res.status(404).json({ message: "Song not found in playlist" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove song from playlist" });
    }
  });

  // Artists routes
  app.get("/api/artists", async (req, res) => {
    try {
      const artists = await storage.getArtists();
      res.json(artists);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch artists" });
    }
  });

  // Spotify Authentication Routes
  app.get("/auth/spotify", (req, res) => {
    const authUrl = spotifyService.getAuthUrl();
    res.redirect(authUrl);
  });

  app.get("/auth/spotify/redirect-uri", (req, res) => {
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/auth/spotify/callback`;
    res.json({ redirectUri });
  });

  app.get("/auth/spotify/callback", async (req, res) => {
    try {
      const code = req.query.code as string;
      const error = req.query.error as string;
      const state = req.query.state as string;
      
      if (error) {
        return res.send(`
          <html>
            <body>
              <script>
                window.opener?.postMessage({ type: 'SPOTIFY_AUTH_ERROR', error: '${error}' }, '*');
                window.close();
              </script>
              <p>Authentication failed. This window should close automatically.</p>
            </body>
          </html>
        `);
      }
      
      if (!code) {
        return res.send(`
          <html>
            <body>
              <script>
                window.opener?.postMessage({ type: 'SPOTIFY_AUTH_ERROR', error: 'no_code' }, '*');
                window.close();
              </script>
              <p>No authorization code received. This window should close automatically.</p>
            </body>
          </html>
        `);
      }

      const tokenData = await spotifyService.getAccessToken(code);
      const userProfile = await spotifyService.getUserProfile(tokenData.access_token);

      // Send success message to parent window and close popup
      res.send(`
        <html>
          <body>
            <script>
              localStorage.setItem('spotify_access_token', '${tokenData.access_token}');
              localStorage.setItem('spotify_user_name', '${userProfile.display_name}');
              localStorage.setItem('spotify_token_timestamp', '${Date.now()}');
              ${tokenData.refresh_token ? `localStorage.setItem('spotify_refresh_token', '${tokenData.refresh_token}');` : ''}
              window.opener?.postMessage({ 
                type: 'SPOTIFY_AUTH_SUCCESS', 
                token: '${tokenData.access_token}',
                user: '${userProfile.display_name}',
                refreshToken: '${tokenData.refresh_token || ''}'
              }, '*');
              window.close();
            </script>
            <p>Authentication successful! This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Spotify auth error:", error);
      res.send(`
        <html>
          <body>
            <script>
              window.opener?.postMessage({ type: 'SPOTIFY_AUTH_ERROR', error: 'auth_failed' }, '*');
              window.close();
            </script>
            <p>Authentication failed. This window should close automatically.</p>
          </body>
        </html>
      `);
    }
  });

  // Spotify Sync Routes
  app.get("/api/spotify/playlists", async (req, res) => {
    try {
      const accessToken = req.headers.authorization?.replace('Bearer ', '');
      
      if (!accessToken) {
        return res.status(401).json({ message: "No access token provided" });
      }

      const spotifyPlaylists = await spotifyService.getUserPlaylists(accessToken);
      res.json(spotifyPlaylists);
    } catch (error) {
      console.error("Error fetching Spotify playlists:", error);
      res.status(500).json({ message: "Failed to fetch Spotify playlists" });
    }
  });

  // Get specific Spotify playlist details with tracks
  app.get("/api/spotify/playlists/:id", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ message: "No access token provided" });
      }

      const accessToken = authHeader.replace("Bearer ", "");
      const playlistId = req.params.id;
      const playlist = await spotifyService.getPlaylistDetails(accessToken, playlistId);
      res.json(playlist);
    } catch (error) {
      console.error("Failed to fetch Spotify playlist details:", error);
      res.status(500).json({ message: "Failed to fetch playlist details" });
    }
  });

  // Get user's followed artists for events
  app.get("/api/spotify/followed-artists", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ message: "No access token provided" });
      }

      const accessToken = authHeader.replace("Bearer ", "");
      const artists = await spotifyService.getFollowedArtists(accessToken);
      res.json(artists);
    } catch (error) {
      console.error("Failed to fetch followed artists:", error);
      res.status(500).json({ message: "Failed to fetch followed artists" });
    }
  });

  // Get user's country for region filtering
  app.get("/api/spotify/user-country", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ message: "No access token provided" });
      }

      const accessToken = authHeader.replace("Bearer ", "");
      const country = await spotifyService.getUserCountry(accessToken);
      res.json({ country });
    } catch (error) {
      console.error("Failed to fetch user country:", error);
      res.status(500).json({ message: "Failed to fetch user country" });
    }
  });

  // Get recommended artists
  app.get("/api/spotify/recommended-artists", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ message: "No access token provided" });
      }

      const accessToken = authHeader.replace("Bearer ", "");
      const artists = await spotifyService.getRecommendedArtists(accessToken);
      res.json(artists);
    } catch (error) {
      console.error("Failed to fetch recommended artists:", error);
      res.status(500).json({ message: "Failed to fetch recommended artists" });
    }
  });

  // Get user's liked songs from Spotify
  app.get("/api/spotify/liked-songs", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ message: "No access token provided" });
      }

      const accessToken = authHeader.replace("Bearer ", "");
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const likedSongs = await spotifyService.getLikedSongs(accessToken, limit, offset);
      res.json(likedSongs);
    } catch (error) {
      console.error("Failed to fetch liked songs:", error);
      res.status(500).json({ message: "Failed to fetch liked songs" });
    }
  });

  app.post("/api/spotify/sync-playlist/:spotifyId", async (req, res) => {
    try {
      const accessToken = req.headers.authorization?.replace('Bearer ', '');
      const spotifyPlaylistId = req.params.spotifyId;
      
      if (!accessToken) {
        return res.status(401).json({ message: "No access token provided" });
      }

      // Get playlist from Spotify
      const spotifyPlaylists = await spotifyService.getUserPlaylists(accessToken);
      const spotifyPlaylist = spotifyPlaylists.find(p => p.id === spotifyPlaylistId);
      
      if (!spotifyPlaylist) {
        return res.status(404).json({ message: "Spotify playlist not found" });
      }

      // Convert and create local playlist
      const playlistData = spotifyService.convertSpotifyPlaylistToPlaylist(spotifyPlaylist, defaultUserId);
      const localPlaylist = await storage.createPlaylist(playlistData);

      // Get and sync tracks
      const spotifyTracks = await spotifyService.getPlaylistTracks(accessToken, spotifyPlaylistId);
      
      for (let i = 0; i < spotifyTracks.length; i++) {
        const track = spotifyTracks[i];
        const songData = spotifyService.convertSpotifyTrackToSong(track);
        
        // Create song if it doesn't exist
        let song = await storage.getSongBySpotifyId(track.id);
        if (!song) {
          song = await storage.createSong(songData);
        }

        // Add to playlist
        await storage.addSongToPlaylist({
          playlistId: localPlaylist.id,
          songId: song.id,
          position: i + 1
        });
      }

      const fullPlaylist = await storage.getPlaylistWithSongs(localPlaylist.id);
      res.json(fullPlaylist);
    } catch (error) {
      console.error("Error syncing playlist:", error);
      res.status(500).json({ message: "Failed to sync playlist" });
    }
  });

  app.get("/api/spotify/search", async (req, res) => {
    try {
      const accessToken = req.headers.authorization?.replace('Bearer ', '');
      const query = req.query.q as string;
      
      if (!accessToken) {
        return res.status(401).json({ message: "No access token provided" });
      }

      if (!query) {
        return res.status(400).json({ message: "Search query required" });
      }

      const spotifyTracks = await spotifyService.searchTracks(accessToken, query);
      const songs = spotifyTracks.map(track => spotifyService.convertSpotifyTrackToSong(track));
      
      res.json(songs);
    } catch (error) {
      console.error("Error searching Spotify:", error);
      res.status(500).json({ message: "Failed to search Spotify" });
    }
  });

  // Get user's complete song library for playlist generation
  app.get("/api/spotify/user-library", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ message: "No access token provided" });
      }

      const accessToken = authHeader.replace("Bearer ", "");
      
      // Get user's playlists
      const userPlaylists = await spotifyService.getUserPlaylists(accessToken);
      
      // Get user's liked songs (first 50)
      const likedSongs = await spotifyService.getLikedSongs(accessToken, 50, 0);
      
      // Combine all tracks from playlists and liked songs
      const allTracks = [];
      
      // Add liked songs
      for (const item of likedSongs.items) {
        if (item.track) {
          allTracks.push({
            ...item.track,
            source: 'liked',
            added_at: item.added_at
          });
        }
      }
      
      // Add songs from user's playlists (sample from each playlist to avoid too much data)
      for (const playlist of userPlaylists.slice(0, 10)) { // Limit to first 10 playlists
        try {
          const playlistTracks = await spotifyService.getPlaylistTracks(accessToken, playlist.id, 20); // Limit to 20 songs per playlist
          for (const item of playlistTracks.items) {
            if (item.track && !allTracks.some(t => t.id === item.track.id)) {
              allTracks.push({
                ...item.track,
                source: playlist.name,
                added_at: item.added_at
              });
            }
          }
        } catch (error) {
          console.log(`Skipping playlist ${playlist.name} due to error:`, error);
        }
      }
      
      res.json({
        tracks: allTracks,
        total: allTracks.length,
        sources: {
          liked_songs: likedSongs.items.length,
          playlists: userPlaylists.length
        }
      });
    } catch (error) {
      console.error("Failed to fetch user library:", error);
      res.status(500).json({ message: "Failed to fetch user library" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
