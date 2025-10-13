import { useState } from 'react'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { getOrCreateCircuitStore } from '@/features/circuit/store/CircuitStoreContext'
import { Cloud, Check, Loader2 } from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface SaveIndicatorProps {
    circuitId: string
}

export function SaveIndicator({ circuitId }: SaveIndicatorProps) {
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
    const handleSave = async () => {
        if (saveStatus === 'saving') return
        setSaveStatus('saving')
        try {
            const store = getOrCreateCircuitStore(circuitId)
            const state = store.getState()
            localStorage.setItem(`circuit-${circuitId}-storage`, JSON.stringify(state))

            await new Promise(resolve => setTimeout(resolve, 400))

            setSaveStatus('saved')
            setTimeout(() => setSaveStatus('idle'), 2000)
        } catch {
            setSaveStatus('error')
            setTimeout(() => setSaveStatus('idle'), 2000)
        }
    }

    useKeyboardShortcuts([
        {
            key: 's',
            ctrl: true,
            handler: handleSave
        }
    ])

    return (
        <div className="h-6 flex items-center justify-start min-w-[80px] gap-1.5">
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="w-4 flex-shrink-0">
                        {saveStatus === 'idle' && <Cloud className="w-4 h-4 text-muted-foreground" />}
                        {saveStatus === 'saving' && <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />}
                        {saveStatus === 'saved' && <Check className="w-3.5 h-3.5 text-green-600" />}
                        {saveStatus === 'error' && <Cloud className="w-3.5 h-3.5 text-red-600" />}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>All changes saved to local storage</p>
                </TooltipContent>
            </Tooltip>
            <span className="text-sm animate-in fade-in duration-200">
                {saveStatus === 'saving' && 'Saving...'}
                {saveStatus === 'saved' && 'Saved'}
                {saveStatus === 'error' && 'Save failed'}
            </span>
        </div>
    )
}