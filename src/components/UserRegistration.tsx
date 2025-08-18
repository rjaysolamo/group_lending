'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { User } from '../types/lending'

interface UserRegistrationProps {
  onRegister: (name: string, role: 'lender' | 'borrower') => void
  userCount: { lenders: number; borrowers: number }
  allUsers: User[]
  onSwitchUser: (userId: string) => void
}

export function UserRegistration({ onRegister, userCount, allUsers, onSwitchUser }: UserRegistrationProps) {
  const [name, setName] = useState('')
  const [role, setRole] = useState<'lender' | 'borrower'>('borrower')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!name.trim()) {
        throw new Error('Name is required')
      }

      // Check if name already exists
      if (allUsers.some(user => user.name.toLowerCase() === name.toLowerCase())) {
        throw new Error('A user with this name already exists')
      }
      

      onRegister(name.trim(), role)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-800">
              🏦 Group Lending
            </CardTitle>
            <CardDescription>
              Join the lending circle as a lender or borrower
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* User Statistics */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-semibold text-sm text-gray-700 mb-3">Current Members</h3>
              <div className="flex justify-between items-center">
                <div className="text-center">
                  <Badge variant={userCount.lenders > 0 ? "default" : "secondary"}>
                    {userCount.lenders}/1 Lender
                  </Badge>
                </div>
                <div className="text-center">
                  <Badge variant={userCount.borrowers > 0 ? "default" : "secondary"}>
                    {userCount.borrowers}/19 Borrowers
                  </Badge>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={(value: 'lender' | 'borrower') => setRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem 
                      value="lender" 
                      disabled={userCount.lenders >= 1}
                    >
                      🏛️ Lender {userCount.lenders >= 1 && '(Full)'}
                    </SelectItem>
                    <SelectItem 
                      value="borrower" 
                      disabled={userCount.borrowers >= 19}
                    >
                      👤 Borrower {userCount.borrowers >= 19 && '(Full)'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || (role === 'lender' && userCount.lenders >= 1) || (role === 'borrower' && userCount.borrowers >= 19)}
                className="w-full"
              >
                {loading ? 'Joining...' : 'Join Lending Circle'}
              </Button>
            </form>

            {/* Role Information */}
            <div className="text-xs text-gray-600 space-y-2">
              <div className="bg-blue-50 p-3 rounded">
                <strong>Lender:</strong> Provide capital, approve loans, earn interest
              </div>
              <div className="bg-green-50 p-3 rounded">
                <strong>Borrower:</strong> Request loans up to $1000, choose weekly (2%) or monthly (6%) terms
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Switch User Section */}
        {allUsers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Switch User</CardTitle>
              <CardDescription>
                Switch to an existing user account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allUsers.map(user => (
                  <div key={user.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-600 capitalize">{user.role}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSwitchUser(user.id)}
                    >
                      Switch
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
            </Card>
        )}
      </div>
    </div>
  )
}