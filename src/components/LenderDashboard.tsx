'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import type { User, Capital, Loan, Payment } from '../types/lending'

interface LenderDashboardProps {
  currentUser: User
  capital: Capital[]
  loans: Loan[]
  users: User[]
  payments: Payment[]
  onDepositCapital: (amount: number) => void
  onWithdrawCapital: (amount: number) => void
  onApproveLoan: (loanId: string, approve: boolean) => void
  onSystemReset: () => void
  onSwitchUser: (userId: string) => void
}

export function LenderDashboard({
  currentUser,
  capital,
  loans,
  users,
  payments,
  onDepositCapital,
  onWithdrawCapital,
  onApproveLoan,
  onSystemReset,
  onSwitchUser
}: LenderDashboardProps) {
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const totalCapital = capital.reduce((sum, cap) => sum + cap.amount, 0)
  const totalLoaned = loans.filter(loan => loan.status === 'approved').reduce((sum, loan) => sum + loan.amount, 0)
  const availableCapital = totalCapital - totalLoaned
  const totalEarned = payments.reduce((sum, payment) => sum + payment.interestAmount, 0)
  const pendingLoans = loans.filter(loan => loan.status === 'pending')
  const activeLoans = loans.filter(loan => loan.status === 'approved')
  const overdueLoans = activeLoans.filter(loan => loan.isOverdue)

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const amount = parseFloat(depositAmount)
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount')
      }
      onDepositCapital(amount)
      setDepositAmount('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deposit failed')
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const amount = parseFloat(withdrawAmount)
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount')
      }
      onWithdrawCapital(amount)
      setWithdrawAmount('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Withdrawal failed')
    } finally {
      setLoading(false)
    }
  }

  const handleLoanAction = async (loanId: string, approve: boolean) => {
    setError('')
    setLoading(true)

    try {
      onApproveLoan(loanId, approve)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  const calculateLoanProgress = (loan: Loan) => {
    const totalPaid = loan.principalPaid + loan.interestPaid
    return (totalPaid / loan.totalDue) * 100
  }

  const borrowers = users.filter(user => user.role === 'borrower')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">🏛️ Lender Dashboard</h1>
            <p className="text-gray-600">Welcome back, {currentUser.name}</p>
          </div>
          <div className="flex gap-3">
            <Select onValueChange={onSwitchUser}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Switch User" />
              </SelectTrigger>
              <SelectContent>
                {users.filter(u => u.id !== currentUser.id).map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Reset System</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset All Transactions</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all capital, loans, and payments. Only you will remain in the system. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onSystemReset}>
                    Reset Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Capital</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${totalCapital.toLocaleString()}</div>
              <p className="text-xs text-gray-600">Your lending pool</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Available Capital</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">${availableCapital.toLocaleString()}</div>
              <p className="text-xs text-gray-600">Ready to lend</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Loaned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">${totalLoaned.toLocaleString()}</div>
              <p className="text-xs text-gray-600">Currently deployed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Interest Earned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">${totalEarned.toLocaleString()}</div>
              <p className="text-xs text-gray-600">Total profit</p>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <Tabs defaultValue="capital" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="capital">Capital Management</TabsTrigger>
            <TabsTrigger value="pending">
              Pending Loans
              {pendingLoans.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingLoans.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active">Active Loans</TabsTrigger>
            <TabsTrigger value="borrowers">Borrowers</TabsTrigger>
          </TabsList>

          <TabsContent value="capital" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Deposit Capital */}
              <Card>
                <CardHeader>
                  <CardTitle>Deposit Capital</CardTitle>
                  <CardDescription>Add money to your lending pool</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleDeposit} className="space-y-4">
                    <div>
                      <Label htmlFor="deposit">Amount ($)</Label>
                      <Input
                        id="deposit"
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="Enter amount"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? 'Processing...' : 'Deposit Capital'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Withdraw Capital */}
              <Card>
                <CardHeader>
                  <CardTitle>Withdraw Capital</CardTitle>
                  <CardDescription>Remove available capital from pool</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleWithdraw} className="space-y-4">
                    <div>
                      <Label htmlFor="withdraw">Amount ($)</Label>
                      <Input
                        id="withdraw"
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="Enter amount"
                        min="0"
                        max={availableCapital}
                        step="0.01"
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        Available: ${availableCapital.toLocaleString()}
                      </p>
                    </div>
                    <Button 
                      type="submit" 
                      disabled={loading || availableCapital <= 0} 
                      className="w-full"
                    >
                      {loading ? 'Processing...' : 'Withdraw Capital'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Capital History */}
            <Card>
              <CardHeader>
                <CardTitle>Capital History</CardTitle>
              </CardHeader>
              <CardContent>
                {capital.length === 0 ? (
                  <p className="text-gray-600 text-center py-4">No capital transactions yet</p>
                ) : (
                  <div className="space-y-3">
                    {capital.slice(-10).reverse().map(cap => (
                      <div key={cap.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium">
                            {cap.amount > 0 ? '💰 Deposit' : '💸 Withdrawal'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {format(cap.addedAt, 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                        <div className={`text-lg font-bold ${cap.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {cap.amount > 0 ? '+' : ''}${Math.abs(cap.amount).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Loan Requests Awaiting Approval</CardTitle>
                <CardDescription>Review and approve or reject loan applications</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingLoans.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No pending loan requests</p>
                ) : (
                  <div className="space-y-4">
                    {pendingLoans.map(loan => (
                      <div key={loan.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">{loan.borrowerName}</h3>
                            <p className="text-gray-600">
                              Requested on {format(loan.requestedAt, 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                          <Badge variant="secondary">Pending</Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Loan Amount</p>
                            <p className="text-xl font-bold">${loan.amount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Payment Schedule</p>
                            <p className="font-medium capitalize">{loan.paymentSchedule} ({(loan.interestRate * 100).toFixed(0)}%)</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total Due</p>
                            <p className="text-xl font-bold text-green-600">${loan.totalDue.toLocaleString()}</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleLoanAction(loan.id, true)}
                            disabled={loading || loan.amount > availableCapital}
                            className="flex-1"
                          >
                            {loan.amount > availableCapital ? 'Insufficient Capital' : 'Approve Loan'}
                          </Button>
                          <Button
                            onClick={() => handleLoanAction(loan.id, false)}
                            disabled={loading}
                            variant="destructive"
                            className="flex-1"
                          >
                            Reject Loan
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="active" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Loans</CardTitle>
                <CardDescription>Monitor ongoing loan performance</CardDescription>
              </CardHeader>
              <CardContent>
                {activeLoans.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No active loans</p>
                ) : (
                  <div className="space-y-4">
                    {activeLoans.map(loan => {
                      const progress = calculateLoanProgress(loan)
                      const remainingBalance = loan.totalDue - loan.principalPaid - loan.interestPaid
                      
                      return (
                        <div key={loan.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-semibold text-lg">{loan.borrowerName}</h3>
                              <p className="text-gray-600">
                                Approved on {format(loan.approvedAt!, 'MMM d, yyyy h:mm a')}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {loan.isOverdue && <Badge variant="destructive">Overdue</Badge>}
                              <Badge variant="default">Active</Badge>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-600">Original Amount</p>
                              <p className="font-bold">${loan.amount.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Total Due</p>
                              <p className="font-bold">${loan.totalDue.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Remaining</p>
                              <p className="font-bold text-red-600">${remainingBalance.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Due Date</p>
                              <p className={`font-medium ${loan.isOverdue ? 'text-red-600' : ''}`}>
                                {loan.dueDate ? format(loan.dueDate, 'MMM d, yyyy') : 'N/A'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span>{progress.toFixed(1)}% paid</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="borrowers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Borrower Directory</CardTitle>
                <CardDescription>Overview of all registered borrowers</CardDescription>
              </CardHeader>
              <CardContent>
                {borrowers.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No borrowers registered yet</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {borrowers.map(borrower => {
                      const borrowerLoans = loans.filter(loan => loan.borrowerId === borrower.id)
                      const activeLoans = borrowerLoans.filter(loan => loan.status === 'approved')
                      const totalBorrowed = activeLoans.reduce((sum, loan) => sum + loan.amount, 0)
                      const totalPaid = payments
                        .filter(payment => payment.borrowerId === borrower.id)
                        .reduce((sum, payment) => sum + payment.amount, 0)
                      
                      return (
                        <Card key={borrower.id}>
                          <CardHeader>
                            <CardTitle className="text-lg">{borrower.name}</CardTitle>
                            <CardDescription>
                              Member since {format(borrower.joinedAt, 'MMM yyyy')}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Active Loans:</span>
                              <span className="font-medium">{activeLoans.length}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Total Borrowed:</span>
                              <span className="font-medium">${totalBorrowed.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Total Paid:</span>
                              <span className="font-medium">${totalPaid.toLocaleString()}</span>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}