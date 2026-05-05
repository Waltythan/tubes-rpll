import { useEffect, useState } from 'react'
import Button from '../components/common/Button'
import Button from '../components/Button'
import Card from '../components/Card'
import ErrorAlert from '../components/common/ErrorAlert'
import SkeletonLoader from '../components/common/SkeletonLoader'
import { showToast } from '../components/common/ToastContainer'
import Input from '../components/Input'
import { useAuth } from '../hooks/useAuth'
import { useLoading } from '../hooks/useLoading'
import api from '../services/api'

interface ProfileData {
  user_id?: number
  full_name?: string
  email?: string
  phone_number?: string
  address?: string
  profile_picture_url?: string
  birth_date?: string
  bank_account_details?: string
}

export default function Profile(): JSX.Element {
  const { user, updateUser } = useAuth()
  const { withLoading } = useLoading()
  const [profile, setProfile] = useState<ProfileData>({
    address: '',
    phone_number: '',
    profile_picture_url: '',
  })
  const [initialProfile, setInitialProfile] = useState<ProfileData>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Fetch profile data on mount
  useEffect(() => {
    let isMounted = true

    async function fetchProfile(): Promise<void> {
      try {
        setLoading(true)
        setError(null)
        const response = await api.get<{ data: { data: ProfileData } }>('/profiles/me')
        const profileData = response.data.data

        if (isMounted) {
          if (profileData) {
            setProfile({
              user_id: profileData.user_id,
              full_name: profileData.full_name || '',
              phone_number: profileData.phone_number || '',
              address: profileData.address || '',
              profile_picture_url: profileData.profile_picture_url || '',
              birth_date: profileData.birth_date || '',
              bank_account_details: profileData.bank_account_details || '',
              email: user?.email || '',
            })
            setInitialProfile({
              user_id: profileData.user_id,
              full_name: profileData.full_name || '',
              phone_number: profileData.phone_number || '',
              address: profileData.address || '',
              profile_picture_url: profileData.profile_picture_url || '',
              birth_date: profileData.birth_date || '',
              bank_account_details: profileData.bank_account_details || '',
              email: user?.email || '',
            })
          } else {
            // Handle empty profile - initialize with user email
            setProfile({
              full_name: user?.name || user?.fullName || user?.email || '',
              email: user?.email || '',
              phone_number: '',
              address: '',
              profile_picture_url: '',
              birth_date: '',
              bank_account_details: '',
            })
            setInitialProfile({
              full_name: user?.name || user?.fullName || user?.email || '',
              email: user?.email || '',
              phone_number: '',
              address: '',
              profile_picture_url: '',
              birth_date: '',
              bank_account_details: '',
            })
          }
        }
      } catch (e: unknown) {
        if (isMounted) {
          const errorMsg = e instanceof Error ? e.message : 'Failed to load profile'
          setError(errorMsg)
          // Set fallback profile on error
          setProfile({
            full_name: user?.name || user?.fullName || user?.email || '',
            email: user?.email || '',
            phone_number: '',
            address: '',
            profile_picture_url: '',
          })
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    if (user) {
      void fetchProfile()
    } else {
      setLoading(false)
    }

    return () => {
      isMounted = false
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
      
      showToast('Profile updated successfully!', 'success')
      
      // Update user in auth context if name changed
      if (profile.full_name && profile.full_name !== initialProfile.full_name) {
        updateUser(user ? { ...user, name: profile.full_name, fullName: profile.full_name } : user)
      }
      
      // Update initial profile to reflect saved state
      setInitialProfile({ ...profile })
      
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to update profile'
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
            <p className="eyebrow">Profile</p>
            <h2>Personal information</h2>
            <p className="muted">Keep your profile details up to date.</p>
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
          <p className="eyebrow">Profile</p>
          <h2>Personal information</h2>
          <p className="muted">Keep your profile details up to date.</p>
        </div>
      </div>

      <Card>
        <form className="form-grid" onSubmit={(event) => { event.preventDefault(); void save() }}>
          <ErrorAlert error={error} onDismiss={() => setError(null)} />
          
          <div className="grid grid-2">
            <Input 
              label="Full Name" 
              value={profile.full_name || ''} 
              onChange={(event) => setProfile({ ...profile, full_name: event.target.value })} 
              placeholder="Your full name" 
            />
            <Input label="Email" value={profile.email || ''} disabled />
          </div>

          <div className="grid grid-2">
            <Input 
              label="Address" 
              placeholder="Street address" 
              value={profile.address || ''} 
              onChange={(event) => setProfile({ ...profile, address: event.target.value })} 
            />
            <Input 
              label="Phone" 
              placeholder="Phone number" 
              value={profile.phone_number || ''} 
              onChange={(event) => setProfile({ ...profile, phone_number: event.target.value })} 
            />
          </div>

          <div className="grid grid-2">
            <Input 
              label="Birth Date" 
              type="date"
              value={profile.birth_date || ''} 
              onChange={(event) => setProfile({ ...profile, birth_date: event.target.value })} 
            />
            <Input
              label="Profile picture URL"
              placeholder="https://..."
              value={profile.profile_picture_url || ''}
              onChange={(event) => setProfile({ ...profile, profile_picture_url: event.target.value })}
            />
          </div>

          <Input
            label="Bank Account Details"
            placeholder="Account information"
            value={profile.bank_account_details || ''}
            onChange={(event) => setProfile({ ...profile, bank_account_details: event.target.value })}
          />


          <div className="form-actions">
            <Button type="submit" variant="primary" loading={saving}>Save changes</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}