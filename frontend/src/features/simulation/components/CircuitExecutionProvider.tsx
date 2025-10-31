import { createContext, useContext, useRef, type ReactNode } from 'react';
import { toast } from "sonner";
import { useWebSocket, type WebSocketMessage } from "@/hooks/useWebSocket";
import { getOrCreateCircuitStore } from "@/features/circuit/store/CircuitStoreContext";

interface CircuitExecutionContextValue {
    isConnected: boolean;
    startExecution: (circuitId: string, toastId: string | number, abortController: AbortController) => void;
    abortExecution: (circuitId: string) => void;
}

const CircuitExecutionContext = createContext<CircuitExecutionContextValue | null>(null);

export function CircuitExecutionProvider({ children }: { children: ReactNode }) {
    const activeExecutionsRef = useRef<Map<string, { toastId: string | number; completed: boolean; abortController: AbortController }>>(new Map());

    // Single WebSocket connection shared across all circuits
    const { isConnected, joinRoom } = useWebSocket({
        onMessage: (message: WebSocketMessage) => {
            console.log('[CircuitExecution] WebSocket message received:', message);

            if (message.type === 'circuit_execution_progress') {
                const circuitId = message.circuit_id as string;
                const progress = message.progress as number;

                console.log(`[CircuitExecution] Progress update: ${progress}% for circuit ${circuitId}`);

                // Update the specific circuit's progress
                const store = getOrCreateCircuitStore(circuitId);
                store.getState().setExecutionProgress(progress);
            } else if (message.type === 'circuit_execution_complete') {
                const circuitId = message.circuit_id as string;
                const result = message.result as { gates: unknown[]; num_gates: number; execution_time: number };

                console.log(`[CircuitExecution] Completion for circuit ${circuitId}`, result);

                // Check if this execution is active and not already completed
                const execution = activeExecutionsRef.current.get(circuitId);
                if (!execution || execution.completed) {
                    console.log('[CircuitExecution] Skipping - already completed or not tracked');
                    return; // Skip if already completed or not tracked
                }

                // Mark as completed to prevent duplicate handling
                execution.completed = true;

                // Update the specific circuit's state
                const store = getOrCreateCircuitStore(circuitId);
                store.getState().setIsExecuting(false);
                store.getState().setExecutionProgress(0);

                // Show success toast
                toast.success("Circuit executed successfully", { id: execution.toastId });

                // Download result as JSON
                const dataStr = JSON.stringify(result, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `circuit-result-${Date.now()}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                // Clean up after completion
                activeExecutionsRef.current.delete(circuitId);
            }
        }
    });

    const startExecution = (circuitId: string, toastId: string | number, abortController: AbortController) => {
        activeExecutionsRef.current.set(circuitId, { toastId, completed: false, abortController });
        // Join the circuit-specific room
        if (isConnected) {
            console.log(`[CircuitExecution] Joining room: circuit-${circuitId}`);
            joinRoom(`circuit-${circuitId}`);
        }
    };

    const abortExecution = (circuitId: string) => {
        const execution = activeExecutionsRef.current.get(circuitId);
        if (execution) {
            // Abort the HTTP request
            execution.abortController.abort();

            // Mark as completed to prevent further processing
            execution.completed = true;

            // Update the circuit's state
            const store = getOrCreateCircuitStore(circuitId);
            store.getState().setIsExecuting(false);
            store.getState().setExecutionProgress(0);

            // Show abort toast
            toast.error("Circuit execution aborted", { id: execution.toastId });

            // Clean up
            activeExecutionsRef.current.delete(circuitId);
        }
    };

    return (
        <CircuitExecutionContext.Provider value={{ isConnected, startExecution, abortExecution }}>
            {children}
        </CircuitExecutionContext.Provider>
    );
}

export function useCircuitExecution() {
    const context = useContext(CircuitExecutionContext);
    if (!context) {
        throw new Error('useCircuitExecution must be used within CircuitExecutionProvider');
    }
    return context;
}
