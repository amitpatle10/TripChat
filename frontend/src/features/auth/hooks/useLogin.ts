import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { connectStomp } from '@/lib/stompClient'
import { authApi } from '../api'

// Handles the success side of login: store auth state, open WebSocket, redirect.
// Error handling (setError on the form) stays in the form component — it's a UI concern.
// Order matters: setAuth must run before navigate so ProtectedRoute sees the token.
export function useLogin() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data.user, data.token)   // 1. token in Zustand — ProtectedRoute unblocks
      connectStomp(data.token)         // 2. WebSocket session opens with fresh JWT
      navigate('/groups', { replace: true }) // 3. redirect — replace so back button skips login
    },
  })
}
