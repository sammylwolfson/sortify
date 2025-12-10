import os
import time
import tkinter as tk
from tkinter import ttk, messagebox
from dotenv import load_dotenv
import spotipy
from spotipy.oauth2 import SpotifyOAuth

# --- Spotify Auth ---
def create_spotify_client():
    # Try loading .env from multiple locations
    env_paths = [
        ".env",  # Current directory
        os.path.expanduser("~/.sortify.env"),  # Home directory
        os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"),  # Script directory
    ]
    
    loaded = False
    for env_path in env_paths:
        if os.path.exists(env_path):
            load_dotenv(env_path)
            loaded = True
            break
    
    if not loaded:
        load_dotenv()  # Fallback to default behavior
    
    client_id = os.getenv("SPOTIPY_CLIENT_ID")
    client_secret = os.getenv("SPOTIPY_CLIENT_SECRET")
    redirect_uri = os.getenv("SPOTIPY_REDIRECT_URI")
    scope = (
        "user-library-read "
        "playlist-read-private "
        "playlist-modify-private "
        "playlist-modify-public"
    )
    auth_manager = SpotifyOAuth(
        client_id=client_id,
        client_secret=client_secret,
        redirect_uri=redirect_uri,
        scope=scope,
        open_browser=True,
        cache_path=".cache-sortify-gui",
    )
    return spotipy.Spotify(auth_manager=auth_manager)

