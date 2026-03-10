import { useEffect } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { connectStomp, stompClient } from '@/lib/stompClient'
import LoginPage from '@/features/auth/components/LoginPage'
import RegisterPage from '@/features/auth/components/RegisterPage'
import GroupListPage from '@/features/groups/components/GroupListPage'
import ChatPage from '@/features/chat/components/ChatPage'
import { ErrorFallback } from '@/components/ErrorBoundary'

// Wraps all authenticated routes.
// Reads token synchronously from Zustand (which rehydrates from localStorage).
// No token → redirect to /login, preserving the attempted URL in `state`.
function ProtectedRoute() {
  const token = useAuthStore((s) => s.token)

  // On a fresh login, useLogin calls connectStomp(). But on a page reload,
  // Zustand rehydrates the token from localStorage without calling connectStomp().
  // This effect bridges that gap — if a token exists but the STOMP client is not
  // yet active, activate it now so subscriptions and sends work immediately.
  useEffect(() => {
    if (token && !stompClient.active) {
      connectStomp(token)
    }
  }, [token])

  if (!token) return <Navigate to="/login" replace />
  return <Outlet />
}

export const router = createBrowserRouter([
  // Root and unknown paths always land on login — no ProtectedRoute involved.
  { path: '/',  element: <Navigate to="/login" replace /> },
  { path: '*',  element: <Navigate to="/login" replace /> },

  { path: '/login',    element: <LoginPage />,    errorElement: <ErrorFallback /> },
  { path: '/register', element: <RegisterPage />, errorElement: <ErrorFallback /> },
  {
    // All children share the ProtectedRoute guard.
    // errorElement here covers GroupListPage, ChatPage, and ProtectedRoute itself.
    element: <ProtectedRoute />,
    errorElement: <ErrorFallback />,
    children: [
      { path: '/groups',             element: <GroupListPage /> },
      { path: '/groups/:groupId',    element: <ChatPage /> },
    ],
  },
])
