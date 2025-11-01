import { createContext, useContext, useRef, type ReactNode } from 'react';
import { toast } from "sonner";
import { useWebSocket, type WebSocketMessage } from "@/hooks/useWebSocket";
import { getOrCreateCircuitStore } from "@/features/circuit/store/CircuitStoreContext";

interface CircuitExecutionContextValue {
    isConnected: boolean;
    startExecution: (circuitId: string, toastId: string | number, abortController: AbortController) => void;
    abortExecution: (circuitId: string) => void;
    requestCircuitClose: (circuitId: string, circuitSymbol: string, onConfirm: () => void) => void;
}

const CircuitExecutionContext = createContext<CircuitExecutionContextValue | null>(null);

export function CircuitExecutionProvider({ children }: { children: ReactNode }) {
    const activeExecutionsRef = useRef<Map<string, { 
        toastId: string | number; 
        completed: boolean; 
        abortController: AbortController;
        closeRequestToastId?: string | number; // Add this
    }>>(new Map());

    // WebSocket connection shared across all circuits
    const { isConnected, joinRoom } = useWebSocket({
        onMessage: (message: WebSocketMessage) => {
            if (message.type === 'circuit_execution_status') {
                const circuitId = message.circuit_id as string;
                const status = message.status as string;
                const progress = message.progress as number;

                const store = getOrCreateCircuitStore(circuitId);
                const state = store.getState();
                state.setExecutionStatus(status);
                state.setExecutionProgress(progress);
            } else if (message.type === 'circuit_execution_progress') {
                const circuitId = message.circuit_id as string;
                const progress = message.progress as number;

                const store = getOrCreateCircuitStore(circuitId);
                const state = store.getState();
                state.setExecutionProgress(progress);
            } else if (message.type === 'circuit_execution_complete') {
                const circuitId = message.circuit_id as string;
                const result = message.result as { gates: unknown[]; num_gates: number; execution_time: number };

                const execution = activeExecutionsRef.current.get(circuitId);
                if (!execution || execution.completed) {
                    return; // skip if already completed or not tracked
                }

                // Mark as completed to prevent duplicate handling
                execution.completed = true;

                const store = getOrCreateCircuitStore(circuitId);
                const state = store.getState();
                state.setIsExecuting(false);
                state.setExecutionProgress(0);
                state.setExecutionStatus('');

                toast.success("Circuit executed successfully", { id: execution.toastId });

                if (execution.closeRequestToastId) {
                    toast.dismiss(execution.closeRequestToastId);
                }

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
            } else if (message.type === 'circuit_execution_aborted') {
                const circuitId = message.circuit_id as string;
                
                const execution = activeExecutionsRef.current.get(circuitId);
                if (!execution || execution.completed) {
                    return; // skip if already completed or not tracked
                }
                
                // Mark as completed to prevent further processing
                execution.completed = true;
                
                const store = getOrCreateCircuitStore(circuitId);
                const state = store.getState();
                state.setIsExecuting(false);
                state.setExecutionProgress(0);
                state.setExecutionStatus('');
                
                // Clean up
                activeExecutionsRef.current.delete(circuitId);
            }
        }
    });

    const startExecution = (circuitId: string, toastId: string | number, abortController: AbortController) => {
        activeExecutionsRef.current.set(circuitId, { toastId, completed: false, abortController });
        // join the circuit-specific room
        if (isConnected) {
            joinRoom(`circuit-${circuitId}`);
        }
    };

    const abortExecution = (circuitId: string) => {
        const execution = activeExecutionsRef.current.get(circuitId);
        if (execution) {
            execution.abortController.abort();

            execution.completed = true;

            const store = getOrCreateCircuitStore(circuitId);
            const state = store.getState();
            state.setIsExecuting(false);
            state.setExecutionProgress(0);
            state.setExecutionStatus('');

            toast.error("Circuit execution aborted", { id: execution.toastId });

            activeExecutionsRef.current.delete(circuitId);
        }
    };

    const requestCircuitClose = (circuitId: string, circuitSymbol: string, onConfirm: () => void) => {
        const execution = activeExecutionsRef.current.get(circuitId);
        
        if (execution && !execution.completed) {
            // Circuit is executing, show confirmation toast
            const toastId = toast(`Close ${circuitSymbol}?`, {
                description: 'This circuit is currently executing. Closing it will abort the execution.',
                duration: Infinity,
                action: {
                label: 'Close & Abort',
                onClick: () => {
                    abortExecution(circuitId);
                    onConfirm();
                },
                },
                cancel: {
                    label: 'Cancel',
                    onClick: () => {
                        const exec = activeExecutionsRef.current.get(circuitId);
                        if (exec) {
                            exec.closeRequestToastId = undefined;
                        }
                    },
                },
                classNames: {
                    actionButton: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                },
            });
            execution.closeRequestToastId = toastId;
        } else {
            // not executing, close immediately
            onConfirm();
        }
    };

    return (
        <CircuitExecutionContext.Provider value={{ isConnected, startExecution, abortExecution, requestCircuitClose }}>
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
