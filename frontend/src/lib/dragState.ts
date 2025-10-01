/**
 * Simple state manager for drag operations
 * This allows communication between GatesPanel and CircuitCanvas
 */
class DragState {
    private currentGateId: string | null = null;

    set(gateId: string | null): void {
        this.currentGateId = gateId;
    }

    get(): string | null {
        return this.currentGateId;
    }

    clear(): void {
        this.currentGateId = null;
    }
}

export const dragState = new DragState();