import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SpotifyProvider, useSpotify } from "@/hooks/use-spotify";
import Home from "@/pages/home";
import PlaylistDetail from "@/pages/playlist-detail";
import { SpotifyPlaylistDetail } from "@/pages/spotify-playlist-detail";
import Login from "@/pages/login";

function AuthenticatedRouter() {
  const { accessToken } = useSpotify();

  if (!accessToken) {
    return <Login />;
  }

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
            <AuthenticatedRouter />
          </div>
        </TooltipProvider>
      </SpotifyProvider>
    </QueryClientProvider>
  );
}

export default App;
