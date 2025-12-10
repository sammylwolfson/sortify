# 🎵 Sortify – Spotify Playlist Organizer

Sortify is a **local desktop app** that helps you organize your Spotify Liked Songs into custom playlists by genre. It runs entirely on your computer, never stores your data, and is fully privacy-focused.

## ✨ Features

- 🎨 **Desktop GUI** – Clean, easy-to-use interface built with Tkinter
- 🎵 **View all Liked Songs** – See your entire Spotify library with artist and genre info
- 📊 **Group by Genre** – Automatically groups songs by their Spotify genres
- 📁 **Custom Playlists** – Choose which playlist each genre's songs go to
- 🔒 **Private & Secure** – Runs locally, uses official Spotify API, no data stored
- 🖥️ **Standalone App** – Download and run without installing Python (macOS)

## 📥 Download & Install

### Option 1: Download the Standalone App (macOS only)

1. **Download** `Sortify.app` from the [Releases](https://github.com/sammylwolfson/sortify/releases) page
2. **Move** `Sortify.app` to your Applications folder
3. **Create your credentials file** (see Setup below)
4. **Run** the app by double-clicking `Sortify.app`

### Option 2: Run from Source (All Platforms)cal Playlist Organizer

Sortify includes a local Python tool that automatically organizes all your Spotify Liked Songs into 11 genre playlists using Spotify’s official Web API.

This tool runs entirely on your computer, never stores your data, and requires no servers or deployments.

🚀 Features

Automatically scans all your Liked Songs

Fetches artist genres from Spotify

Sorts each track into one of 11 custom genre playlists

Skips duplicates

Safe, private, and ToS-compliant

Works on macOS, Windows, and Linux

**Requirements:**
- Python 3.12+ (download from [python.org](https://www.python.org/downloads/))
- Git

**Steps:**

1. **Clone the repo:**
   ```bash
   git clone https://github.com/sammylwolfson/sortify
   cd sortify
   ```

2. **Install Python dependencies:**
   ```bash
   pip3 install -r requirements.txt
   ```

3. **Set up credentials** (see Setup below)

4. **Run the app:**
   ```bash
   python3 sortify_gui.py
   ```

## 🔐 Setup – Spotify API Credentials

Sortify uses the official Spotify Web API. You'll need to create a free Spotify Developer app:

### 1. Create a Spotify Developer App

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click **"Create app"**
3. Fill in:
   - **App name:** Sortify (or anything you like)
   - **App description:** Personal playlist organizer
   - **Redirect URI:** `http://127.0.0.1:8888/callback`
   - Check the Terms of Service box
4. Click **"Save"**
5. Click **"Settings"** and copy your:
   - **Client ID**
   - **Client Secret** (click "View client secret")

### 2. Create Your Credentials File

**For Standalone App users:**

Create a file at `~/.sortify.env` in your home directory with this content:

```bash
SPOTIPY_CLIENT_ID=your_client_id_here
SPOTIPY_CLIENT_SECRET=your_client_secret_here
SPOTIPY_REDIRECT_URI=http://127.0.0.1:8888/callback
```

**For Python users:**

Copy the example file and edit it:

```bash
cp example.env .env
```

Then edit `.env` with your credentials:

```bash
SPOTIPY_CLIENT_ID=your_client_id_here
SPOTIPY_CLIENT_SECRET=your_client_secret_here
SPOTIPY_REDIRECT_URI=http://127.0.0.1:8888/callback
```

## � How to Use

1. **Launch Sortify** (double-click `Sortify.app` or run `python3 sortify_gui.py`)

2. **Click "Login to Spotify"** – A browser window will open for you to authorize the app

3. **View your Liked Songs** – The app will fetch and display all your liked songs, grouped by genre

4. **Choose playlists** – For each genre group:
   - Select a target playlist from the dropdown
   - Click **"Add All to Playlist"** to move those songs

5. **Done!** – Your songs are now organized into your chosen playlists

### Tips

- You can use any existing playlists or create new ones in Spotify first
- Songs without genre info will appear in "Unknown Genre"
- Use the **"Refresh Liked Songs"** button to update after adding new songs
- The app won't create duplicates – it's safe to run multiple times

## 📂 File Structure

```
sortify/
├── sortify_gui.py          # Main desktop app
├── sortify.py              # Original CLI version
├── requirements.txt        # Python dependencies
├── example.env             # Environment template
└── README.md              # This file
```


## ❓ FAQ

**Q: Is this safe?**  
A: Yes! Sortify uses the official Spotify Web API and runs entirely on your computer. No data is stored or sent anywhere.

**Q: Do I need to keep Python installed if I use the standalone app?**  
A: No, the standalone `.app` includes everything you need.

**Q: Can I undo changes?**  
A: Songs are copied, not moved. Your Liked Songs remain unchanged. You can manually remove songs from playlists in Spotify.

**Q: Why do some songs show "Unknown Genre"?**  
A: Some artists don't have genre tags in Spotify's database. You can still organize these manually.

**Q: Does this work on Windows/Linux?**  
A: The Python version works everywhere. The standalone `.app` is macOS only for now.

## 🛠️ Troubleshooting

**"No client_id" error:**  
Make sure your `.sortify.env` file is in your home directory (`~/.sortify.env`) with the correct credentials.

**"Invalid redirect URI" error:**  
In your Spotify Developer Dashboard, make sure you've added exactly: `http://127.0.0.1:8888/callback`

**Tkinter not found (Python users):**  
Install Python from [python.org](https://www.python.org/downloads/) (not Homebrew) to get Tkinter support.

## 📜 License

MIT License – feel free to use, modify, and share!

## 🙏 Credits

Built with ❤️ using:
- [Spotipy](https://spotipy.readthedocs.io/) – Spotify Web API wrapper
- [Tkinter](https://docs.python.org/3/library/tkinter.html) – Python GUI framework
- [Spotify Web API](https://developer.spotify.com/documentation/web-api) – Official Spotify API

---

**Enjoy organizing your music! 🎶**

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