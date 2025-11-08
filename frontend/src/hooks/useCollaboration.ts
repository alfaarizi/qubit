import { useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useAuthStore } from '@/stores/authStore';
import { collaborationApi } from '@/lib/api/collaboration';
import type {
  AnyCollaborationEvent,
  CursorMoveEvent,
  GateSelectedEvent,
  GateOperationEvent,
  GateGroupEvent,
  CircuitEvent,
  ExecutionEvent,
  ProjectRenamedEvent,
  UserPresenceEvent,
  GateLockEvent,
} from '@/types/collaboration';

interface UseCollaborationOptions {
  projectId: string;
  onGateAdded?: (event: GateOperationEvent) => void;
  onGateMoved?: (event: GateOperationEvent) => void;
  onGateDeleted?: (event: GateOperationEvent) => void;
  onGateUpdated?: (event: GateOperationEvent) => void;
  onGateGrouped?: (event: GateGroupEvent) => void;
  onGateUngrouped?: (event: GateGroupEvent) => void;
  onCircuitAdded?: (event: CircuitEvent) => void;
  onCircuitRemoved?: (event: CircuitEvent) => void;
  onCircuitRenamed?: (event: CircuitEvent) => void;
  onExecutionStarted?: (event: ExecutionEvent) => void;
  onExecutionProgress?: (event: ExecutionEvent) => void;
  onExecutionCompleted?: (event: ExecutionEvent) => void;
  onProjectRenamed?: (event: ProjectRenamedEvent) => void;
}

