import { Loader2 } from "lucide-react";
/**
 * Full screen loading spinner component
 */
export function FullScreenSpinner() {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-neutral-900 to-neutral-950">
            <Loader2 className="h-12 w-12 animate-spin text-white/80" />
            <p className="text-white/80 text-lg font-medium">Loading QubitKit…</p>
        </div>
    );
}