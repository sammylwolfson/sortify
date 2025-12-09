import os
import time
from typing import Dict, List, Set

from dotenv import load_dotenv
import spotipy
from spotipy.oauth2 import SpotifyOAuth

# =========================================
# CONFIG – YOUR 11 PLAYLIST BUCKETS
# =========================================

TARGET_PLAYLIST_NAMES = [
    "Electronic",
    "Dance / EDM",
    "House / Disco / Funk",
    "Hip Hop / Rap",
    "Trap / Bass",
    "Pop",
    "Alternative / Indie",
    "R&B / Soul / Blues / Jazz",
    "Chill / Downtempo",
    "Latin / Urbano",
    "Rock",
]

# Genre keyword mapping per bucket – tweak as needed
BUCKET_KEYWORDS: Dict[str, List[str]] = {
    "Electronic": [
        "idm",
        "electroclash",
        "glitch",
        "experimental electronic",
        "electronica",
        "minimal techno",
        "techno",
        "synthwave",
        "ambient",
        "microhouse",
    ],
    "Dance / EDM": [
        "edm",
        "progressive house",
        "big room",
        "festival",
        "electro house",
        "future house",
        "bass house",
        "melbourne bounce",
    ],
    "House / Disco / Funk": [
        "house",
        "disco",
        "nu disco",
        "french house",
        "funk",
        "funky house",
        "electro swing",
        "boogie",
    ],
    "Hip Hop / Rap": [
        "hip hop",
        "rap",
        "boom bap",
        "drill",
        "gangsta",
        "west coast rap",
        "west coast hip hop",
        "southern hip hop",
        "east coast hip hop",
    ],
    "Trap / Bass": [
        "dubstep",
        "future bass",
        "brostep",
        "trap edm",
        "bass trap",
        "bass music",
        "moombahton",
        "riddim",
        "new rave",
    ],
    "Pop": [
        "dance pop",
        "electropop",
        "synthpop",
        "k-pop",
        "k pop",
        "j-pop",
        "j pop",
        "pop",
    ],
    "Alternative / Indie": [
        "indie",
        "indie rock",
        "indie folk",
        "indie pop",
        "alternative",
        "alternative rock",
        "garage rock",
        "garage rock revival",
        "modern rock",
        "emo",
    ],
    "R&B / Soul / Blues / Jazz": [
        "r&b",
        "rnb",
        "soul",
        "neo soul",
        "funk soul",
        "blues",
        "jazz",
        "smooth jazz",
        "soul jazz",
        "gospel",
    ],
    "Chill / Downtempo": [
        "chillwave",
        "chillhop",
        "chillstep",
        "trip hop",
        "downtempo",
        "lo-fi",
        "lofi",
        "study beats",
    ],
    "Latin / Urbano": [
        "reggaeton",
        "reggaet\u00f3n",
        "trap latino",
        "urbano latino",
        "latin pop",
        "latin hip hop",
        "latin",
        "banda",
        "bachata",
        "salsa",
        "cumbia",
    ],
    "Rock": [
        "rock",
        "classic rock",
        "hard rock",
        "soft rock",
        "pop rock",
        "punk",
        "punk rock",
        "metal",
        "alt rock",
    ],
}

# Priority if multiple buckets could match – first match wins
PRIORITY_ORDER = [
    "Latin / Urbano",
    "House / Disco / Funk",
    "Dance / EDM",
    "Trap / Bass",
    "Hip Hop / Rap",
    "Chill / Downtempo",
    "Electronic",
    "R&B / Soul / Blues / Jazz",
    "Alternative / Indie",
    "Pop",
    "Rock",
]

# Fallback if NOTHING matches
FALLBACK_BUCKET = "Alternative / Indie"

# =========================================
# AUTH / CLIENT
# =========================================

