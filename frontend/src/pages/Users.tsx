import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/common/Button'
import ErrorAlert from '../components/common/ErrorAlert'
import Input from '../components/common/Input'
import { showToast } from '../components/common/ToastContainer'
import { hrService, type DepartmentItem, type UserItem } from '../services/hrService'

function getUserId(user: UserItem): number | null {
  const raw = user.user_id ?? user.id
  return typeof raw === 'number' ? raw : null
}

function getUserLabel(user: UserItem): string {
  return user.name || user.full_name || user.fullName || user.email || `#${getUserId(user) || 'unknown'}`
}

export default function Users(): JSX.Element {
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserItem[]>([])
  const [managers, setManagers] = useState<UserItem[]>([])
  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing] = useState<UserItem | null>(null)
  const nameRef = useRef<HTMLInputElement | null>(null)
  const emailRef = useRef<HTMLInputElement | null>(null)
  const passwordRef = useRef<HTMLInputElement | null>(null)
  const roleRef = useRef<HTMLSelectElement | null>(null)
  const managerRef = useRef<HTMLSelectElement | null>(null)
  const departmentRef = useRef<HTMLSelectElement | null>(null)
  const baseSalaryRef = useRef<HTMLInputElement | null>(null)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)

  const managerLookup = useMemo(() => {
    const map = new Map<number, string>()
    for (const manager of managers) {
      const id = getUserId(manager)
      if (id != null) {
        map.set(id, getUserLabel(manager))
      }
    }
    return map
  }, [managers])

  const departmentLookup = useMemo(() => {
    const map = new Map<number, string>()
    for (const dep of departments) {
      map.set(dep.dep_id, `${dep.name} (${dep.code})`)
    }
    return map
  }, [departments])

  function getUserBaseSalary(user?: UserItem | null): number | null {
    if (!user) return null
    const raw: any = user as any
    const val = raw.base_salary ?? raw.baseSalary ?? null
    if (val === null || val === undefined || val === '') return null
    const n = Number(val)
    return Number.isFinite(n) ? n : null
  }

  async function loadData(): Promise<void> {
    try {
      setLoading(true)
      const [usersData, managersData, departmentsData] = await Promise.all([
        hrService.getUsers(),
        hrService.getManagers(),
        hrService.getDepartments(),
      ])

      setUsers(usersData || [])
      setManagers(managersData || [])
      setDepartments(departmentsData || [])
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadData() }, [])

  function openCreate() {
    setEditing(null)
    setIsFormOpen(true)
    setSelectedRole('staff')
    setTimeout(() => nameRef.current?.focus(), 60)
  }

  function openEdit(user: UserItem) {
    setEditing(user)
    setIsFormOpen(true)
    setSelectedRole(user.role || 'staff')
    setTimeout(() => nameRef.current?.focus(), 60)
  }

  function openEditProfile(user: UserItem) {
    const userId = getUserId(user)
    if (!userId) return

    navigate(`/admin/profiles/${userId}`)
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    setSubmitting(true)
    setError(null)

    const nameValue = nameRef.current?.value?.trim()
    const emailValue = emailRef.current?.value?.trim()
    const roleValue = roleRef.current?.value || selectedRole || 'staff'
    const managerValue = managerRef.current?.value
    const departmentValue = departmentRef.current?.value

    const payload: Record<string, unknown> = {
      role: roleValue,
      managerId: managerValue ? Number(managerValue) : null,
      departmentId: departmentValue ? Number(departmentValue) : null,
    }

    const baseSalaryValue = baseSalaryRef.current?.value
    if (baseSalaryValue !== undefined && baseSalaryValue !== '') {
      payload.baseSalary = Number(baseSalaryValue)
    }

    if (nameValue) {
      payload.full_name = nameValue
    }

    if (emailValue) {
      payload.email = emailValue
    }

    const password = passwordRef.current?.value
    if (!editing && password) {
      payload.password = password
    }

    try {
      if (editing) {
        const editId = getUserId(editing)
        if (!editId) {
          throw new Error('Invalid user id')
        }
        await hrService.updateUser(editId, payload)
        showToast('User updated', 'success')
      } else {
        await hrService.createUser(payload)
        showToast('User created', 'success')
      }
      setIsFormOpen(false)
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Request failed'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(user: UserItem) {
    const id = getUserId(user)
    if (!id) return

    const ok = window.confirm('Are you sure you want to delete this user?')
    if (!ok) return

    try {
      await hrService.deleteUser(id)
      showToast('User deleted', 'success')
      await loadData()
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
          <p className="muted">Manage user accounts, department assignments, and reporting lines.</p>
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
              <Input label="Name" ref={nameRef} defaultValue={editing?.name || editing?.full_name || editing?.fullName || ''} />
              <Input label="Email" ref={emailRef} defaultValue={editing?.email || ''} type="email" />
              {!editing && <Input label="Password" ref={passwordRef} type="password" />}
              <label className="field">
                <span className="field-label">Role</span>
                <select className="input" ref={roleRef} defaultValue={editing?.role || editing?.roles || 'staff'} onChange={(e) => setSelectedRole(e.target.value)}>
                  <option value="admin">admin</option>
                  <option value="manager">manager</option>
                  <option value="staff">staff</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">Department</span>
                <select className="input" ref={departmentRef} defaultValue={editing?.department_id || ''}>
                  <option value="">(none)</option>
                  {departments.map((department) => (
                    <option key={department.dep_id} value={department.dep_id}>{department.name} ({department.code})</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Manager</span>
                <select className="input" ref={managerRef} defaultValue={editing?.manager_id || editing?.managerId || ''}>
                  <option value="">(none)</option>
                  {managers.map((manager) => {
                    const managerId = getUserId(manager)
                    if (!managerId) return null
                    return (
                      <option key={managerId} value={managerId}>{getUserLabel(manager)}</option>
                    )
                  })}
                </select>
              </label>
              {(selectedRole === 'manager' || selectedRole === 'staff') && (
                <Input
                  label="Base Salary"
                  ref={baseSalaryRef}
                  type="number"
                  defaultValue={(() => {
                    const v = getUserBaseSalary(editing)
                    return v != null ? String(v) : ''
                  })()}
                />
              )}
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
                <th className="table-header">Base Salary</th>
                <th className="table-header">Department</th>
                <th className="table-header">Manager</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="table-cell">Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="table-cell">No users found</td></tr>
              ) : (
                users.map((user) => {
                  const userId = getUserId(user)
                  const managerId = user.manager_id || user.managerId || null
                  const departmentId = user.department_id || null
                  const managerName = managerId ? managerLookup.get(managerId) || `#${managerId}` : '—'
                  const departmentName = departmentId ? departmentLookup.get(departmentId) || `#${departmentId}` : '—'

                  return (
                    <tr key={userId || user.email}>
                      <td className="table-cell">{getUserLabel(user)}</td>
                      <td className="table-cell">{user.email || '—'}</td>
                      <td className="table-cell">{user.role || user.roles || 'staff'}</td>
                      <td className="table-cell">{(() => {
                        const v = getUserBaseSalary(user)
                        return v != null ? Number(v).toLocaleString() : '—'
                      })()}</td>
                      <td className="table-cell">{departmentName}</td>
                      <td className="table-cell">{managerName}</td>
                      <td className="table-cell">
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button type="button" variant="secondary" onClick={() => openEdit(user)}>Edit</Button>
                          <Button type="button" variant="secondary" onClick={() => openEditProfile(user)}>Edit Profile</Button>
                          <Button type="button" onClick={() => handleDelete(user)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
