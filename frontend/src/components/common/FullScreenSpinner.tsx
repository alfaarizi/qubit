import { Spinner } from "@/components/ui/spinner"
/**
 * Full screen loading spinner component
 */
export function FullScreenSpinner() {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-neutral-900 to-neutral-950">
            <div className="flex items-center gap-4">
                <Spinner className="size-8" />
            </div>
            <p className="text-white/80 text-lg font-medium">Loading QubitKit…</p>
        </div>
    );
}