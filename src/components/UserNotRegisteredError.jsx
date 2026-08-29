import React from "react";
import { AlertTriangle } from "lucide-react";

export default function UserNotRegisteredError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Account not set up</h1>
        <p className="text-muted-foreground">
          Your account hasn't been registered in this app yet. Please contact an
          administrator.
        </p>
      </div>
    </div>
  );
}