# --- Main App ---
class SortifyApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Sortify Playlist Organizer")
        self.geometry("700x500")
        self.sp = None
        self.playlists = {}
        self.liked_tracks = []
        self.genre_to_tracks = {}
        self.genre_playlist_map = {}
        self.create_widgets()

    def create_widgets(self):
        self.login_btn = ttk.Button(self, text="Login to Spotify", command=self.login)
        self.login_btn.pack(pady=10)
        self.status_lbl = ttk.Label(self, text="Not logged in.")
        self.status_lbl.pack(pady=5)

        # Add refresh liked songs button
        self.refresh_btn = ttk.Button(self, text="Refresh Liked Songs", command=self.refresh_liked_songs, state="disabled")
        self.refresh_btn.pack(pady=5)

        # Genre grouping section
        self.liked_count_lbl = ttk.Label(self, text="Total liked songs: 0")
        self.liked_count_lbl.pack(pady=2)
        self.genre_frames = {}  # genre: frame
        self.genre_playlist_selectors = {}  # genre: combobox
        self.genre_sync_buttons = {}  # genre: button

    def login(self):
        try:
            self.sp = create_spotify_client()
            user = self.sp.current_user()
            self.status_lbl.config(text=f"Logged in as: {user['display_name']}")
            self.fetch_playlists()
            self.fetch_liked_tracks()
            # Removed group_tracks_by_genre and populate_tree; only showing liked songs
            # self.sync_btn removed; syncing is now per-genre
            self.refresh_btn.config(state="normal")
            self.display_liked_songs()
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def refresh_liked_songs(self):
        self.fetch_liked_tracks()
        self.display_liked_songs()

    def display_liked_songs(self):
        # Remove old genre frames
        for frame in getattr(self, 'genre_frames', {}).values():
            frame.destroy()
        self.genre_frames = {}
        self.genre_playlist_selectors = {}
        self.genre_sync_buttons = {}

        total = len(self.liked_tracks)
        self.liked_count_lbl.config(text=f"Total liked songs: {total}")
        if not self.liked_tracks:
            return
        # Collect all unique artist IDs
        artist_ids = set()
        for item in self.liked_tracks:
            track = item.get("track")
            if track:
                for artist in track.get("artists", []):
                    if artist.get("id"):
                        artist_ids.add(artist["id"])
        # Fetch genres for all artists
        artist_genres_map = {}
        if self.sp and artist_ids:
            ids_list = list(artist_ids)
            for i in range(0, len(ids_list), 50):
                batch = ids_list[i:i+50]
                try:
                    results = self.sp.artists(batch)
                    for artist in results.get("artists", []):
                        artist_genres_map[artist["id"]] = artist.get("genres", [])
                except Exception:
                    pass
                time.sleep(0.1)
        # Group tracks by genre
        genre_to_tracks = {}
        for item in self.liked_tracks:
            track = item.get("track")
            if not track:
                continue
            title = track.get("name", "")
            artists = ", ".join([a.get("name", "") for a in track.get("artists", [])])
            genres = set()
            for artist in track.get("artists", []):
                genres.update(artist_genres_map.get(artist.get("id"), []))
            genre_key = ", ".join(sorted(genres)) if genres else "Unknown Genre"
            genre_to_tracks.setdefault(genre_key, []).append((track.get("id"), title, artists))
        # Display each genre group
        for genre, tracks in genre_to_tracks.items():
            frame = ttk.LabelFrame(self, text=f"Genre: {genre}")
            frame.pack(expand=True, fill="both", padx=10, pady=5)
            tree = ttk.Treeview(frame, columns=("Title", "Artists"), show="headings")
            tree.heading("Title", text="Title")
            tree.heading("Artists", text="Artists")
            tree.pack(expand=True, fill="both")
            for tid, title, artists in tracks:
                tree.insert("", "end", values=(title, artists))
            # Playlist selector and sync button
            selector = ttk.Combobox(frame, values=list(self.playlists.keys()))
            selector.pack(side="left", padx=5, pady=5)
            sync_btn = ttk.Button(frame, text="Add All to Playlist", command=lambda g=genre, s=selector: self.sync_genre_to_playlist(g, s.get(), genre_to_tracks))
            sync_btn.pack(side="left", padx=5, pady=5)
            self.genre_frames[genre] = frame
            self.genre_playlist_selectors[genre] = selector
            self.genre_sync_buttons[genre] = sync_btn

    def sync_genre_to_playlist(self, genre, playlist_name, genre_to_tracks):
        playlist_id = self.playlists.get(playlist_name)
        if not playlist_id:
            messagebox.showerror("Error", "Please select a playlist.")
            return
        tracks = genre_to_tracks.get(genre, [])
        added = 0
        for tid, title, artists in tracks:
            if not tid:
                continue
            try:
                self.sp.playlist_add_items(playlist_id, [tid])
                added += 1
            except Exception as e:
                print(f"Failed to add {title}: {e}")
            time.sleep(0.05)
        messagebox.showinfo("Done", f"Added {added} songs to '{playlist_name}'")

    def fetch_playlists(self):
        self.playlists = {}
        offset = 0
        while True:
            results = self.sp.current_user_playlists(limit=50, offset=offset)
            items = results.get("items", [])
            if not items:
                break
            for pl in items:
                self.playlists[pl["name"]] = pl["id"]
            offset += len(items)
            if not results.get("next"):
                break

    def fetch_liked_tracks(self):
        self.liked_tracks = []
        offset = 0
        while True:
            results = self.sp.current_user_saved_tracks(limit=50, offset=offset)
            items = results.get("items", [])
            if not items:
                break
            self.liked_tracks.extend(items)
            offset += len(items)
            if not results.get("next"):
                break

    # Removed group_tracks_by_genre, populate_tree, and set_genre_playlist methods

    def sync(self):
        added = 0
        for genre, tracks in self.genre_to_tracks.items():
            playlist_id = self.genre_playlist_map.get(genre)
            if not playlist_id:
                continue
            for tid, tname in tracks:
                try:
                    self.sp.playlist_add_items(playlist_id, [tid])
                    added += 1
                except Exception as e:
                    print(f"Failed to add {tname}: {e}")
                time.sleep(0.05)
        messagebox.showinfo("Done", f"Tracks added: {added}")

if __name__ == "__main__":
    app = SortifyApp()
    app.mainloop()
