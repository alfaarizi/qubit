import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collaborationService } from '@/services/collaborationService';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useComposer } from '@/features/composer/ComposerStoreContext';
import { getCollaboratorColor } from '@/features/collaboration/utils';

interface UseCollaborationOptions {
    userEmail: string;
    enabled?: boolean;
}

export function useCollaboration({ userEmail, enabled = true }: UseCollaborationOptions) {
    const { projectId } = useParams<{ projectId: string }>();
    const { activeCircuitId } = useComposer();
    const { addCollaborator, updateCollaborator, removeCollaborator, setCollaborators } = useCollaborationStore();

    useEffect(() => {
        if (!enabled || !projectId || !userEmail) {
            return;
        }

        // Connect to WebSocket
        collaborationService.connect(projectId, userEmail);

        // Handle connection established
        const handleConnectionEstablished = (data: { connection_id: string }) => {
            console.log('[Collaboration] Connection established:', data.connection_id);
        };

        // Handle collaborator updates
        const handleCollaboratorUpdate = (data: { data: { id?: string; email: string; role: string; activeCircuitId?: string; isOnline?: boolean } }) => {
            const collaboratorData = data.data;
            if (collaboratorData.email === userEmail) return;

            const existingCollaborators = useCollaborationStore.getState().collaborators;
            const existingIndex = existingCollaborators.findIndex(c => c.email === collaboratorData.email);
            const color = existingIndex >= 0 ? existingCollaborators[existingIndex].color : getCollaboratorColor(existingCollaborators.length);

            if (collaboratorData.id) {
                updateCollaborator(collaboratorData.id, { ...collaboratorData, color });
            } else {
                addCollaborator({
                    id: crypto.randomUUID(),
                    email: collaboratorData.email,
                    role: collaboratorData.role as 'owner' | 'editor' | 'viewer',
                    color,
                    isOnline: collaboratorData.isOnline ?? true,
                    activeCircuitId: collaboratorData.activeCircuitId,
                });
            }
        };

        // Handle circuit changes
        const handleCircuitChange = (data: { user_id: string; active_circuit_id: string }) => {
            if (data.user_id === userEmail) return;

            updateCollaborator(data.user_id, {
                activeCircuitId: data.active_circuit_id,
                isOnline: true,
            });
        };

        // Handle user connections/disconnections
        const handleConnectionUpdate = (data: { event: string; connection_id: string }) => {
            if (data.event === 'user_disconnected') {
                removeCollaborator(data.connection_id);
            }
        };

        // Register handlers
        collaborationService.on('connection_established', handleConnectionEstablished);
        collaborationService.on('collaborator_update', handleCollaboratorUpdate);
        collaborationService.on('circuit_change', handleCircuitChange);
        collaborationService.on('connection_update', handleConnectionUpdate);

        // Announce presence
        collaborationService.sendCollaboratorUpdate({
            email: userEmail,
            isOnline: true,
            activeCircuitId,
        });

        // Cleanup
        return () => {
            collaborationService.off('connection_established', handleConnectionEstablished);
            collaborationService.off('collaborator_update', handleCollaboratorUpdate);
            collaborationService.off('circuit_change', handleCircuitChange);
            collaborationService.off('connection_update', handleConnectionUpdate);
            collaborationService.disconnect();
            setCollaborators([]);
        };
    }, [enabled, projectId, userEmail, addCollaborator, updateCollaborator, removeCollaborator, setCollaborators, activeCircuitId]);

    // Notify circuit changes
    useEffect(() => {
        if (!enabled || !projectId || !activeCircuitId) return;

        collaborationService.sendCircuitChange(activeCircuitId, activeCircuitId);
    }, [enabled, projectId, activeCircuitId]);

    return {
        sendCollaboratorUpdate: collaborationService.sendCollaboratorUpdate.bind(collaborationService),
        sendAction: collaborationService.sendAction.bind(collaborationService),
    };
}
