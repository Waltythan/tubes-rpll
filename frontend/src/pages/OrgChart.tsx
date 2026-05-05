import { useEffect, useMemo, useState } from 'react'
import Card from '../components/Card'
import EmptyState from '../components/common/EmptyState'
import ErrorAlert from '../components/common/ErrorAlert'
import { hrService, type DepartmentItem, type UserItem } from '../services/hrService'

function getUserId(user: UserItem): number | null {
  const raw = user.user_id ?? user.id
  return typeof raw === 'number' ? raw : null
}

function getUserName(user: UserItem): string {
  return user.name || user.full_name || user.fullName || user.email || `#${getUserId(user) || 'unknown'}`
}

function getRole(user: UserItem): string {
  return String(user.role || user.roles || 'staff').toLowerCase()
}

export default function OrgChart(): JSX.Element {
  const [users, setUsers] = useState<UserItem[]>([])
  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load(): Promise<void> {
      try {
        setLoading(true)
        const [usersData, departmentData] = await Promise.all([
          hrService.getUsers(),
          hrService.getDepartments(),
        ])
        if (!active) return

        setUsers(usersData || [])
        setDepartments(departmentData || [])
        setError(null)
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load management tree')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const departmentMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const dep of departments) {
      map.set(dep.dep_id, `${dep.name} (${dep.code})`)
    }
    return map
  }, [departments])

  const managers = useMemo(
    () => users.filter((user) => ['manager', 'admin'].includes(getRole(user))),
    [users]
  )

  const staff = useMemo(
    () => users.filter((user) => getRole(user) === 'staff'),
    [users]
  )

  const groups = useMemo(() => {
    return managers.map((manager) => {
      const managerId = getUserId(manager)
      const managerDepartmentId = manager.department_id ?? null

      const members = staff.filter((member) => {
        if (!managerId) return false
        const directManagerMatch = member.manager_id === managerId || member.managerId === managerId
        const sameDepartment = managerDepartmentId != null
          && member.department_id != null
          && member.department_id === managerDepartmentId
        return directManagerMatch || sameDepartment
      })

      return {
        manager,
        members,
      }
    })
  }, [managers, staff])

  const assignedStaffIds = useMemo(() => {
    const ids = new Set<number>()
    for (const group of groups) {
      for (const member of group.members) {
        const memberId = getUserId(member)
        if (memberId != null) {
          ids.add(memberId)
        }
      }
    }
    return ids
  }, [groups])

  const unassignedStaff = useMemo(
    () => staff.filter((member) => {
      const memberId = getUserId(member)
      return memberId == null || !assignedStaffIds.has(memberId)
    }),
    [assignedStaffIds, staff]
  )

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Organization</p>
          <h2>Management tree</h2>
          <p className="muted">Hierarchy grouped by manager with department context.</p>
        </div>
      </div>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {loading ? (
        <Card>
          <p className="card-title">Loading management hierarchy...</p>
        </Card>
      ) : groups.length === 0 ? (
        <Card>
          <EmptyState
            title="No management hierarchy found"
            description="Create manager and staff relationships to populate this view."
          />
        </Card>
      ) : (
        <div className="grid grid-2">
          {groups.map((group) => {
            const managerId = getUserId(group.manager)
            const managerDepartment = group.manager.department_id
              ? departmentMap.get(group.manager.department_id) || `Department #${group.manager.department_id}`
              : 'No department'

            return (
              <Card key={managerId || getUserName(group.manager)}>
                <div className="section-header">
                  <div>
                    <p className="eyebrow">Manager</p>
                    <h3>{getUserName(group.manager)}</h3>
                    <p className="muted">{group.manager.email || 'No email'} · {managerDepartment}</p>
                  </div>
                </div>

                {group.members.length === 0 ? (
                  <p className="muted">No team members assigned.</p>
                ) : (
                  <div className="stacked-cards">
                    {group.members.map((member) => {
                      const memberDepartment = member.department_id
                        ? departmentMap.get(member.department_id) || `Department #${member.department_id}`
                        : 'No department'
                      return (
                        <div key={getUserId(member) || member.email} className="status-row">
                          <span>{getUserName(member)}</span>
                          <strong>{memberDepartment}</strong>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })}

          {unassignedStaff.length > 0 && (
            <Card>
              <div className="section-header">
                <div>
                  <p className="eyebrow">Needs Assignment</p>
                  <h3>Unassigned staff</h3>
                </div>
              </div>
              <div className="stacked-cards">
                {unassignedStaff.map((member) => (
                  <div key={getUserId(member) || member.email} className="status-row">
                    <span>{getUserName(member)}</span>
                    <strong>{member.email || 'No email'}</strong>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