def create_spotify_client() -> spotipy.Spotify:
    load_dotenv()
    client_id = os.getenv("SPOTIPY_CLIENT_ID")
    client_secret = os.getenv("SPOTIPY_CLIENT_SECRET")
    redirect_uri = os.getenv("SPOTIPY_REDIRECT_URI")

    if not client_id or not client_secret or not redirect_uri:
        raise RuntimeError("Missing SPOTIPY_* env vars. Check your .env file.")

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
        cache_path=".cache-sortify",
    )

    return spotipy.Spotify(auth_manager=auth_manager)


def get_user_id(sp: spotipy.Spotify) -> str:
    me = sp.current_user()
    return me["id"]


def get_or_verify_target_playlists(
    sp: spotipy.Spotify, user_id: str
) -> Dict[str, str]:
    """
    Return {playlist_name: playlist_id} for the 11 target playlists.
    Fail hard if any playlist is missing.
    """
    playlists: Dict[str, str] = {}
    offset = 0

    print("Looking for your 11 target playlists...")

    while True:
        results = sp.current_user_playlists(limit=50, offset=offset)
        items = results.get("items", [])
        if not items:
            break

        for pl in items:
            name = pl["name"]
            pid = pl["id"]
            if name in TARGET_PLAYLIST_NAMES and name not in playlists:
                playlists[name] = pid
                print(f"  Found: {name} -> {pid}")

        offset += len(items)
        if not results.get("next"):
            break

    missing = [name for name in TARGET_PLAYLIST_NAMES if name not in playlists]
    if missing:
        raise RuntimeError(
            f"Missing playlists: {missing}\n"
            "Create these in Spotify with EXACT names, then re-run."
        )

    return playlists


def fetch_all_liked_tracks(sp: spotipy.Spotify):
    """
    Fetch all 'Liked Songs' (saved tracks).
    """
    print("Fetching all Liked Songs...")
    all_tracks = []
    offset = 0

    while True:
        results = sp.current_user_saved_tracks(limit=50, offset=offset)
        items = results.get("items", [])
        if not items:
            break

        all_tracks.extend(items)
        offset += len(items)
        print(f"  Fetched {len(all_tracks)} liked tracks so far...")

        if not results.get("next"):
            break

    print(f"Total liked tracks fetched: {len(all_tracks)}")
    return all_tracks


def build_playlist_track_sets(
    sp: spotipy.Spotify, playlist_ids: Dict[str, str]
) -> Dict[str, Set[str]]:
    """
    For each target playlist, build a set of existing track IDs.
    """
    print("Building current track sets for target playlists...")
    playlist_tracks: Dict[str, Set[str]] = {}

    for name, pid in playlist_ids.items():
        track_ids: Set[str] = set()
        offset = 0
        print(f"  Reading tracks from playlist '{name}'...")

        while True:
            results = sp.playlist_items(
                playlist_id=pid,
                offset=offset,
                limit=100,
                fields="items.track.id,total,next",
            )
            items = results.get("items", [])
            if not items:
                break

            for item in items:
                track = item.get("track")
                if track and track.get("id"):
                    track_ids.add(track["id"])

            offset += len(items)
            if not results.get("next"):
                break

        playlist_tracks[name] = track_ids
        print(f"    -> {len(track_ids)} existing tracks")

    return playlist_tracks


def determine_bucket(artist_genres: List[str]) -> str:
    """
    Given a list of Spotify genre strings, pick one bucket.
    """
    lower_genres = [g.lower() for g in artist_genres]

    for bucket in PRIORITY_ORDER:
        keywords = BUCKET_KEYWORDS[bucket]
        for g in lower_genres:
            for kw in keywords:
                if kw in g:
                    return bucket

    return FALLBACK_BUCKET


def chunked(iterable, size):
    for i in range(0, len(iterable), size):
        yield iterable[i : i + size]


def fetch_artist_genres_in_batches(
    sp: spotipy.Spotify, artist_ids: List[str]
) -> Dict[str, List[str]]:
    """
    Fetch genres for many artists via batch endpoint.
    """
    artist_genres: Dict[str, List[str]] = {}
    print("Fetching artist genres in batches...")

    for batch in chunked(artist_ids, 50):
        results = sp.artists(batch)
        for artist in results.get("artists", []):
            aid = artist["id"]
            genres = artist.get("genres", [])
            artist_genres[aid] = genres

        time.sleep(0.1)  # chill a bit between calls

    return artist_genres


