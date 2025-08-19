import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useSpotify } from "@/hooks/use-spotify";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Volume2, 
  Heart,
  ExternalLink,
  List,
  Monitor
} from "lucide-react";

// Spotify Web Playback SDK types
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume: number;
      }) => SpotifyPlayer;
    };
  }
}

interface SpotifyPlayer {
  addListener(event: string, callback: (data: any) => void): void;
  connect(): Promise<boolean>;
  disconnect(): void;
  getCurrentState(): Promise<any>;
  getVolume(): Promise<number>;
  nextTrack(): Promise<void>;
  pause(): Promise<void>;
  previousTrack(): Promise<void>;
  resume(): Promise<void>;
  seek(position: number): Promise<void>;
  setName(name: string): Promise<void>;
  setVolume(volume: number): Promise<void>;
  togglePlay(): Promise<void>;
}

export function PlaybackControls() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([75]);
  const [progress, setProgress] = useState([0]);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const { accessToken } = useSpotify();

  // Load Spotify Web Playback SDK
  useEffect(() => {
    if (!accessToken) return;

    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'ListLab Web Player',
        getOAuthToken: (cb) => { cb(accessToken); },
        volume: 0.75
      });

      // Ready
      player.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
      });

      // Not Ready
      player.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
      });

      // Player state changed
      player.addListener('player_state_changed', (state) => {
        if (!state) return;
        
        setCurrentTrack(state.track_window.current_track);
        setIsPlaying(!state.paused);
        setPosition(state.position);
        setDuration(state.duration);
        setProgress([(state.position / state.duration) * 100]);
      });

      // Connect to the player!
      player.connect();
    };

    return () => {
      if (window.Spotify && window.Spotify.Player) {
        // Clean up player if needed
      }
    };
  }, [accessToken]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    if (!accessToken) return;
    
    try {
      const endpoint = isPlaying 
        ? 'https://api.spotify.com/v1/me/player/pause'
        : 'https://api.spotify.com/v1/me/player/play';
      
      await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const handleNextTrack = async () => {
    if (!accessToken) return;
    
    try {
      await fetch('https://api.spotify.com/v1/me/player/next', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
    } catch (error) {
      console.error('Error skipping to next track:', error);
    }
  };

  const handlePreviousTrack = async () => {
    if (!accessToken) return;
    
    try {
      await fetch('https://api.spotify.com/v1/me/player/previous', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
    } catch (error) {
      console.error('Error skipping to previous track:', error);
    }
  };

  return (
    <div className="playback-controls fixed bottom-0 left-0 right-0 bg-listlab-gray border-t border-gray-800 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Currently Playing */}
        <div className="flex items-center space-x-3 w-1/4 min-w-0">
          <div className="w-14 h-14 bg-gray-600 rounded flex-shrink-0">
            {currentTrack?.album?.images?.[0] && (
              <img 
                src={currentTrack.album.images[0].url} 
                alt={currentTrack.name}
                className="w-full h-full rounded object-cover"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-white truncate">
              {currentTrack?.name || "No track playing"}
            </p>
            <p className="text-sm text-listlab-text truncate">
              {currentTrack?.artists?.map(artist => artist.name).join(', ') || "Select a song to play"}
            </p>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="text-listlab-text hover:text-white p-1"
            >
              <Heart className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-listlab-text hover:text-white p-1"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Player Controls */}
        <div className="flex flex-col items-center w-2/4 max-w-md">
          <div className="flex items-center space-x-6 mb-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-listlab-text hover:text-white p-1"
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePreviousTrack}
              className="text-listlab-text hover:text-white p-1"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handlePlayPause}
              className="w-8 h-8 bg-white rounded-full hover:scale-105 transition-transform p-0"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 text-black" />
              ) : (
                <Play className="h-4 w-4 text-black ml-0.5" fill="currentColor" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleNextTrack}
              className="text-listlab-text hover:text-white p-1"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-listlab-text hover:text-white p-1"
            >
              <Repeat className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Progress Bar */}
          <div className="flex items-center space-x-2 w-full">
            <span className="text-xs text-listlab-text flex-shrink-0">
              {formatTime(position)}
            </span>
            <Slider
              value={progress}
              onValueChange={setProgress}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-xs text-listlab-text flex-shrink-0">
              {formatTime(duration)}
            </span>
          </div>
        </div>
        
        {/* Volume and Options */}
        <div className="flex items-center justify-end space-x-4 w-1/4">
          <Button
            size="sm"
            variant="ghost"
            className="text-listlab-text hover:text-white p-1"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-listlab-text hover:text-white p-1"
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-listlab-text hover:text-white p-1"
            >
              <Volume2 className="h-4 w-4" />
            </Button>
            <Slider
              value={volume}
              onValueChange={setVolume}
              max={100}
              step={1}
              className="w-20"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
