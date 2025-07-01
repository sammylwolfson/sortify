import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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

export function PlaybackControls() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([75]);
  const [progress, setProgress] = useState([25]);

  const currentSong = {
    title: "Blinding Lights",
    artist: "The Weeknd",
    currentTime: "0:32",
    duration: "3:45"
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-spotify-gray border-t border-gray-800 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Currently Playing */}
        <div className="flex items-center space-x-3 w-1/4 min-w-0">
          <div className="w-14 h-14 bg-gray-600 rounded flex-shrink-0"></div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-white truncate">{currentSong.title}</p>
            <p className="text-sm spotify-text truncate">{currentSong.artist}</p>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="text-spotify-text hover:text-white p-1"
            >
              <Heart className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-spotify-text hover:text-white p-1"
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
              className="text-spotify-text hover:text-white p-1"
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-spotify-text hover:text-white p-1"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
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
              className="text-spotify-text hover:text-white p-1"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-spotify-text hover:text-white p-1"
            >
              <Repeat className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Progress Bar */}
          <div className="flex items-center space-x-2 w-full">
            <span className="text-xs spotify-text flex-shrink-0">{currentSong.currentTime}</span>
            <Slider
              value={progress}
              onValueChange={setProgress}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-xs spotify-text flex-shrink-0">{currentSong.duration}</span>
          </div>
        </div>
        
        {/* Volume and Options */}
        <div className="flex items-center justify-end space-x-4 w-1/4">
          <Button
            size="sm"
            variant="ghost"
            className="text-spotify-text hover:text-white p-1"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-spotify-text hover:text-white p-1"
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-spotify-text hover:text-white p-1"
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
