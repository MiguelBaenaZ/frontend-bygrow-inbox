import { Navigate, Route, Routes } from 'react-router-dom'

import { LoginPage } from '@/features/auth/login-page'
import { RequireAdmin } from '@/features/auth/require-admin'
import { RequireAuth } from '@/features/auth/require-auth'
import { InboxPage } from '@/features/inbox/inbox-page'
import { AppShell } from '@/features/layout/app-shell'
import { NotFoundPage } from '@/features/not-found/not-found-page'
import { SettingsPage } from '@/features/settings/settings-page'
import { UsersPage } from '@/features/users/users-page'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/inbox" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/inbox/:chatId" element={<InboxPage />} />
          <Route element={<RequireAdmin />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
