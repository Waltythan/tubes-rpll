import { useEffect, useState } from 'react'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import { useAuth } from '../hooks/useAuth'
import { useLoading } from '../hooks/useLoading'
import api from '../services/api'

export default function Profile(): JSX.Element {
  const { user, updateUser } = useAuth()
  const { withLoading } = useLoading()
  const [profile, setProfile] = useState<{ email?: string; name?: string; address: string; phone_number: string; profile_picture_url: string }>({
    address: '',
    phone_number: '',
    profile_picture_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setProfile((current) => ({ ...current, email: user.email, name: user.name || user.fullName || user.email }))
    }
  }, [user])

  async function save(): Promise<void> {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const payload = {
        address: profile.address || undefined,
        phone_number: profile.phone_number || undefined,
        profile_picture_url: profile.profile_picture_url || undefined,
      }
      await withLoading(() => api.patch('/profiles/me', payload))
      updateUser(user ? { ...user, name: profile.name || user.name, fullName: profile.name || user.fullName } : user)
      setSuccess('Profile updated successfully.')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Profile</p>
          <h2>Personal information</h2>
          <p className="muted">Keep your profile details up to date.</p>
        </div>
      </div>

      <Card>
        <form className="form-grid" onSubmit={(event) => { event.preventDefault(); void save() }}>
          <div className="grid grid-2">
            <Input label="Full Name" value={profile.name || ''} onChange={(event) => setProfile({ ...profile, name: event.target.value })} placeholder="Your full name" />
            <Input label="Email" value={profile.email || ''} disabled />
          </div>

          <div className="grid grid-2">
            <Input label="Address" placeholder="Street address" value={profile.address} onChange={(event) => setProfile({ ...profile, address: event.target.value })} />
            <Input label="Phone" placeholder="Phone number" value={profile.phone_number} onChange={(event) => setProfile({ ...profile, phone_number: event.target.value })} />
          </div>

          <Input
            label="Profile picture URL"
            placeholder="https://..."
            value={profile.profile_picture_url}
            onChange={(event) => setProfile({ ...profile, profile_picture_url: event.target.value })}
          />

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <div className="form-actions">
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}