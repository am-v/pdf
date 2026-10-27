import { Loader2 } from 'lucide-react';

export function RouteLoadingFallback() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
      <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center text-accent-foreground mb-4 shadow-sm ring-1 ring-accent/20">
        <Loader2 className="w-7 h-7 animate-spin" />
      </div>
      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
        Loading Tool...
      </p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
        Initializing client-side WebAssembly and PDF processing modules.
      </p>
    </div>
  );
}