export function useCollaboration(options: UseCollaborationOptions) {
  const { projectId, ...eventHandlers } = options;
  const currentUser = useAuthStore(state => state.user);
  const {
    initializeCollaboration,
    clearCollaboration,
    updateCollaboratorPresence,
    updateCollaboratorCursor,
    updateCollaboratorSelection,
    updateCollaboratorCircuit,
    lockGate,
    unlockGate,
    addCollaborator,
    removeCollaborator,
  } = useCollaborationStore();

  const { sendMessage, isConnected, joinRoom, leaveRoom } = useWebSocket({
    endpoint: '/ws/',
    enabled: !!projectId && !!currentUser,
  });

  const eventHandlersRef = useRef(eventHandlers);
  useEffect(() => {
    eventHandlersRef.current = eventHandlers;
  }, [eventHandlers]);

  // initialize collaboration on mount
  useEffect(() => {
    if (!projectId || !currentUser) return;

    const initializeAsync = async () => {
      try {
        // fetch project role and collaborators
        const [roleResponse, collaborators] = await Promise.all([
          collaborationApi.getMyRole(projectId),
          collaborationApi.getCollaborators(projectId),
        ]);

        initializeCollaboration(projectId, roleResponse.role as any, collaborators);
      } catch (error) {
        console.error('failed to initialize collaboration:', error);
      }
    };

    void initializeAsync();

    return () => {
      clearCollaboration();
    };
  }, [projectId, currentUser, initializeCollaboration, clearCollaboration]);

  // join project room
  useEffect(() => {
    if (!projectId || !isConnected) return;

    joinRoom(`project:${projectId}`);

    // announce presence
    sendCollaborationEvent({
      type: 'user_joined',
      user_id: currentUser!.id,
      user_name: getUserDisplayName(),
      user_color: '', // will be assigned by others
      project_id: projectId,
      timestamp: Date.now(),
    });

    return () => {
      // announce leaving
      sendCollaborationEvent({
        type: 'user_left',
        user_id: currentUser!.id,
        user_name: getUserDisplayName(),
        user_color: '',
        project_id: projectId,
        timestamp: Date.now(),
      });
      
      leaveRoom(`project:${projectId}`);
    };
  }, [projectId, isConnected, currentUser, joinRoom, leaveRoom]);

  // handle incoming collaboration events
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type !== 'collaboration_event') return;
      if (message.project_id !== projectId) return;

      const event = message.event as AnyCollaborationEvent;
      
      // ignore own events
      if (event.user_id === currentUser?.id) return;

      handleCollaborationEvent(event);
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [projectId, currentUser?.id]);

  const handleCollaborationEvent = useCallback((event: AnyCollaborationEvent) => {
    switch (event.type) {
      case 'user_joined': {
        const userEvent = event as UserPresenceEvent;
        updateCollaboratorPresence(userEvent.user_id, true);
        break;
      }
      case 'user_left': {
        const userEvent = event as UserPresenceEvent;
        updateCollaboratorPresence(userEvent.user_id, false);
        break;
      }
      case 'cursor_move': {
        const cursorEvent = event as CursorMoveEvent;
        updateCollaboratorCursor(cursorEvent.user_id, cursorEvent.x, cursorEvent.y, cursorEvent.circuit_id);
        break;
      }
      case 'gate_selected': {
        const selectEvent = event as GateSelectedEvent;
        updateCollaboratorSelection(selectEvent.user_id, selectEvent.gate_ids, selectEvent.circuit_id);
        break;
      }
      case 'gate_added':
        eventHandlersRef.current.onGateAdded?.(event as GateOperationEvent);
        break;
      case 'gate_moved':
        eventHandlersRef.current.onGateMoved?.(event as GateOperationEvent);
        break;
      case 'gate_deleted':
        eventHandlersRef.current.onGateDeleted?.(event as GateOperationEvent);
        break;
      case 'gate_updated':
        eventHandlersRef.current.onGateUpdated?.(event as GateOperationEvent);
        break;
      case 'gate_grouped':
        eventHandlersRef.current.onGateGrouped?.(event as GateGroupEvent);
        break;
      case 'gate_ungrouped':
        eventHandlersRef.current.onGateUngrouped?.(event as GateGroupEvent);
        break;
      case 'circuit_added':
        eventHandlersRef.current.onCircuitAdded?.(event as CircuitEvent);
        break;
      case 'circuit_removed':
        eventHandlersRef.current.onCircuitRemoved?.(event as CircuitEvent);
        break;
      case 'circuit_renamed':
        eventHandlersRef.current.onCircuitRenamed?.(event as CircuitEvent);
        break;
      case 'circuit_switched': {
        const circuitEvent = event as CircuitEvent;
        updateCollaboratorCircuit(circuitEvent.user_id, circuitEvent.circuit_id);
        break;
      }
      case 'execution_started':
        eventHandlersRef.current.onExecutionStarted?.(event as ExecutionEvent);
        break;
      case 'execution_progress':
        eventHandlersRef.current.onExecutionProgress?.(event as ExecutionEvent);
        break;
      case 'execution_completed':
        eventHandlersRef.current.onExecutionCompleted?.(event as ExecutionEvent);
        break;
      case 'project_renamed':
        eventHandlersRef.current.onProjectRenamed?.(event as ProjectRenamedEvent);
        break;
      case 'gate_locked': {
        const lockEvent = event as GateLockEvent;
        lockGate(lockEvent.gate_id, lockEvent.user_id, lockEvent.user_name, lockEvent.user_color);
        break;
      }
      case 'gate_unlocked': {
        const unlockEvent = event as GateLockEvent;
        unlockGate(unlockEvent.gate_id);
        break;
      }
    }
  }, [
    updateCollaboratorPresence,
    updateCollaboratorCursor,
    updateCollaboratorSelection,
    updateCollaboratorCircuit,
    lockGate,
    unlockGate,
  ]);

  const getUserDisplayName = useCallback(() => {
    if (!currentUser) return 'Anonymous';
    if (currentUser.first_name && currentUser.last_name) {
      return `${currentUser.first_name} ${currentUser.last_name}`;
    }
    return currentUser.email;
  }, [currentUser]);

  const sendCollaborationEvent = useCallback((event: Partial<AnyCollaborationEvent>) => {
    if (!isConnected || !currentUser) return;

    const fullEvent: AnyCollaborationEvent = {
      ...event,
      user_id: currentUser.id,
      user_name: getUserDisplayName(),
      user_color: '', // assigned by store
      project_id: projectId,
      timestamp: Date.now(),
    } as AnyCollaborationEvent;

    sendMessage({
      type: 'collaboration_event',
      project_id: projectId,
      event: fullEvent,
    });
  }, [isConnected, currentUser, projectId, getUserDisplayName, sendMessage]);

  // public methods for sending events
  const broadcastCursorMove = useCallback((x: number, y: number, circuitId: string) => {
    sendCollaborationEvent({
      type: 'cursor_move',
      x,
      y,
      circuit_id: circuitId,
    } as CursorMoveEvent);
  }, [sendCollaborationEvent]);

  const broadcastGateSelected = useCallback((gateIds: string[], circuitId: string) => {
    sendCollaborationEvent({
      type: 'gate_selected',
      gate_ids: gateIds,
      circuit_id: circuitId,
    } as GateSelectedEvent);
  }, [sendCollaborationEvent]);

  const broadcastGateOperation = useCallback((
    type: 'gate_added' | 'gate_moved' | 'gate_deleted' | 'gate_updated',
    gateId: string,
    circuitId: string,
    gateData?: any
  ) => {
    sendCollaborationEvent({
      type,
      gate_id: gateId,
      circuit_id: circuitId,
      gate_data: gateData,
    } as GateOperationEvent);
  }, [sendCollaborationEvent]);

  const broadcastGateGroup = useCallback((
    type: 'gate_grouped' | 'gate_ungrouped',
    gateIds: string[],
    circuitId: string,
    groupId?: string
  ) => {
    sendCollaborationEvent({
      type,
      gate_ids: gateIds,
      circuit_id: circuitId,
      group_id: groupId,
    } as GateGroupEvent);
  }, [sendCollaborationEvent]);

  const broadcastCircuitEvent = useCallback((
    type: 'circuit_added' | 'circuit_removed' | 'circuit_renamed' | 'circuit_switched',
    circuitId: string,
    circuitName?: string
  ) => {
    sendCollaborationEvent({
      type,
      circuit_id: circuitId,
      circuit_name: circuitName,
    } as CircuitEvent);
  }, [sendCollaborationEvent]);

  const broadcastExecutionEvent = useCallback((
    type: 'execution_started' | 'execution_progress' | 'execution_completed',
    circuitId: string,
    progress?: number,
    status?: string
  ) => {
    sendCollaborationEvent({
      type,
      circuit_id: circuitId,
      progress,
      status,
    } as ExecutionEvent);
  }, [sendCollaborationEvent]);

  const broadcastProjectRenamed = useCallback((projectName: string) => {
    sendCollaborationEvent({
      type: 'project_renamed',
      project_name: projectName,
    } as ProjectRenamedEvent);
  }, [sendCollaborationEvent]);

  const broadcastGateLock = useCallback((gateId: string, circuitId: string, lock: boolean) => {
    if (!currentUser) return;
    
    sendCollaborationEvent({
      type: lock ? 'gate_locked' : 'gate_unlocked',
      gate_id: gateId,
      circuit_id: circuitId,
    } as GateLockEvent);
  }, [sendCollaborationEvent, currentUser]);

  return {
    isConnected,
    broadcastCursorMove,
    broadcastGateSelected,
    broadcastGateOperation,
    broadcastGateGroup,
    broadcastCircuitEvent,
    broadcastExecutionEvent,
    broadcastProjectRenamed,
    broadcastGateLock,
  };
}

