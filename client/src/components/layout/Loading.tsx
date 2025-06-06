export function Loading() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <img src="/app-icon.png" alt="Logo" className="h-16 w-16 animate-pulse" />
        <div className="relative flex h-4 w-48 overflow-hidden rounded-full bg-muted">
          <div className="animate-loading-bar absolute inset-y-0 left-0 w-48 bg-primary"></div>
        </div>
        <p className="text-sm text-muted-foreground">Loading Anxiety Companion...</p>
      </div>
    </div>
  );
}