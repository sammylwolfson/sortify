import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SpotifyProvider } from "@/hooks/use-spotify";
import Home from "@/pages/home";
import PlaylistDetail from "@/pages/playlist-detail";
import { SpotifyPlaylistDetail } from "@/pages/spotify-playlist-detail";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/playlist/:id" component={PlaylistDetail} />
      <Route path="/spotify-playlist/:id" component={SpotifyPlaylistDetail} />
      <Route component={Home} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SpotifyProvider>
        <TooltipProvider>
          <div className="dark">
            <Toaster />
            <Router />
          </div>
        </TooltipProvider>
      </SpotifyProvider>
    </QueryClientProvider>
  );
}

export default App;
