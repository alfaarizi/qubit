import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebSocket, ReadyState } from '@/hooks/useWebSocket';
import { useAuthStore } from '@/stores/authStore';
import type { UserPresence, CursorPosition, GateLockInfo } from '@/features/collaboration/types';

interface UseCollaborationOptions {
  projectId: string;
  enabled?: boolean;
}

interface CollaborationState {
  presence: Map<string, UserPresence>;
  gateLocks: Map<string, GateLockInfo>;
  connectionId?: string;
}

interface WebSocketMessage {
  type: string;
  connectionId?: string;
  connection_id?: string;
  event?: string;
  presence?: UserPresence[];
  user?: UserPresence['user'];
  position?: CursorPosition;
  gateId?: string;
  [key: string]: unknown;
}

export function useCollaboration({ projectId, enabled = true }: UseCollaborationOptions) {
  const user = useAuthStore((state) => state.user);
  const [state, setState] = useState<CollaborationState>({
    presence: new Map(),
    gateLocks: new Map(),
  });
  const roomName = `project:${projectId}`;
  const stateRef = useRef(state);
  stateRef.current = state;

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'room_joined':
        setState((prev) => {
          const newPresence = new Map(prev.presence);
          if (message.presence) {
            message.presence.forEach((p: UserPresence) => {
              // don't add yourself to presence
              if (p.connectionId !== message.connection_id) {
                newPresence.set(p.connectionId, p);
              }
            });
          }
          return {
            ...prev,
            connectionId: message.connection_id,
            presence: newPresence,
          };
        });
        break;
      case 'user_presence':
        setState((prev) => {
          const newPresence = new Map(prev.presence);
          if (message.event === 'joined' && message.connectionId) {
            // don't add yourself
            if (message.connectionId !== prev.connectionId) {
              newPresence.set(message.connectionId, {
                connectionId: message.connectionId,
                user: message.user || {},
              });
            }
          } else if (message.event === 'left' && message.connectionId) {
            newPresence.delete(message.connectionId);
          }
          return { ...prev, presence: newPresence };
        });
        break;
      case 'cursor_update':
        setState((prev) => {
          const newPresence = new Map(prev.presence);
          if (message.connectionId) {
            const existing = newPresence.get(message.connectionId);
            if (existing && message.position) {
              newPresence.set(message.connectionId, {
                ...existing,
                cursor: message.position,
              });
            }
          }
          return { ...prev, presence: newPresence };
        });
        break;
      case 'gate_locked':
        if (message.gateId && message.connectionId) {
          setState((prev) => {
            const newLocks = new Map(prev.gateLocks);
            newLocks.set(message.gateId!, {
              gateId: message.gateId!,
              lockedBy: message.connectionId!,
              timestamp: Date.now(),
            });
            return { ...prev, gateLocks: newLocks };
          });
        }
        break;
      case 'gate_unlocked':
        if (message.gateId) {
          setState((prev) => {
            const newLocks = new Map(prev.gateLocks);
            newLocks.delete(message.gateId!);
            return { ...prev, gateLocks: newLocks };
          });
        }
        break;
      case 'connection_update':
        if (message.event === 'user_disconnected' && message.connection_id) {
          setState((prev) => {
            const newPresence = new Map(prev.presence);
            newPresence.delete(message.connection_id!);
            // release locks held by disconnected user
            const newLocks = new Map(prev.gateLocks);
            for (const [gateId, lock] of newLocks.entries()) {
              if (lock.lockedBy === message.connection_id) {
                newLocks.delete(gateId);
              }
            }
            return { ...prev, presence: newPresence, gateLocks: newLocks };
          });
        }
        break;
    }
  }, []);

  const { isConnected, sendMessage, readyState } = useWebSocket({
    enabled,
    onMessage: handleMessage,
  });

  // join room when connected
  useEffect(() => {
    if (isConnected && enabled && projectId && user) {
      const userInfo = {
        email: user.email,
        firstName: user.first_name || undefined,
        lastName: user.last_name || undefined,
        profileUrl: user.profile_url || undefined,
      };
      // send join_room with user info
      sendMessage({
        type: 'join_room',
        room: roomName,
        user: userInfo,
      });
      // send initial cursor position to make user visible immediately
      setTimeout(() => {
        sendMessage({
          type: 'cursor_move',
          room: roomName,
          position: { x: 100, y: 100 }, // initial position
        });
      }, 100);
      return () => {
        sendMessage({
          type: 'leave_room',
          room: roomName,
        });
      };
    }
  }, [isConnected, enabled, projectId, roomName, user, sendMessage]);

  const updateCursor = useCallback(
    (position: CursorPosition) => {
      if (isConnected) {
        sendMessage({
          type: 'cursor_move',
          room: roomName,
          position,
        });
      }
    },
    [isConnected, sendMessage, roomName]
  );

  const broadcastGateOperation = useCallback(
    (operation: string, data: Record<string, unknown>) => {
      if (isConnected) {
        sendMessage({
          type: 'gate_operation',
          room: roomName,
          operation,
          data,
        });
      }
    },
    [isConnected, sendMessage, roomName]
  );

  const lockGate = useCallback(
    async (gateId: string): Promise<boolean> => {
      if (!isConnected) return false;
      return new Promise((resolve) => {
        sendMessage({
          type: 'gate_lock',
          room: roomName,
          gateId,
        });
        // wait for response
        const timeout = setTimeout(() => {
          resolve(false);
        }, 5000);
        const checkLock = setInterval(() => {
          const lock = stateRef.current.gateLocks.get(gateId);
          if (lock && lock.lockedBy === stateRef.current.connectionId) {
            clearInterval(checkLock);
            clearTimeout(timeout);
            resolve(true);
          }
        }, 100);
      });
    },
    [isConnected, sendMessage, roomName]
  );

  const unlockGate = useCallback(
    (gateId: string) => {
      if (isConnected) {
        sendMessage({
          type: 'gate_unlock',
          room: roomName,
          gateId,
        });
      }
    },
    [isConnected, sendMessage, roomName]
  );

  const updateSelection = useCallback(
    (selectedGates: string[]) => {
      if (isConnected) {
        sendMessage({
          type: 'selection_change',
          room: roomName,
          selectedGates,
        });
      }
    },
    [isConnected, sendMessage, roomName]
  );

  const isGateLocked = useCallback(
    (gateId: string): boolean => {
      return state.gateLocks.has(gateId);
    },
    [state.gateLocks]
  );

  const isGateLockedByMe = useCallback(
    (gateId: string): boolean => {
      const lock = state.gateLocks.get(gateId);
      return lock?.lockedBy === state.connectionId;
    },
    [state.gateLocks, state.connectionId]
  );

  return {
    presence: Array.from(state.presence.values()),
    gateLocks: Array.from(state.gateLocks.values()),
    connectionId: state.connectionId,
    isConnected: readyState === ReadyState.OPEN,
    updateCursor,
    broadcastGateOperation,
    lockGate,
    unlockGate,
    updateSelection,
    isGateLocked,
    isGateLockedByMe,
  };
}

