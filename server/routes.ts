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

  app.get("/auth/spotify/callback", async (req, res) => {
    try {
      const code = req.query.code as string;
      
      if (!code) {
        return res.status(400).json({ message: "No authorization code provided" });
      }

      const tokenData = await spotifyService.getAccessToken(code);
      const userProfile = await spotifyService.getUserProfile(tokenData.access_token);

      // In a real app, you'd save this to the user's record
      // For now, we'll return the tokens for the frontend to handle
      res.json({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        spotify_user_id: userProfile.id,
        user_profile: userProfile
      });
    } catch (error) {
      console.error("Spotify auth error:", error);
      res.status(500).json({ message: "Failed to authenticate with Spotify" });
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
