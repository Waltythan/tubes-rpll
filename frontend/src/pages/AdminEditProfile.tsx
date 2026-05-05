import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/common/Button'
import ErrorAlert from '../components/common/ErrorAlert'
import SkeletonLoader from '../components/common/SkeletonLoader'
import { showToast } from '../components/common/ToastContainer'
import Input from '../components/Input'
import { useLoading } from '../hooks/useLoading'
import { hrService, type ProfileItem, type ProfileUpdateInput } from '../services/hrService'

interface ProfileFormState {
  full_name: string
  email: string
  role: string
  phone_number: string
  address: string
  profile_picture_url: string
}

function toFormState(profile: ProfileItem | null): ProfileFormState {
  return {
    full_name: profile?.full_name || '',
    email: profile?.email || '',
    role: profile?.role || '',
    phone_number: profile?.phone_number || '',
    address: profile?.address || '',
    profile_picture_url: profile?.profile_picture_url || '',
  }
}

export default function AdminEditProfile(): JSX.Element {
  const { userId: userIdParam } = useParams()
  const navigate = useNavigate()
  const { withLoading } = useLoading()
  const [profile, setProfile] = useState<ProfileFormState>(toFormState(null))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const userId = Number(userIdParam)

  useEffect(() => {
    let isMounted = true

    async function fetchProfile(): Promise<void> {
      if (!Number.isInteger(userId) || userId <= 0) {
        setError('Invalid user id')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const profileData = await hrService.getUserProfile(userId)

        if (!isMounted) return

        if (!profileData) {
          setError('User profile not found')
          setProfile(toFormState(null))
          return
        }

        setProfile(toFormState(profileData))
      } catch (err: unknown) {
        if (isMounted) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to load profile'
          setError(errorMsg)
          setProfile(toFormState(null))
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void fetchProfile()

    return () => {
      isMounted = false
    }
  }, [userId])

  async function save(): Promise<void> {
    if (!Number.isInteger(userId) || userId <= 0) {
      setError('Invalid user id')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    const payload: ProfileUpdateInput = {
      full_name: profile.full_name || undefined,
      address: profile.address || undefined,
      phone_number: profile.phone_number || undefined,
      profile_picture_url: profile.profile_picture_url || undefined,
    }

    try {
      await withLoading(() => hrService.updateUserProfile(userId, payload))
      setSuccess('Profile updated successfully')
      showToast('Profile updated successfully', 'success')
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update profile'
      setError(errorMsg)
      showToast(errorMsg, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page-stack">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Admin</p>
            <h2>Edit profile</h2>
            <p className="muted">Manage another user profile.</p>
          </div>
        </div>
        <Card>
          <SkeletonLoader lines={6} height={20} />
        </Card>
      </div>
    )
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Edit profile</h2>
          <p className="muted">Update profile details for another user.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => navigate('/users')}>
          Back to Users
        </Button>
      </div>

      <Card>
        <form className="form-grid" onSubmit={(event) => { event.preventDefault(); void save() }}>
          <ErrorAlert error={error} onDismiss={() => setError(null)} />

          <div className="grid grid-2">
            <Input
              label="Full Name"
              value={profile.full_name}
              onChange={(event) => setProfile({ ...profile, full_name: event.target.value })}
              placeholder="User full name"
            />
            <Input label="Email" value={profile.email} disabled />
          </div>

          <Input label="Role" value={profile.role} disabled />

          <div className="grid grid-2">
            <Input
              label="Address"
              placeholder="Street address"
              value={profile.address}
              onChange={(event) => setProfile({ ...profile, address: event.target.value })}
            />
            <Input
              label="Phone"
              placeholder="Phone number"
              value={profile.phone_number}
              onChange={(event) => setProfile({ ...profile, phone_number: event.target.value })}
            />
          </div>

          <Input
            label="Profile picture URL"
            placeholder="https://..."
            value={profile.profile_picture_url}
            onChange={(event) => setProfile({ ...profile, profile_picture_url: event.target.value })}
          />

          {success && <div className="alert alert-success">{success}</div>}

          <div className="form-actions">
            <Button type="submit" variant="primary" loading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}