📘 Sortify CLI – Local Playlist Organizer

Sortify includes a local Python tool that automatically organizes all your Spotify Liked Songs into 11 genre playlists using Spotify’s official Web API.

This tool runs entirely on your computer, never stores your data, and requires no servers or deployments.

🚀 Features

Automatically scans all your Liked Songs

Fetches artist genres from Spotify

Sorts each track into one of 11 custom genre playlists

Skips duplicates

Safe, private, and ToS-compliant

Works on macOS, Windows, and Linux

📦 Installation
1. Clone the repo
git clone https://github.com/sammylwolfson/sortify
cd sortify

2. Install Python dependencies
pip install -r requirements.txt


(Use pip3 if needed.)

🔐 Spotify API Setup

Sortify uses Spotify OAuth, so you must create a Spotify Developer App (free, takes 60 seconds).

1. Go to

https://developer.spotify.com/dashboard

2. Create a new app

Name it anything (e.g., SortifyLocal).

3. Add this Redirect URI:
http://localhost:8888/callback

4. Copy your:

Client ID

Client Secret

📝 Environment Variables

Copy the example env file:

cp example.env .env


Open .env and fill in:

SPOTIPY_CLIENT_ID=YOUR_CLIENT_ID
SPOTIPY_CLIENT_SECRET=YOUR_CLIENT_SECRET
SPOTIPY_REDIRECT_URI=http://localhost:8888/callback

🎧 Create the 11 Genre Playlists

Sortify requires these exact playlist names in your Spotify account:

Electronic

Dance / EDM

House / Disco / Funk

Hip Hop / Rap

Trap / Bass

Pop

Alternative / Indie

R&B / Soul / Blues / Jazz

Chill / Downtempo

Latin / Urbano

Rock

Create them once — Sortify will reuse them forever.

▶️ Running the Sorter

Just run:

python3 sortify.py


On the first run, your browser will open and ask you to log in to Spotify and approve the app.

After that:

Sortify fetches all your Liked Songs

Determines each track’s genre

Adds the track to the correct playlist

Skips songs already sorted

Prints live updates as it runs

✔️ Example Output
Authenticated as Spotify user: sammywolfson

Found playlist: Electronic -> 3x...
Found playlist: Dance / EDM -> 6A...
...

Total liked tracks fetched: 9,842
Unique artists found: 2,311

Added: Midnight City -> Electronic
Added: Gucci Flip Flops -> Hip Hop / Rap
Added: Stay With Me -> R&B / Soul / Blues / Jazz
Skipped: Already in playlist
...

=== DONE ===
Tracks added: 582
Tracks skipped: 9260

🛠 Troubleshooting

Q: It says a playlist is missing.
→ Check the spelling matches EXACTLY (case and spaces).

Q: OAuth window didn’t open.
→ Try running again or open the link printed in the terminal.

Q: Genres seem wrong for some songs.
→ Genre mapping can be customized in sortify.py.

❤️ License

You may license your project however you like.
(MIT License recommended for open-source use.)