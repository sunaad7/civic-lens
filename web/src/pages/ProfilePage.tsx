import { useState, type FormEvent } from 'react'
import { PasswordField, inputClass, submitClass } from '../components/AuthShell'
import { useAuth } from '../lib/useAuth'
import type { UpdateProfileInput, User } from '../lib/types'

type Notice = { kind: 'success' | 'error'; text: string } | null

export function ProfilePage() {
  const { user, updateProfile } = useAuth()
  if (!user) return null
  return <ProfileForm user={user} updateProfile={updateProfile} />
}

function ProfileForm({
  user,
  updateProfile,
}: {
  user: User
  updateProfile: (input: UpdateProfileInput) => Promise<void>
}) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [phone, setPhone] = useState(user.phone ?? '')
  const [addressLine, setAddressLine] = useState(user.address_line ?? '')
  const [city, setCity] = useState(user.city ?? '')
  const [pincode, setPincode] = useState(user.pincode ?? '')
  const [detailsPassword, setDetailsPassword] = useState('')
  const [detailsNotice, setDetailsNotice] = useState<Notice>(null)
  const [savingDetails, setSavingDetails] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  const emailChanged = email.trim() !== user.email
  const nameChanged = name.trim() !== user.name
  const phoneChanged = phone.trim() !== (user.phone ?? '')
  const addressChanged = addressLine.trim() !== (user.address_line ?? '')
  const cityChanged = city.trim() !== (user.city ?? '')
  const pincodeChanged = pincode.trim() !== (user.pincode ?? '')
  const hasChanges =
    nameChanged || emailChanged || phoneChanged || addressChanged || cityChanged || pincodeChanged

  const onSaveDetails = async (event: FormEvent) => {
    event.preventDefault()
    setDetailsNotice(null)

    if (!hasChanges) {
      setDetailsNotice({ kind: 'error', text: 'Nothing to save — update a field first.' })
      return
    }
    if (emailChanged && !detailsPassword) {
      setDetailsNotice({ kind: 'error', text: 'Enter your current password to change your email.' })
      return
    }

    const input: UpdateProfileInput = {}
    if (nameChanged) input.name = name.trim()
    if (emailChanged) {
      input.email = email.trim()
      input.current_password = detailsPassword
    }
    if (phoneChanged) input.phone = phone.trim()
    if (addressChanged) input.address_line = addressLine.trim()
    if (cityChanged) input.city = city.trim()
    if (pincodeChanged) input.pincode = pincode.trim()

    setSavingDetails(true)
    try {
      await updateProfile(input)
      setDetailsPassword('')
      setDetailsNotice({ kind: 'success', text: 'Profile updated.' })
    } catch (err) {
      setDetailsNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Update failed' })
    } finally {
      setSavingDetails(false)
    }
  }

  const onChangePassword = async (event: FormEvent) => {
    event.preventDefault()
    setPasswordNotice(null)

    if (nextPassword.length < 8) {
      setPasswordNotice({ kind: 'error', text: 'New password must be at least 8 characters.' })
      return
    }
    if (nextPassword !== confirmPassword) {
      setPasswordNotice({ kind: 'error', text: 'New passwords do not match.' })
      return
    }
    if (!currentPassword) {
      setPasswordNotice({ kind: 'error', text: 'Enter your current password.' })
      return
    }

    setSavingPassword(true)
    try {
      await updateProfile({ password: nextPassword, current_password: currentPassword })
      setCurrentPassword('')
      setNextPassword('')
      setConfirmPassword('')
      setPasswordNotice({ kind: 'success', text: 'Password changed. Other sessions were signed out.' })
    } catch (err) {
      setPasswordNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Password change failed' })
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="page page-form">
      <header className="page-header">
        <span className="page-eyebrow">Account</span>
        <h1>Profile settings</h1>
        <p className="muted">
          Update your details and password. Signed in as{' '}
          <strong>{user.email}</strong> ({user.role}).
        </p>
      </header>

      <form className="card form-grid" onSubmit={onSaveDetails} noValidate aria-label="Profile details">
        <div className="section-head">
          <h2>Profile details</h2>
        </div>

        {detailsNotice && (
          <div
            role="alert"
            className={`alert ${detailsNotice.kind === 'error' ? 'alert-error' : 'alert-success'}`}
          >
            {detailsNotice.text}
          </div>
        )}

        <label className="field">
          <span>Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={120}
            placeholder="Your full name"
            className={inputClass}
            required
          />
        </label>

        <label className="field">
          <span>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            maxLength={254}
            placeholder="you@example.com"
            className={inputClass}
            required
          />
          {emailChanged && (
            <span className="text-xs text-slate-500">
              Changing your email requires your current password.
            </span>
          )}
        </label>

        {emailChanged && (
          <label className="field">
            <span>Current password</span>
            <input
              value={detailsPassword}
              onChange={(e) => setDetailsPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              placeholder="Confirm your current password"
              className={inputClass}
              required
            />
          </label>
        )}

        <div className="form-subhead">
          <h3>Contact &amp; address</h3>
          <p className="muted text-xs">
            Helps responders reach you and route reports to the right area.
          </p>
        </div>

        <label className="field">
          <span>Phone number</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={30}
            placeholder="+91 98765 43210"
            className={inputClass}
          />
        </label>

        <label className="field">
          <span>Address</span>
          <input
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
            autoComplete="street-address"
            maxLength={200}
            placeholder="House / street / area"
            className={inputClass}
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>City</span>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              autoComplete="address-level2"
              maxLength={100}
              placeholder="City"
              className={inputClass}
            />
          </label>

          <label className="field">
            <span>Postal code</span>
            <input
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              autoComplete="postal-code"
              maxLength={20}
              placeholder="560001"
              className={inputClass}
            />
          </label>
        </div>

        <button type="submit" className={submitClass} disabled={savingDetails}>
          {savingDetails ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <form className="card form-grid" onSubmit={onChangePassword} noValidate aria-label="Change password">
        <div className="section-head">
          <h2>Change password</h2>
        </div>

        {passwordNotice && (
          <div
            role="alert"
            className={`alert ${passwordNotice.kind === 'error' ? 'alert-error' : 'alert-success'}`}
          >
            {passwordNotice.text}
          </div>
        )}

        <PasswordField
          id="current-password"
          label="Current password"
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
          placeholder="Your current password"
        />
        <PasswordField
          id="new-password"
          label="New password"
          value={nextPassword}
          onChange={setNextPassword}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          hintId="new-password-hint"
          hint={
            <p id="new-password-hint" className="text-xs text-slate-500">
              Must be at least 8 characters.
            </p>
          }
        />
        <PasswordField
          id="confirm-password"
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          placeholder="Repeat the new password"
        />

        <button type="submit" className={submitClass} disabled={savingPassword}>
          {savingPassword ? 'Updating…' : 'Change password'}
        </button>
      </form>
    </div>
  )
}
