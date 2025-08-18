'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import type { User, Loan, Payment } from '../types/lending'

interface BorrowerDashboardProps {
  currentUser: User
  loans: Loan[]
  payments: Payment[]
  onRequestLoan: (amount: number, paymentSchedule: 'weekly' | 'monthly') => void
  onRecordPayment: (loanId: string, amount: number, method: 'cash' | 'bank' | 'card' | 'mobile') => void
  onSwitchUser: (userId: string) => void
  allUsers: User[]
}

export function BorrowerDashboard({
  currentUser,
  loans,
  payments,
  onRequestLoan,
  onRecordPayment,
  onSwitchUser,
  allUsers
}: BorrowerDashboardProps) {
  const [loanAmount, setLoanAmount] = useState('')
  const [paymentSchedule, setPaymentSchedule] = useState<'weekly' | 'monthly'>('monthly')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'card' | 'mobile'>('cash')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const activeLoans = loans.filter(loan => loan.status === 'approved')
  const pendingLoans = loans.filter(loan => loan.status === 'pending')
  const totalBorrowed = activeLoans.reduce((sum, loan) => sum + loan.amount, 0)
  const totalDue = activeLoans.reduce((sum, loan) => sum + (loan.totalDue - loan.principalPaid - loan.interestPaid), 0)
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0)
  const hasActiveLoan = loans.some(loan => loan.status === 'pending' || loan.status === 'approved')

  const handleLoanRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const amount = parseFloat(loanAmount)
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount')
      }
      if (amount > 1000) {
        throw new Error('Maximum loan amount is $1000')
      }
      onRequestLoan(amount, paymentSchedule)
      setLoanAmount('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async (e: React.FormEvent, loanId: string) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const amount = parseFloat(paymentAmount)
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid payment amount')
      }
      onRecordPayment(loanId, amount, paymentMethod)
      setPaymentAmount('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  const calculateLoanProgress = (loan: Loan) => {
    const totalPaid = loan.principalPaid + loan.interestPaid
    return (totalPaid / loan.totalDue) * 100
  }

  const getInterestDisplay = (schedule: 'weekly' | 'monthly') => {
    if (schedule === 'weekly') return '2% (Weekly)'
    return '6% (Monthly)'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">👤 Borrower Dashboard</h1>
            <p className="text-gray-600">Welcome, {currentUser.name}</p>
          </div>
          <Select onValueChange={onSwitchUser}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Switch User" />
            </SelectTrigger>
            <SelectContent>
              {allUsers.filter(u => u.id !== currentUser.id).map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Borrowed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">${totalBorrowed.toLocaleString()}</div>
              <p className="text-xs text-gray-600">Current active loans</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Amount Due</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">${totalDue.toLocaleString()}</div>
              <p className="text-xs text-gray-600">Remaining balance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${totalPaid.toLocaleString()}</div>
              <p className="text-xs text-gray-600">All time payments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Loan Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{activeLoans.length + pendingLoans.length}</div>
              <p className="text-xs text-gray-600">Active + pending</p>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <Tabs defaultValue="request" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="request">Request Loan</TabsTrigger>
            <TabsTrigger value="active">
              Active Loans
              {activeLoans.length > 0 && (
                <Badge variant="default" className="ml-2">
                  {activeLoans.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="payments">Payment History</TabsTrigger>
            <TabsTrigger value="pending">
              Pending
              {pendingLoans.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingLoans.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="request" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Request a New Loan</CardTitle>
                <CardDescription>
                  Borrow up to $1000 with flexible payment terms
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasActiveLoan ? (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-center">
                    <p className="text-yellow-800 font-medium">
                      You already have an active or pending loan. Please complete or cancel it before requesting a new one.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleLoanRequest} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="amount">Loan Amount ($)</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={loanAmount}
                          onChange={(e) => setLoanAmount(e.target.value)}
                          placeholder="Enter amount (max $1000)"
                          min="1"
                          max="1000"
                          step="1"
                        />
                        <p className="text-xs text-gray-600">Maximum: $1000</p>
                      </div>

                      <div className="space-y-2">
                        <Label>Payment Schedule</Label>
                        <Select value={paymentSchedule} onValueChange={(value: 'weekly' | 'monthly') => setPaymentSchedule(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly (2% interest)</SelectItem>
                            <SelectItem value="monthly">Monthly (6% interest)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Loan Preview */}
                    {loanAmount && !isNaN(parseFloat(loanAmount)) && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-3">Loan Preview</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Loan Amount</p>
                            <p className="font-bold text-lg">${parseFloat(loanAmount).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Interest Rate</p>
                            <p className="font-bold text-lg">{getInterestDisplay(paymentSchedule)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Total Due</p>
                            <p className="font-bold text-lg text-green-600">
                              ${(parseFloat(loanAmount) * (1 + (paymentSchedule === 'weekly' ? 0.02 : 0.06))).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? 'Submitting Request...' : 'Submit Loan Request'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="active" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Loans</CardTitle>
                <CardDescription>Manage your current loan payments</CardDescription>
              </CardHeader>
              <CardContent>
                {activeLoans.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No active loans</p>
                ) : (
                  <div className="space-y-6">
                    {activeLoans.map(loan => {
                      const progress = calculateLoanProgress(loan)
                      const remainingBalance = loan.totalDue - loan.principalPaid - loan.interestPaid
                      
                      return (
                        <div key={loan.id} className="border rounded-lg p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-semibold text-lg">
                                ${loan.amount.toLocaleString()} Loan
                              </h3>
                              <p className="text-gray-600">
                                Approved on {format(loan.approvedAt!, 'MMM d, yyyy')}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {loan.isOverdue && <Badge variant="destructive">Overdue</Badge>}
                              <Badge variant="default">Active</Badge>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                          
                          <div className="space-y-2 mb-6">
                            <div className="flex justify-between text-sm">
                              <span>Payment Progress</span>
                              <span>{progress.toFixed(1)}% completed</span>
                            </div>
                            <Progress value={progress} className="h-3" />
                          </div>

                          {/* Payment Form */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Make a Payment</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <form onSubmit={(e) => handlePayment(e, loan.id)} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="payment">Payment Amount ($)</Label>
                                    <Input
                                      id="payment"
                                      type="number"
                                      value={paymentAmount}
                                      onChange={(e) => setPaymentAmount(e.target.value)}
                                      placeholder="Enter amount"
                                      min="0"
                                      max={remainingBalance}
                                      step="0.01"
                                    />
                                    <p className="text-xs text-gray-600">
                                      Max: ${remainingBalance.toLocaleString()}
                                    </p>
                                  </div>
                                  <div>
                                    <Label>Payment Method</Label>
                                    <Select value={paymentMethod} onValueChange={(value: 'cash' | 'bank' | 'card' | 'mobile') => setPaymentMethod(value)}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="cash">💰 Cash</SelectItem>
                                        <SelectItem value="bank">🏦 Bank Transfer</SelectItem>
                                        <SelectItem value="card">💳 Card Payment</SelectItem>
                                        <SelectItem value="mobile">📱 Mobile Money</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <Button type="submit" disabled={loading} className="w-full">
                                  {loading ? 'Processing Payment...' : 'Submit Payment'}
                                </Button>
                              </form>
                            </CardContent>
                          </Card>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Your complete payment record</CardDescription>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No payments made yet</p>
                ) : (
                  <div className="space-y-3">
                    {payments.slice().reverse().map(payment => {
                      const loan = loans.find(l => l.id === payment.loanId)
                      return (
                        <div key={payment.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium">Payment - ${payment.amount.toLocaleString()}</p>
                            <p className="text-sm text-gray-600">
                              {format(payment.paidAt, 'MMM d, yyyy h:mm a')} via {payment.method}
                            </p>
                            <p className="text-xs text-gray-500">
                              Principal: ${payment.principalAmount.toLocaleString()} | Interest: ${payment.interestAmount.toLocaleString()}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {payment.method.charAt(0).toUpperCase() + payment.method.slice(1)}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Loan Requests</CardTitle>
                <CardDescription>Waiting for lender approval</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingLoans.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No pending requests</p>
                ) : (
                  <div className="space-y-4">
                    {pendingLoans.map(loan => (
                      <div key={loan.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">
                              ${loan.amount.toLocaleString()} Request
                            </h3>
                            <p className="text-gray-600">
                              Requested on {format(loan.requestedAt, 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                          <Badge variant="secondary">Pending Approval</Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Payment Schedule</p>
                            <p className="font-medium">{getInterestDisplay(loan.paymentSchedule)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Interest Amount</p>
                            <p className="font-medium">${(loan.totalDue - loan.amount).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total Due</p>
                            <p className="font-bold text-green-600">${loan.totalDue.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
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