import { useState, useEffect } from 'react'
import { api } from './api'
import {
  User,
  Users,
  Shield,
  ShieldCheck,
  Key,
  Mail,
  Building,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Crown,
  HardHat,
  Wrench,
  Eye,
  Loader2,
  UserCheck
} from 'lucide-react'

interface UserProfile {
  id: string
  fullName: string
  email: string
  role: string
  organizationId: string
  organizationName: string
  createdAt: string
  isProjectOwner: boolean
}

interface TeamMember {
  id: string
  fullName: string
  email: string
  role: string
  organizationId: string
  createdAt: string
  isSelf?: boolean
}

interface RoleInfo {
  role: string
  label: string
  description: string
  permissions: string[]
}

export function UserProfileManagerView({ onProfileUpdated }: { onProfileUpdated?: () => void }) {
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const initialSubTab = (urlParams?.get('userTab') as 'profile' | 'team') || 'team'
  const [subTab, setSubTab] = useState<'profile' | 'team'>(initialSubTab)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [team, setTeam] = useState<TeamMember[]>([])
  const [roles, setRoles] = useState<RoleInfo[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Edit profile form
  const [editName, setEditName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  // Add user modal
  const [showAddUserModal, setShowAddUserModal] = useState(urlParams?.get('modal') === 'add')
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole, setNewUserRole] = useState('FIELD_ENGINEER')
  const [newUserPassword, setNewUserPassword] = useState('Hello@123')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setBusy(true)
    setError('')
    try {
      const [myProf, roleList] = await Promise.all([
        api.currentUserProfile(),
        api.roles().catch(() => [])
      ])
      setProfile(myProf)
      setEditName(myProf.fullName)
      setRoles(roleList)

      if (myProf.isProjectOwner) {
        const teamList = await api.users().catch(() => [])
        setTeam(teamList)
      } else {
        setSubTab('profile')
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load profile data')
    } finally {
      setBusy(false)
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const payload: any = { fullName: editName }
      if (newPassword.trim()) {
        payload.newPassword = newPassword.trim()
        if (currentPassword) payload.currentPassword = currentPassword
      }
      const updated = await api.updateCurrentUserProfile(payload)
      setProfile(updated)
      setCurrentPassword('')
      setNewPassword('')
      setSuccess('Profile updated successfully!')
      if (onProfileUpdated) onProfileUpdated()
    } catch (e: any) {
      setError(e.message || 'Failed to update profile')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await api.createUser({
        fullName: newUserName.trim(),
        email: newUserEmail.trim(),
        role: newUserRole,
        password: newUserPassword
      })
      setSuccess(`Team member ${newUserName} added successfully with role ${newUserRole}!`)
      setShowAddUserModal(false)
      setNewUserName('')
      setNewUserEmail('')
      setNewUserPassword('Welcome123!')
      // Refresh team list
      const teamList = await api.users()
      setTeam(teamList)
    } catch (e: any) {
      setError(e.message || 'Failed to create team member')
    } finally {
      setBusy(false)
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await api.updateUserRole(userId, newRole)
      setSuccess(`Role updated to ${newRole} successfully!`)
      const teamList = await api.users()
      setTeam(teamList)
      // If we updated ourselves, refresh profile too
      if (profile && profile.id === userId) {
        const myProf = await api.currentUserProfile()
        setProfile(myProf)
      }
    } catch (e: any) {
      setError(e.message || 'Failed to update user role')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteUser(userId: string, name: string) {
    if (!window.confirm(`Are you sure you want to remove ${name} from this organization?`)) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await api.deleteUser(userId)
      setSuccess(`User ${name} removed from organization.`)
      const teamList = await api.users()
      setTeam(teamList)
    } catch (e: any) {
      setError(e.message || 'Failed to remove user')
    } finally {
      setBusy(false)
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'PROJECT_OWNER':
      case 'ADMIN':
        return { label: 'PROJECT OWNER', icon: Crown, color: '#f59e0b', bg: '#fef3c7' }
      case 'PROJECT_MANAGER':
        return { label: 'PROJECT MANAGER', icon: ShieldCheck, color: '#0284c7', bg: '#e0f2fe' }
      case 'FIELD_ENGINEER':
        return { label: 'FIELD ENGINEER', icon: HardHat, color: '#10b981', bg: '#dcfce7' }
      case 'SUBCONTRACTOR':
        return { label: 'SUBCONTRACTOR', icon: Wrench, color: '#8b5cf6', bg: '#ede9fe' }
      default:
        return { label: 'VIEWER', icon: Eye, color: '#64748b', bg: '#f1f5f9' }
    }
  }

  const roleCounts = {
    owners: team.filter(u => u.role === 'PROJECT_OWNER' || u.role === 'ADMIN').length,
    pms: team.filter(u => u.role === 'PROJECT_MANAGER').length,
    engineers: team.filter(u => u.role === 'FIELD_ENGINEER').length,
    subs: team.filter(u => u.role === 'SUBCONTRACTOR').length,
    viewers: team.filter(u => u.role === 'VIEWER').length
  }

  return (
    <div className="panel" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #091e30 0%, #163d59 100%)',
        color: '#ffffff',
        padding: '24px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              background: '#0ea5e9',
              color: '#ffffff',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '1px'
            }}>
              ROLE-BASED ACCESS CONTROL (RBAC)
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Organization User Management</span>
          </div>
          <h2 style={{ margin: '8px 0 4px', font: '800 22px Manrope', letterSpacing: '-0.5px' }}>
            User Profile &amp; Team Access Manager
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>
            Manage your personal profile and control project role permissions across all construction trades.
          </p>
        </div>

        {profile && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#0284c7',
              color: 'white',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              fontSize: '16px'
            }}>
              {profile.fullName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <b style={{ display: 'block', fontSize: '13px', color: 'white' }}>{profile.fullName}</b>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span style={{
                  background: '#fef3c7',
                  color: '#b45309',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 800
                }}>
                  {getRoleBadge(profile.role).label}
                </span>
                <small style={{ color: '#94a3b8', fontSize: '11px' }}>{profile.organizationName}</small>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sub-Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e2e8f0',
        background: '#f8fafc',
        padding: '0 18px',
        gap: '8px'
      }}>
        <button
          type="button"
          onClick={() => setSubTab('profile')}
          style={{
            padding: '14px 18px',
            border: 0,
            background: 'transparent',
            font: subTab === 'profile' ? '700 13px Manrope' : '500 13px DM Sans',
            color: subTab === 'profile' ? '#0284c7' : '#64748b',
            borderBottom: subTab === 'profile' ? '3px solid #0284c7' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <User size={15} /> My Profile &amp; Credentials
        </button>
        {profile?.isProjectOwner && (
          <button
            type="button"
            onClick={() => setSubTab('team')}
            style={{
              padding: '14px 18px',
              border: 0,
              background: 'transparent',
              font: subTab === 'team' ? '700 13px Manrope' : '500 13px DM Sans',
              color: subTab === 'team' ? '#0284c7' : '#64748b',
              borderBottom: subTab === 'team' ? '3px solid #0284c7' : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Users size={15} /> Team &amp; Role-Based Access ({team.length || 1})
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '24px' }}>
        {error && <div className="error banner">{error}<button onClick={() => setError('')}>×</button></div>}
        {success && <div className="success banner">{success}<button onClick={() => setSuccess('')}>×</button></div>}

        {/* TAB 1: MY PROFILE */}
        {subTab === 'profile' && profile && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            {/* Left: Edit Form */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px', font: '800 16px Manrope', color: '#0f172a' }}>
                Personal Profile Settings
              </h3>
              <form onSubmit={handleUpdateProfile} style={{ display: 'grid', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    FULL NAME
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    EMAIL ADDRESS (READ-ONLY)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={profile.email}
                    style={{ width: '100%', background: '#e2e8f0', color: '#64748b' }}
                  />
                  <small style={{ color: '#94a3b8', fontSize: '10px' }}>Managed by organization administrator</small>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginTop: '6px' }}>
                  <b style={{ fontSize: '12px', color: '#1e293b', display: 'block', marginBottom: '10px' }}>
                    Change Password (Optional)
                  </b>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <input
                      type="password"
                      placeholder="Current password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      style={{ width: '100%' }}
                    />
                    <input
                      type="password"
                      placeholder="New password (min 8 characters)"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="submit" className="primary" disabled={busy}>
                    {busy ? <Loader2 className="spinner" size={16} /> : <CheckCircle2 size={16} />}
                    <span>Save Profile Changes</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right: Role & Permissions Card */}
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', letterSpacing: '0.5px' }}>
                  YOUR ASSIGNED ROLE
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: getRoleBadge(profile.role).bg,
                    color: getRoleBadge(profile.role).color,
                    display: 'grid',
                    placeItems: 'center'
                  }}>
                    {(() => {
                      const Icon = getRoleBadge(profile.role).icon
                      return <Icon size={20} />
                    })()}
                  </div>
                  <div>
                    <b style={{ fontSize: '15px', color: '#0f172a' }}>
                      {getRoleBadge(profile.role).label}
                    </b>
                    <small style={{ display: 'block', color: '#64748b', fontSize: '11px' }}>
                      {profile.isProjectOwner ? '👑 Can manage all team members & organization settings' : 'Operational team contributor'}
                    </small>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '16px', paddingTop: '14px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                    Active Permissions for Your Role:
                  </span>
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {[
                      { name: 'User & Role Management', allowed: profile.isProjectOwner },
                      { name: 'Time & Material (T&M) Sign-Off', allowed: profile.isProjectOwner || profile.role === 'PROJECT_MANAGER' },
                      { name: 'Engineering RFI Management', allowed: profile.role !== 'VIEWER' },
                      { name: 'Voice-to-Action Field Logging', allowed: profile.role !== 'VIEWER' },
                      { name: '2D Blueprint Spatial Pinning', allowed: profile.role !== 'VIEWER' },
                      { name: 'View Executive Owner Reports', allowed: true }
                    ].map((perm, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                        <span style={{ color: '#475569' }}>{perm.name}</span>
                        {perm.allowed ? (
                          <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '11px' }}>✓ ALLOWED</span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '11px' }}>— RESTRICTED</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '16px' }}>
                <b style={{ color: '#0369a1', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={16} /> Organization Information
                </b>
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#0c4a6e', display: 'grid', gap: '4px' }}>
                  <div><b>Organization:</b> {profile.organizationName}</div>
                  <div><b>Tenant ID:</b> <code style={{ fontSize: '11px' }}>{profile.organizationId}</code></div>
                  <div><b>Member Since:</b> {new Date(profile.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TEAM & ROLE-BASED ACCESS CONTROL */}
        {subTab === 'team' && (
          <div>
            {/* Non-owner notification banner */}
            {profile && !profile.isProjectOwner && (
              <div style={{
                background: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: '10px',
                padding: '14px 18px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#92400e'
              }}>
                <Shield size={20} />
                <div style={{ fontSize: '13px' }}>
                  <b>Viewing as {getRoleBadge(profile.role).label}</b> — Adding team members and modifying role permissions is restricted to <b>Project Owners</b>.
                </div>
              </div>
            )}

            {/* Owner Metrics & Action Toolbar */}
            {profile?.isProjectOwner && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '20px'
              }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b' }}>TOTAL MEMBERS</span>
                  <b style={{ display: 'block', fontSize: '20px', color: '#0f172a', margin: '4px 0' }}>{team.length}</b>
                  <small style={{ color: '#94a3b8', fontSize: '11px' }}>Across all trades</small>
                </div>
                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#b45309' }}>PROJECT OWNERS</span>
                  <b style={{ display: 'block', fontSize: '20px', color: '#92400e', margin: '4px 0' }}>{roleCounts.owners}</b>
                  <small style={{ color: '#b45309', fontSize: '11px' }}>Full administrative access</small>
                </div>
                <div style={{ background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '10px', padding: '14px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#0369a1' }}>FIELD ENGINEERS</span>
                  <b style={{ display: 'block', fontSize: '20px', color: '#0284c7', margin: '4px 0' }}>{roleCounts.engineers}</b>
                  <small style={{ color: '#0369a1', fontSize: '11px' }}>Voice &amp; plan pinning</small>
                </div>
                <div style={{ background: '#ede9fe', border: '1px solid #ddd6fe', borderRadius: '10px', padding: '14px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#6d28d9' }}>SUBCONTRACTORS</span>
                  <b style={{ display: 'block', fontSize: '20px', color: '#7c3aed', margin: '4px 0' }}>{roleCounts.subs}</b>
                  <small style={{ color: '#6d28d9', fontSize: '11px' }}>Task &amp; defect execution</small>
                </div>
              </div>
            )}

            {/* Team Members List Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, font: '800 17px Manrope', color: '#0f172a' }}>Organization Team Members</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Assign and update role-based permissions in real-time. Project owners hold complete management rights.
                </p>
              </div>
              {profile?.isProjectOwner && (
                <button
                  type="button"
                  className="primary compact"
                  onClick={() => setShowAddUserModal(true)}
                  style={{ background: '#0284c7' }}
                >
                  <Plus size={16} /> Add Team Member
                </button>
              )}
            </div>

            {/* Team Members Table */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: 'white', marginBottom: '28px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 1.5fr 1.2fr 0.8fr 0.5fr',
                padding: '12px 18px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                fontSize: '11px',
                fontWeight: 800,
                color: '#64748b'
              }}>
                <div>TEAM MEMBER</div>
                <div>EMAIL</div>
                <div>ASSIGNED ROLE</div>
                <div>JOINED</div>
                <div style={{ textAlign: 'right' }}>ACTION</div>
              </div>

              <div>
                {team.map(member => (
                  <div
                    key={member.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.5fr 1.5fr 1.2fr 0.8fr 0.5fr',
                      padding: '14px 18px',
                      alignItems: 'center',
                      borderBottom: '1px solid #f1f5f9',
                      fontSize: '13px'
                    }}
                  >
                    {/* Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: getRoleBadge(member.role).bg,
                        color: getRoleBadge(member.role).color,
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 700,
                        fontSize: '12px'
                      }}>
                        {member.fullName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <b style={{ color: '#0f172a' }}>{member.fullName}</b>
                        {member.isSelf && (
                          <span style={{ marginLeft: '6px', fontSize: '10px', background: '#e0f2fe', color: '#0284c7', padding: '1px 5px', borderRadius: '4px' }}>
                            You
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Email */}
                    <div style={{ color: '#475569', fontSize: '12px' }}>
                      {member.email}
                    </div>

                    {/* Role Dropdown */}
                    <div>
                      {profile?.isProjectOwner ? (
                        <select
                          value={member.role}
                          onChange={e => handleRoleChange(member.id, e.target.value)}
                          disabled={busy}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: getRoleBadge(member.role).color,
                            background: getRoleBadge(member.role).bg,
                            cursor: 'pointer'
                          }}
                        >
                          <option value="PROJECT_OWNER">👑 Project Owner</option>
                          <option value="PROJECT_MANAGER">🛡️ Project Manager</option>
                          <option value="FIELD_ENGINEER">👷 Field Engineer</option>
                          <option value="SUBCONTRACTOR">🔧 Subcontractor</option>
                          <option value="VIEWER">👁️ Viewer (Audit)</option>
                        </select>
                      ) : (
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: getRoleBadge(member.role).bg,
                          color: getRoleBadge(member.role).color
                        }}>
                          {getRoleBadge(member.role).label}
                        </span>
                      )}
                    </div>

                    {/* Joined Date */}
                    <div style={{ color: '#64748b', fontSize: '11px' }}>
                      {new Date(member.createdAt).toLocaleDateString()}
                    </div>

                    {/* Actions */}
                    <div style={{ textAlign: 'right' }}>
                      {profile?.isProjectOwner && !member.isSelf ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(member.id, member.fullName)}
                          disabled={busy}
                          style={{
                            border: 0,
                            background: 'transparent',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                          title="Remove user"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: '11px' }}>—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Role Permissions Reference Matrix */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <ShieldCheck size={18} color="#0284c7" />
                <h4 style={{ margin: 0, font: '800 15px Manrope', color: '#0f172a' }}>
                  Role-Based Permissions Capability Matrix (RBAC)
                </h4>
              </div>
              <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748b' }}>
                Operational security boundaries across project trades and management tiers:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                {roles.map(r => (
                  <div key={r.role} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: getRoleBadge(r.role).color
                      }} />
                      <b style={{ fontSize: '13px', color: '#0f172a' }}>{r.label}</b>
                    </div>
                    <p style={{ margin: '4px 0 10px', fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                      {r.description}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {r.permissions.map((p, idx) => (
                        <span key={idx} style={{ fontSize: '10px', color: '#334155', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <CheckCircle2 size={12} color="#16a34a" /> {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{ background: 'white', padding: '26px', borderRadius: '16px', width: 'min(100%, 480px)', display: 'grid', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, font: '800 17px Manrope' }}>Invite / Add Team Member</h3>
              <button type="button" onClick={() => setShowAddUserModal(false)} style={{ border: 0, background: 'none', fontSize: '18px', cursor: 'pointer' }}>×</button>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              Create an account for a new site superintendent, engineer, or trade subcontractor.
            </p>
            <form onSubmit={handleCreateUser} style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  FULL NAME
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="e.g. Liam Gallagher"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="e.g. liam.gallagher@subcontractor.com"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  ROLE PERMISSION LEVEL
                </label>
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value)}
                  style={{ width: '100%', padding: '10px' }}
                >
                  <option value="PROJECT_OWNER">👑 Project Owner (Full User &amp; Project Management)</option>
                  <option value="PROJECT_MANAGER">🛡️ Project Manager (Site Logistics &amp; Handover)</option>
                  <option value="FIELD_ENGINEER">👷 Field Engineer (Voice, RFIs, Blueprints)</option>
                  <option value="SUBCONTRACTOR">🔧 Subcontractor (Trade Task Execution)</option>
                  <option value="VIEWER">👁️ Viewer (Read-Only Audit)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  INITIAL PASSWORD
                </label>
                <input
                  type="text"
                  required
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" className="secondary compact" onClick={() => setShowAddUserModal(false)}>Cancel</button>
                <button type="submit" className="primary compact" disabled={busy}>
                  <UserCheck size={15} /> Add Team Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
