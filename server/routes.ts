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
      const validatedData = insertPlaylistSchema.parse(req.body);
      const playlist = await storage.createPlaylist({
        ...validatedData,
        userId: defaultUserId
      });
      res.status(201).json(playlist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid playlist data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create playlist" });
    }
  });

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

  const httpServer = createServer(app);
  return httpServer;
}
