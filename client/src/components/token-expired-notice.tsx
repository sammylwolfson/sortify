import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface TokenExpiredNoticeProps {
  onReconnect: () => void;
}

export function TokenExpiredNotice({ onReconnect }: TokenExpiredNoticeProps) {
  return (
    <Alert className="border-yellow-600 bg-yellow-900/20 text-yellow-300 mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>Your Spotify connection has expired. Reconnect to continue using Spotify features.</span>
        <Button 
          size="sm" 
          variant="outline"
          onClick={onReconnect}
          className="ml-4 text-yellow-300 border-yellow-600 hover:bg-yellow-600 hover:text-black"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Reconnect
        </Button>
      </AlertDescription>
    </Alert>
  );
}