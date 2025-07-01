import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const playlists = pgTable("playlists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  coverImage: text("cover_image"),
  userId: integer("user_id").notNull(),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const songs = pgTable("songs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  album: text("album"),
  duration: integer("duration").notNull(), // duration in seconds
  coverImage: text("cover_image"),
  audioUrl: text("audio_url"),
});

export const playlistSongs = pgTable("playlist_songs", {
  id: serial("id").primaryKey(),
  playlistId: integer("playlist_id").notNull(),
  songId: integer("song_id").notNull(),
  position: integer("position").notNull(),
  addedAt: timestamp("added_at").defaultNow(),
});

export const artists = pgTable("artists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  image: text("image"),
  bio: text("bio"),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertPlaylistSchema = createInsertSchema(playlists).omit({
  id: true,
  createdAt: true,
  userId: true,
});

export const insertSongSchema = createInsertSchema(songs).omit({
  id: true,
});

export const insertPlaylistSongSchema = createInsertSchema(playlistSongs).omit({
  id: true,
  addedAt: true,
});

export const insertArtistSchema = createInsertSchema(artists).omit({
  id: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type InsertSong = z.infer<typeof insertSongSchema>;
export type InsertPlaylistSong = z.infer<typeof insertPlaylistSongSchema>;
export type InsertArtist = z.infer<typeof insertArtistSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Playlist = typeof playlists.$inferSelect;
export type Song = typeof songs.$inferSelect;
export type PlaylistSong = typeof playlistSongs.$inferSelect;
export type Artist = typeof artists.$inferSelect;
export type User = typeof users.$inferSelect;

export type PlaylistWithSongs = Playlist & {
  songs: (PlaylistSong & { song: Song })[];
  songCount: number;
  totalDuration: number;
};