# =========================================
# MAIN
# =========================================

def main():

    sp = create_spotify_client()
    user_id = get_user_id(sp)
    print(f"Authenticated as Spotify user: {user_id}")

    # Fetch all user playlists
    print("Fetching all your playlists...")
    all_playlists = {}
    offset = 0
    while True:
        results = sp.current_user_playlists(limit=50, offset=offset)
        items = results.get("items", [])
        if not items:
            break
        for pl in items:
            all_playlists[pl["name"]] = pl["id"]
        offset += len(items)
        if not results.get("next"):
            break

    print(f"Found {len(all_playlists)} playlists.")

    liked_items = fetch_all_liked_tracks(sp)

    # Map track -> artist IDs, and collect all unique artists
    all_artist_ids: Set[str] = set()
    track_to_artists: Dict[str, List[str]] = {}

    print("Collecting artist IDs from liked tracks...")
    for item in liked_items:
        track = item.get("track")
        if not track:
            continue
        track_id = track.get("id")
        if not track_id:
            continue
        artists = track.get("artists", [])
        artist_ids = [a["id"] for a in artists if a.get("id")]
        if not artist_ids:
            continue
        track_to_artists[track_id] = artist_ids
        all_artist_ids.update(artist_ids)

    print(f"Unique artists found: {len(all_artist_ids)}")

    # Fetch genres for all artists
    all_artist_ids_list = list(all_artist_ids)
    artist_genres_map = fetch_artist_genres_in_batches(sp, all_artist_ids_list)

    # Group liked songs by genre
    genre_to_tracks = {}
    for item in liked_items:
        track = item.get("track")
        if not track:
            continue
        track_id = track.get("id")
        track_name = track.get("name")
        artist_ids = track_to_artists.get(track_id, [])
        genres_collected: List[str] = []
        for aid in artist_ids:
            genres_collected.extend(artist_genres_map.get(aid, []))
        genre_key = None
        if genres_collected:
            genre_key = determine_bucket(genres_collected)
        else:
            genre_key = "Unknown Genre"
        genre_to_tracks.setdefault(genre_key, []).append((track_id, track_name))

    # Interactive: For each genre, prompt user for playlist
    print("\n=== Genre to Playlist Mapping ===")
    genre_playlist_map = {}
    for genre, tracks in genre_to_tracks.items():
        print(f"\nGenre: {genre}")
        print(f"Tracks:")
        for tid, tname in tracks:
            print(f"  - {tname}")
        print("Your playlists:")
        for idx, pname in enumerate(all_playlists.keys()):
            print(f"  [{idx+1}] {pname}")
        sel = input(f"Select playlist for genre '{genre}' (enter number, or 0 to skip): ")
        try:
            sel_idx = int(sel)
        except ValueError:
            sel_idx = 0
        if sel_idx > 0 and sel_idx <= len(all_playlists):
            chosen_playlist = list(all_playlists.keys())[sel_idx-1]
            genre_playlist_map[genre] = all_playlists[chosen_playlist]
        else:
            print(f"Skipping genre '{genre}'.")

    # Move confirmed songs
    print("\n=== Syncing and Moving Songs ===")
    added_count = 0
    skipped_count = 0
    for genre, tracks in genre_to_tracks.items():
        playlist_id = genre_playlist_map.get(genre)
        if not playlist_id:
            skipped_count += len(tracks)
            continue
        for tid, tname in tracks:
            try:
                sp.playlist_add_items(playlist_id, [tid])
                added_count += 1
                print(f"Added: {tname} -> {genre}")
            except spotipy.SpotifyException as e:
                print(f"FAILED to add {tname} ({tid}) to {genre}: {e}")
                time.sleep(0.5)
            time.sleep(0.05)

    print("\n=== DONE ===")
    print(f"Tracks added: {added_count}")
    print(f"Tracks skipped: {skipped_count}")


if __name__ == "__main__":
    main()
