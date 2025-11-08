import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore.ts';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, accessToken, loadUser } = useAuthStore();

  useEffect(() => {
    if (accessToken && !useAuthStore.getState().user) {
      void loadUser();
    }
  }, [accessToken, loadUser]);

  if (!isAuthenticated || !accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
