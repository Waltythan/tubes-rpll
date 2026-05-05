import { useEffect, useMemo, useRef, useState } from 'react'
import Card from '../components/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import ErrorAlert from '../components/common/ErrorAlert'
import { showToast } from '../components/common/ToastContainer'
import { hrService } from '../services/hrService'

export default function Users(): JSX.Element {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const nameRef = useRef<HTMLInputElement | null>(null)
  const emailRef = useRef<HTMLInputElement | null>(null)
  const passwordRef = useRef<HTMLInputElement | null>(null)
  const roleRef = useRef<HTMLSelectElement | null>(null)
  const managerRef = useRef<HTMLSelectElement | null>(null)

  const managerOptions = useMemo(() => users.filter(u => (u.role || u.roles) === 'manager' || (u.role || u.roles) === 'admin'), [users])

  async function loadUsers(): Promise<void> {
    try {
      setLoading(true)
      const data = await hrService.getUsers()
      setUsers(data || [])
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadUsers() }, [])

  function openCreate() {
    setEditing(null)
    setIsFormOpen(true)
    setTimeout(() => nameRef.current?.focus(), 60)
  }

  function openEdit(user: any) {
    setEditing(user)
    setIsFormOpen(true)
    setTimeout(() => nameRef.current?.focus(), 60)
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    setSubmitting(true)
    setError(null)

    const payload: Record<string, unknown> = {
      name: nameRef.current?.value || undefined,
      email: emailRef.current?.value || undefined,
      role: roleRef.current?.value || 'staff',
      managerId: managerRef.current?.value ? Number(managerRef.current.value) : null,
    }
    const password = passwordRef.current?.value
    if (!editing && password) payload.password = password

    try {
      if (editing) {
        await hrService.updateUser(editing.user_id || editing.id, payload)
        showToast('User updated', 'success')
      } else {
        await hrService.createUser(payload)
        showToast('User created', 'success')
      }
      setIsFormOpen(false)
      await loadUsers()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Request failed'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(user: any) {
    const id = user.user_id || user.id
    if (!id) return
    const ok = window.confirm('Are you sure you want to delete this user?')
    if (!ok) return
    try {
      await hrService.deleteUser(id)
      showToast('User deleted', 'success')
      await loadUsers()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user'
      setError(msg)
      showToast(msg, 'error')
    }
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Users</h2>
          <p className="muted">Manage user accounts and roles</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button type="button" onClick={openCreate}>Create user</Button>
        </div>
      </div>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {isFormOpen && (
        <Card>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: 12 }}>
              <Input label="Name" ref={nameRef} defaultValue={editing?.name || editing?.full_name || ''} />
              <Input label="Email" ref={emailRef} defaultValue={editing?.email || ''} type="email" />
              {!editing && <Input label="Password" ref={passwordRef} type="password" />}
              <label className="field">
                <span className="field-label">Role</span>
                <select className="input" ref={roleRef} defaultValue={editing?.role || editing?.roles || 'staff'}>
                  <option value="admin">admin</option>
                  <option value="manager">manager</option>
                  <option value="staff">staff</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">Manager</span>
                <select className="input" ref={managerRef} defaultValue={editing?.manager_id || ''}>
                  <option value="">(none)</option>
                  {managerOptions.map((m) => (
                    <option key={m.user_id || m.id} value={m.user_id || m.id}>{m.name || m.email}</option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)} disabled={submitting}>Cancel</Button>
                <Button type="submit" loading={submitting}>{editing ? 'Update user' : 'Create user'}</Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="table-container">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header">Email</th>
                <th className="table-header">Role</th>
                <th className="table-header">Manager</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="table-cell">Loading users…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="table-cell">No users found</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.user_id || u.id}>
                    <td className="table-cell">{u.name || u.full_name || '—'}</td>
                    <td className="table-cell">{u.email}</td>
                    <td className="table-cell">{u.role || u.roles || 'staff'}</td>
                    <td className="table-cell">{(users.find(x => (x.user_id || x.id) === (u.manager_id || u.managerId))?.name) || (u.manager_id ? `#${u.manager_id}` : '—')}</td>
                    <td className="table-cell">
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button type="button" variant="secondary" onClick={() => openEdit(u)}>Edit</Button>
                        <Button type="button" onClick={() => handleDelete(u)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
