import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSpotify } from "@/hooks/use-spotify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Music, Zap, Volume2, Heart, Clock, Mic, TrendingUp, Users, Hash } from "lucide-react";

interface CreatePlaylistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PlaylistCriteria {
  bpm: [number, number];
  energy: [number, number];
  danceability: [number, number];
  loudness: [number, number];
  valence: [number, number];
  length: [number, number];
  acousticness: [number, number];
  popularity: [number, number];
  artistSeparation: boolean;
  genres: string[];
  // Enabled flags for each criterion
  enabledCriteria: {
    bpm: boolean;
    energy: boolean;
    danceability: boolean;
    loudness: boolean;
    valence: boolean;
    length: boolean;
    acousticness: boolean;
    popularity: boolean;
    genres: boolean;
  };
}

export function CreatePlaylistModalEnhanced({ open, onOpenChange }: CreatePlaylistModalProps) {
  const [creationType, setCreationType] = useState<"manual" | "automatic">("manual");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { accessToken } = useSpotify();
  const [criteria, setCriteria] = useState<PlaylistCriteria>({
    bpm: [60, 180],
    energy: [0, 1],
    danceability: [0, 1],
    loudness: [-60, 0],
    valence: [0, 1],
    length: [30, 300], // seconds
    acousticness: [0, 1],
    popularity: [0, 100],
    artistSeparation: true,
    genres: [],
    enabledCriteria: {
      bpm: false,
      energy: false,
      danceability: false,
      loudness: false,
      valence: false,
      length: false,
      acousticness: false,
      popularity: false,
      genres: false
    }
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createPlaylistMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; criteria?: PlaylistCriteria; accessToken?: string }) => {
      const response = await apiRequest("POST", "/api/playlists", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      toast({
        title: "Success",
        description: "Playlist created successfully",
      });
      onOpenChange(false);
      setName("");
      setDescription("");
      setCreationType("manual");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create playlist",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      ...(creationType === "automatic" && { criteria, accessToken })
    };

    createPlaylistMutation.mutate(payload);
  };

  const availableGenres = [
    "pop", "rock", "hip-hop", "electronic", "jazz", "classical", "country", "r&b", "indie", "alternative",
    "folk", "blues", "reggae", "metal", "punk", "funk", "soul", "disco", "house", "techno"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-listlab-gray border-gray-700 max-w-2xl max-h-[70vh] overflow-hidden mb-20" aria-describedby="create-playlist-description">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Create New Playlist</DialogTitle>
        </DialogHeader>
        <div id="create-playlist-description" className="sr-only">
          Create a new playlist manually or automatically using audio features
        </div>

        <Tabs value={creationType} onValueChange={(value) => setCreationType(value as "manual" | "automatic")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger value="manual" className="data-[state=active]:bg-listlab-green data-[state=active]:text-black">
              Manual Creation
            </TabsTrigger>
            <TabsTrigger value="automatic" className="data-[state=active]:bg-listlab-green data-[state=active]:text-black">
              Automatic Generation
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="name" className="text-white">Playlist Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter playlist name"
                  className="bg-gray-800 border-gray-600 text-white"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-white">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your playlist"
                  className="bg-gray-800 border-gray-600 text-white h-20"
                />
              </div>
            </div>

            <TabsContent value="manual" className="space-y-4">
              <Card className="bg-gray-800 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Music className="h-5 w-5 mr-2" />
                    Manual Playlist
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Create an empty playlist and add songs manually
                  </CardDescription>
                </CardHeader>
              </Card>
            </TabsContent>

            <TabsContent value="automatic" className="space-y-4 max-h-96 overflow-y-auto">
              <Card className="bg-gray-800 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Zap className="h-5 w-5 mr-2" />
                    Audio Feature Criteria
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Define the characteristics of songs to include
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    {/* Genres - moved above BPM */}
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Checkbox
                          id="genres-enabled"
                          checked={criteria.enabledCriteria.genres}
                          onCheckedChange={(checked) => 
                            setCriteria({
                              ...criteria,
                              enabledCriteria: { ...criteria.enabledCriteria, genres: !!checked }
                            })
                          }
                        />
                        <Label htmlFor="genres-enabled" className="text-white">Preferred Genres</Label>
                      </div>
                      {criteria.enabledCriteria.genres && (
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                          {availableGenres.map((genre) => (
                            <Badge
                              key={genre}
                              variant={criteria.genres.includes(genre) ? "default" : "outline"}
                              className={`cursor-pointer ${
                                criteria.genres.includes(genre)
                                  ? "bg-listlab-green text-black"
                                  : "text-white border-gray-600 hover:bg-gray-700"
                              }`}
                              onClick={() => {
                                const newGenres = criteria.genres.includes(genre)
                                  ? criteria.genres.filter(g => g !== genre)
                                  : [...criteria.genres, genre];
                                setCriteria({...criteria, genres: newGenres});
                              }}
                            >
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Checkbox
                          id="bpm-enabled"
                          checked={criteria.enabledCriteria.bpm}
                          onCheckedChange={(checked) => 
                            setCriteria({
                              ...criteria,
                              enabledCriteria: { ...criteria.enabledCriteria, bpm: !!checked }
                            })
                          }
                        />
                        <Label htmlFor="bpm-enabled" className="text-white flex items-center">
                          <Hash className="h-4 w-4 mr-2" />
                          BPM (Beats Per Minute): {criteria.bpm[0]} - {criteria.bpm[1]}
                        </Label>
                      </div>
                      {criteria.enabledCriteria.bpm && (
                        <Slider
                          value={criteria.bpm}
                          onValueChange={(value) => setCriteria({...criteria, bpm: value as [number, number]})}
                          min={60}
                          max={200}
                          step={5}
                          className="mt-2"
                        />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Checkbox
                          id="energy-enabled"
                          checked={criteria.enabledCriteria.energy}
                          onCheckedChange={(checked) => 
                            setCriteria({
                              ...criteria,
                              enabledCriteria: { ...criteria.enabledCriteria, energy: !!checked }
                            })
                          }
                        />
                        <Label htmlFor="energy-enabled" className="text-white flex items-center">
                          <Zap className="h-4 w-4 mr-2" />
                          Energy: {(criteria.energy[0] * 100).toFixed(0)}% - {(criteria.energy[1] * 100).toFixed(0)}%
                        </Label>
                      </div>
                      {criteria.enabledCriteria.energy && (
                        <Slider
                          value={criteria.energy}
                          onValueChange={(value) => setCriteria({...criteria, energy: value as [number, number]})}
                          min={0}
                          max={1}
                          step={0.1}
                          className="mt-2"
                        />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Checkbox
                          id="danceability-enabled"
                          checked={criteria.enabledCriteria.danceability}
                          onCheckedChange={(checked) => 
                            setCriteria({
                              ...criteria,
                              enabledCriteria: { ...criteria.enabledCriteria, danceability: !!checked }
                            })
                          }
                        />
                        <Label htmlFor="danceability-enabled" className="text-white flex items-center">
                          <Music className="h-4 w-4 mr-2" />
                          Danceability: {(criteria.danceability[0] * 100).toFixed(0)}% - {(criteria.danceability[1] * 100).toFixed(0)}%
                        </Label>
                      </div>
                      {criteria.enabledCriteria.danceability && (
                        <Slider
                          value={criteria.danceability}
                          onValueChange={(value) => setCriteria({...criteria, danceability: value as [number, number]})}
                          min={0}
                          max={1}
                          step={0.1}
                          className="mt-2"
                        />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Checkbox
                          id="loudness-enabled"
                          checked={criteria.enabledCriteria.loudness}
                          onCheckedChange={(checked) => 
                            setCriteria({
                              ...criteria,
                              enabledCriteria: { ...criteria.enabledCriteria, loudness: !!checked }
                            })
                          }
                        />
                        <Label htmlFor="loudness-enabled" className="text-white flex items-center">
                          <Volume2 className="h-4 w-4 mr-2" />
                          Loudness: {criteria.loudness[0]}dB - {criteria.loudness[1]}dB
                        </Label>
                      </div>
                      {criteria.enabledCriteria.loudness && (
                        <Slider
                          value={criteria.loudness}
                          onValueChange={(value) => setCriteria({...criteria, loudness: value as [number, number]})}
                          min={-60}
                          max={0}
                          step={2}
                          className="mt-2"
                        />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Checkbox
                          id="valence-enabled"
                          checked={criteria.enabledCriteria.valence}
                          onCheckedChange={(checked) => 
                            setCriteria({
                              ...criteria,
                              enabledCriteria: { ...criteria.enabledCriteria, valence: !!checked }
                            })
                          }
                        />
                        <Label htmlFor="valence-enabled" className="text-white flex items-center">
                          <Heart className="h-4 w-4 mr-2" />
                          Valence (Positivity): {(criteria.valence[0] * 100).toFixed(0)}% - {(criteria.valence[1] * 100).toFixed(0)}%
                        </Label>
                      </div>
                      {criteria.enabledCriteria.valence && (
                        <Slider
                          value={criteria.valence}
                          onValueChange={(value) => setCriteria({...criteria, valence: value as [number, number]})}
                          min={0}
                          max={1}
                          step={0.1}
                          className="mt-2"
                        />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Checkbox
                          id="length-enabled"
                          checked={criteria.enabledCriteria.length}
                          onCheckedChange={(checked) => 
                            setCriteria({
                              ...criteria,
                              enabledCriteria: { ...criteria.enabledCriteria, length: !!checked }
                            })
                          }
                        />
                        <Label htmlFor="length-enabled" className="text-white flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          Length: {Math.floor(criteria.length[0]/60)}:{(criteria.length[0]%60).toString().padStart(2,'0')} - {Math.floor(criteria.length[1]/60)}:{(criteria.length[1]%60).toString().padStart(2,'0')}
                        </Label>
                      </div>
                      {criteria.enabledCriteria.length && (
                        <Slider
                          value={criteria.length}
                          onValueChange={(value) => setCriteria({...criteria, length: value as [number, number]})}
                          min={30}
                          max={600}
                          step={15}
                          className="mt-2"
                        />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Checkbox
                          id="acousticness-enabled"
                          checked={criteria.enabledCriteria.acousticness}
                          onCheckedChange={(checked) => 
                            setCriteria({
                              ...criteria,
                              enabledCriteria: { ...criteria.enabledCriteria, acousticness: !!checked }
                            })
                          }
                        />
                        <Label htmlFor="acousticness-enabled" className="text-white flex items-center">
                          <Mic className="h-4 w-4 mr-2" />
                          Acousticness: {(criteria.acousticness[0] * 100).toFixed(0)}% - {(criteria.acousticness[1] * 100).toFixed(0)}%
                        </Label>
                      </div>
                      {criteria.enabledCriteria.acousticness && (
                        <Slider
                          value={criteria.acousticness}
                          onValueChange={(value) => setCriteria({...criteria, acousticness: value as [number, number]})}
                          min={0}
                          max={1}
                          step={0.1}
                          className="mt-2"
                        />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Checkbox
                          id="popularity-enabled"
                          checked={criteria.enabledCriteria.popularity}
                          onCheckedChange={(checked) => 
                            setCriteria({
                              ...criteria,
                              enabledCriteria: { ...criteria.enabledCriteria, popularity: !!checked }
                            })
                          }
                        />
                        <Label htmlFor="popularity-enabled" className="text-white flex items-center">
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Popularity: {criteria.popularity[0]}% - {criteria.popularity[1]}%
                        </Label>
                      </div>
                      {criteria.enabledCriteria.popularity && (
                        <Slider
                          value={criteria.popularity}
                          onValueChange={(value) => setCriteria({...criteria, popularity: value as [number, number]})}
                          min={0}
                          max={100}
                          step={5}
                          className="mt-2"
                        />
                      )}
                    </div>

                    <div>
                      <Label className="text-white flex items-center mb-2">
                        <Users className="h-4 w-4 mr-2" />
                        Artist Separation
                      </Label>
                      <RadioGroup
                        value={criteria.artistSeparation ? "enabled" : "disabled"}
                        onValueChange={(value) => setCriteria({...criteria, artistSeparation: value === "enabled"})}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="enabled" id="sep-enabled" />
                          <Label htmlFor="sep-enabled" className="text-white">Maximize artist variety</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="disabled" id="sep-disabled" />
                          <Label htmlFor="sep-disabled" className="text-white">Allow multiple songs per artist</Label>
                        </div>
                      </RadioGroup>
                    </div>

                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <div className="flex justify-end space-x-2 pt-4 border-t border-gray-600">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-gray-600 text-white hover:bg-gray-700">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPlaylistMutation.isPending || !name.trim()}
                className="bg-listlab-green hover:bg-listlab-green/90 text-black"
              >
                {createPlaylistMutation.isPending ? "Creating..." : 
                 creationType === "manual" ? "Create Playlist" : "Generate Playlist"}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}