import type { Collaborator, CollaboratorAction } from '@/features/collaboration/types';

type MessageHandler = (data: unknown) => void;

export class CollaborationService {
    private ws: WebSocket | null = null;
    private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private projectId: string | null = null;
    private userId: string | null = null;

    connect(projectId: string, userId: string): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        this.projectId = projectId;
        this.userId = userId;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = import.meta.env.VITE_BACKEND_PORT || '8000';
        const token = localStorage.getItem('auth_token');
        const wsUrl = `${protocol}//${host}:${port}/api/v1/ws/${token ? `?token=${token}` : ''}`;

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('[Collaboration] WebSocket connected');
                this.reconnectAttempts = 0;
                this.send('join_room', { room: `project:${projectId}`, userId });
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('[Collaboration] Failed to parse message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('[Collaboration] WebSocket error:', error);
            };

            this.ws.onclose = () => {
                console.log('[Collaboration] WebSocket disconnected');
                this.attemptReconnect();
            };
        } catch (error) {
            console.error('[Collaboration] Failed to create WebSocket connection:', error);
        }
    }

    disconnect(): void {
        if (this.ws && this.projectId) {
            this.send('leave_room', { room: `project:${this.projectId}` });
            this.ws.close();
            this.ws = null;
        }
        this.messageHandlers.clear();
        this.projectId = null;
        this.userId = null;
    }

    send(type: string, data: Record<string, unknown> = {}): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, ...data }));
        }
    }

    on(messageType: string, handler: MessageHandler): void {
        if (!this.messageHandlers.has(messageType)) {
            this.messageHandlers.set(messageType, new Set());
        }
        this.messageHandlers.get(messageType)!.add(handler);
    }

    off(messageType: string, handler: MessageHandler): void {
        this.messageHandlers.get(messageType)?.delete(handler);
    }

    sendCollaboratorUpdate(collaborator: Partial<Collaborator>): void {
        if (this.projectId) {
            this.send('collaborator_update', {
                room: `project:${this.projectId}`,
                data: collaborator,
            });
        }
    }

    sendAction(action: CollaboratorAction): void {
        if (this.projectId) {
            this.send('collaborator_action', {
                room: `project:${this.projectId}`,
                action,
            });
        }
    }

    sendCircuitChange(circuitId: string, activeCircuitId: string): void {
        if (this.projectId && this.userId) {
            this.send('circuit_change', {
                room: `project:${this.projectId}`,
                circuit_id: circuitId,
                active_circuit_id: activeCircuitId,
                user_id: this.userId,
            });
        }
    }

    private handleMessage(message: { type: string; [key: string]: unknown }): void {
        const handlers = this.messageHandlers.get(message.type);
        if (handlers) {
            handlers.forEach(handler => handler(message));
        }
    }

    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[Collaboration] Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        setTimeout(() => {
            if (this.projectId && this.userId) {
                console.log(`[Collaboration] Reconnecting... (attempt ${this.reconnectAttempts})`);
                this.connect(this.projectId, this.userId);
            }
        }, delay);
    }
}

export const collaborationService = new CollaborationService();
