import { useEffect, useState } from 'react'
import Card from '../components/Card'
import ErrorAlert from '../components/common/ErrorAlert'
import EmptyState from '../components/common/EmptyState'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useLoading } from '../hooks/useLoading'
import api from '../services/api'

interface User {
  id: number
  email?: string
  full_name?: string
  fullName?: string
  role?: string
  departmentId?: number
  createdAt?: string
}

interface UsersResponse {
  rows: User[]
}

export default function Users(): JSX.Element {
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState<string | null>(null)
  const { loading } = useLoading()

  useEffect(() => {
    let active = true

    async function load(): Promise<void> {
      try {
        setError(null)
        const response = await api.get<{ data: UsersResponse }>('/users')
        if (active) {
          setUsers(response.data.data.rows || [])
        }
      } catch (err: unknown) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load users')
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  function getRoleColor(role: string | undefined): string {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'var(--color-danger, #dc3545)'
      case 'manager':
        return 'var(--color-warning, #ffc107)'
      default:
        return 'var(--color-primary, #007bff)'
    }
  }

  function getRoleLabel(role: string | undefined): string {
    if (!role) return 'Staff'
    return role.charAt(0).toUpperCase() + role.slice(1)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Users</h2>
        </div>
      </div>

      {error && (
        <ErrorAlert message={error} onDismiss={() => setError(null)} />
      )}

      {users.length === 0 ? (
        <Card>
          <EmptyState title="No users found" subtitle="Users will appear here" />
        </Card>
      ) : (
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.9rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--color-border, #e0e0e0)',
                    backgroundColor: 'var(--color-background-hover, #f9f9f9)',
                  }}
                >
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '1rem',
                      fontWeight: 600,
                      color: 'var(--color-muted, #666)',
                    }}
                  >
                    ID
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '1rem',
                      fontWeight: 600,
                      color: 'var(--color-muted, #666)',
                    }}
                  >
                    Email
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '1rem',
                      fontWeight: 600,
                      color: 'var(--color-muted, #666)',
                    }}
                  >
                    Name
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '1rem',
                      fontWeight: 600,
                      color: 'var(--color-muted, #666)',
                    }}
                  >
                    Role
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: '1px solid var(--color-border, #e0e0e0)',
                    }}
                  >
                    <td
                      style={{
                        padding: '1rem',
                        color: 'var(--color-muted, #666)',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                      }}
                    >
                      <code>#{user.id}</code>
                    </td>
                    <td
                      style={{
                        padding: '1rem',
                        color: 'var(--color-text, #333)',
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                      }}
                    >
                      {user.email || '—'}
                    </td>
                    <td
                      style={{
                        padding: '1rem',
                        color: 'var(--color-text, #333)',
                      }}
                    >
                      {user.full_name || user.fullName || '—'}
                    </td>
                    <td
                      style={{
                        padding: '1rem',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '4px',
                          backgroundColor: `${getRoleColor(user.role)}20`,
                          color: getRoleColor(user.role),
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          textTransform: 'capitalize',
                        }}
                      >
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
