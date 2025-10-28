/**
 * Simple state manager for drag operations
 * This allows communication between GatesPanel and CircuitCanvas
 */
class DragState {
    private currentData: { id: string; type: 'gate' | 'circuit' } | null = null;

    set(id: string, type: 'gate' | 'circuit'): void {
        this.currentData = { id, type };
    }

    get(): { id: string; type: 'gate' | 'circuit' } | null {
        return this.currentData;
    }

    clear(): void {
        this.currentData = null;
    }
}

export const dragState = new DragState();