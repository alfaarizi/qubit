import { useCallback } from 'react';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { toast } from 'sonner';

export function usePermissionGuard() {
  const canEdit = useCollaborationStore(state => state.canEdit());
  const isOwner = useCollaborationStore(state => state.isOwner());

  const guardEdit = useCallback(<T extends any[]>(
    action: (...args: T) => void,
    customMessage?: string
  ) => {
    return (...args: T) => {
      if (!canEdit) {
        toast.error(customMessage || 'You only have view access to this project');
        return;
      }
      action(...args);
    };
  }, [canEdit]);

  const guardOwner = useCallback(<T extends any[]>(
    action: (...args: T) => void,
    customMessage?: string
  ) => {
    return (...args: T) => {
      if (!isOwner) {
        toast.error(customMessage || 'Only the project owner can perform this action');
        return;
      }
      action(...args);
    };
  }, [isOwner]);

  const checkCanEdit = useCallback((showToast = true): boolean => {
    if (!canEdit && showToast) {
      toast.error('You only have view access to this project');
    }
    return canEdit;
  }, [canEdit]);

  const checkIsOwner = useCallback((showToast = true): boolean => {
    if (!isOwner && showToast) {
      toast.error('Only the project owner can perform this action');
    }
    return isOwner;
  }, [isOwner]);

  return {
    canEdit,
    isOwner,
    guardEdit,
    guardOwner,
    checkCanEdit,
    checkIsOwner,
  };
}

