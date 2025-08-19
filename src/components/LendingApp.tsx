'use client'

import { useState, useEffect } from 'react'
import { UserRegistration } from './UserRegistration'
import { LenderDashboard } from './LenderDashboard'
import { BorrowerDashboard } from './BorrowerDashboard'
import type { User, Capital, Loan, Payment, LendingState } from '../types/lending'

const STORAGE_KEY = 'lending-app-state'
const MAX_BORROWERS = 19
const MAX_LOAN_AMOUNT = 1000
const WEEKLY_INTEREST_RATE = 0.02
const MONTHLY_INTEREST_RATE = 0.06

export function LendingApp() {
  const [state, setState] = useState<LendingState>({
    users: [],
    capital: [],
    loans: [],
    payments: [],
    currentUser: undefined
  })

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY)
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState)
        // Convert date strings back to Date objects
        parsedState.users = parsedState.users?.map((user: User & { joinedAt: string }) => ({
          ...user,
          joinedAt: new Date(user.joinedAt)
        })) || []
        parsedState.capital = parsedState.capital?.map((cap: Capital & { addedAt: string }) => ({
          ...cap,
          addedAt: new Date(cap.addedAt)
        })) || []
        parsedState.loans = parsedState.loans?.map((loan: Loan & { requestedAt: string; approvedAt?: string; dueDate?: string }) => ({
          ...loan,
          requestedAt: new Date(loan.requestedAt),
          approvedAt: loan.approvedAt ? new Date(loan.approvedAt) : undefined,
          dueDate: loan.dueDate ? new Date(loan.dueDate) : undefined
        })) || []
        parsedState.payments = parsedState.payments?.map((payment: Payment & { paidAt: string }) => ({
          ...payment,
          paidAt: new Date(payment.paidAt)
        })) || []
        setState(parsedState)
      } catch (error) {
        console.error('Error loading saved state:', error)
      }
    }
  }, [])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  // Update overdue loans periodically
  useEffect(() => {
    const interval = setInterval(() => {
      updateOverdueLoans()
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [state.loans])

  const updateOverdueLoans = () => {
    const now = new Date()
    setState(prevState => ({
      ...prevState,
      loans: prevState.loans.map(loan => {
        if (loan.status === 'approved' && loan.dueDate && now > loan.dueDate) {
          const wasOverdue = loan.isOverdue
          const newLoan = { ...loan, isOverdue: true }
          
          // Apply overdue interest if not already applied
          if (!wasOverdue && !loan.overdueInterestApplied) {
            const remainingBalance = loan.totalDue - loan.principalPaid - loan.interestPaid
            const overdueInterest = remainingBalance * (loan.paymentSchedule === 'weekly' ? WEEKLY_INTEREST_RATE : MONTHLY_INTEREST_RATE)
            newLoan.totalDue += overdueInterest
            newLoan.overdueInterestApplied = true
          }
          
          return newLoan
        }
        return loan
      })
    }))
  }

  const registerUser = (name: string, role: 'lender' | 'borrower') => {
    const borrowerCount = state.users.filter(u => u.role === 'borrower').length
    const lenderCount = state.users.filter(u => u.role === 'lender').length
    
    if (role === 'borrower' && borrowerCount >= MAX_BORROWERS) {
      throw new Error(`Maximum ${MAX_BORROWERS} borrowers allowed`)
    }
    
    if (role === 'lender' && lenderCount >= 1) {
      throw new Error('Only one lender allowed')
    }

    const newUser: User = {
      id: Date.now().toString(),
      name,
      role,
      joinedAt: new Date()
    }

    setState(prevState => ({
      ...prevState,
      users: [...prevState.users, newUser],
      currentUser: newUser
    }))
  }

  const depositCapital = (amount: number) => {
    if (!state.currentUser || state.currentUser.role !== 'lender') return

    const newCapital: Capital = {
      id: Date.now().toString(),
      lenderId: state.currentUser.id,
      amount,
      addedAt: new Date()
    }

    setState(prevState => ({
      ...prevState,
      capital: [...prevState.capital, newCapital]
    }))
  }

  const withdrawCapital = (amount: number) => {
    if (!state.currentUser || state.currentUser.role !== 'lender') return

    const totalCapital = state.capital.reduce((sum, cap) => sum + cap.amount, 0)
    const totalLoaned = state.loans
      .filter(loan => loan.status === 'approved')
      .reduce((sum, loan) => sum + loan.amount, 0)
    const availableCapital = totalCapital - totalLoaned

    if (amount > availableCapital) {
      throw new Error('Insufficient available capital')
    }

    const newCapital: Capital = {
      id: Date.now().toString(),
      lenderId: state.currentUser.id,
      amount: -amount,
      addedAt: new Date()
    }

    setState(prevState => ({
      ...prevState,
      capital: [...prevState.capital, newCapital]
    }))
  }

  const requestLoan = (amount: number, paymentSchedule: 'weekly' | 'monthly') => {
    if (!state.currentUser || state.currentUser.role !== 'borrower') return

    if (amount > MAX_LOAN_AMOUNT) {
      throw new Error(`Maximum loan amount is $${MAX_LOAN_AMOUNT}`)
    }

    // Check if user already has an active loan
    const hasActiveLoan = state.loans.some(loan => 
      loan.borrowerId === state.currentUser!.id && 
      (loan.status === 'pending' || loan.status === 'approved')
    )

    if (hasActiveLoan) {
      throw new Error('You already have an active loan')
    }

    const interestRate = paymentSchedule === 'weekly' ? WEEKLY_INTEREST_RATE : MONTHLY_INTEREST_RATE
    const totalDue = amount + (amount * interestRate)

    const newLoan: Loan = {
      id: Date.now().toString(),
      borrowerId: state.currentUser.id,
      borrowerName: state.currentUser.name,
      amount,
      interestRate,
      paymentSchedule,
      status: 'pending',
      requestedAt: new Date(),
      totalDue,
      principalPaid: 0,
      interestPaid: 0,
      isOverdue: false,
      overdueInterestApplied: false
    }

    setState(prevState => ({
      ...prevState,
      loans: [...prevState.loans, newLoan]
    }))
  }

  const approveLoan = (loanId: string, approve: boolean) => {
    if (!state.currentUser || state.currentUser.role !== 'lender') return

    setState(prevState => {
      const loan = prevState.loans.find(l => l.id === loanId)
      if (!loan) return prevState

      if (approve) {
        const totalCapital = prevState.capital.reduce((sum, cap) => sum + cap.amount, 0)
        const totalLoaned = prevState.loans
          .filter(l => l.status === 'approved')
          .reduce((sum, l) => sum + l.amount, 0)
        const availableCapital = totalCapital - totalLoaned

        if (loan.amount > availableCapital) {
          throw new Error('Insufficient capital to approve loan')
        }

        const dueDate = new Date()
        if (loan.paymentSchedule === 'weekly') {
          dueDate.setDate(dueDate.getDate() + 7)
        } else {
          dueDate.setMonth(dueDate.getMonth() + 1)
        }

        return {
          ...prevState,
          loans: prevState.loans.map(l =>
            l.id === loanId
              ? { ...l, status: 'approved' as const, approvedAt: new Date(), dueDate }
              : l
          )
        }
      } else {
        return {
          ...prevState,
          loans: prevState.loans.map(l =>
            l.id === loanId
              ? { ...l, status: 'rejected' as const }
              : l
          )
        }
      }
    })
  }

  const recordPayment = (loanId: string, amount: number, method: 'cash' | 'bank' | 'card' | 'mobile') => {
    if (!state.currentUser || state.currentUser.role !== 'borrower') return

    setState(prevState => {
      const loan = prevState.loans.find(l => l.id === loanId)
      if (!loan || loan.status !== 'approved') return prevState

      const remainingBalance = loan.totalDue - loan.principalPaid - loan.interestPaid
      if (amount > remainingBalance) {
        throw new Error('Payment amount exceeds remaining balance')
      }

      // Calculate how much goes to interest vs principal
      const remainingInterest = (loan.amount * loan.interestRate) - loan.interestPaid + 
        (loan.overdueInterestApplied ? loan.amount * loan.interestRate : 0)
      const interestAmount = Math.min(amount, remainingInterest)
      const principalAmount = amount - interestAmount

      const newPayment: Payment = {
        id: Date.now().toString(),
        loanId,
        borrowerId: state.currentUser!.id,
        amount,
        method,
        paidAt: new Date(),
        principalAmount,
        interestAmount
      }

      const updatedLoan = {
        ...loan,
        principalPaid: loan.principalPaid + principalAmount,
        interestPaid: loan.interestPaid + interestAmount
      }

      // Reset due date if payment made
      if (updatedLoan.principalPaid + updatedLoan.interestPaid < updatedLoan.totalDue) {
        const newDueDate = new Date()
        if (loan.paymentSchedule === 'weekly') {
          newDueDate.setDate(newDueDate.getDate() + 7)
        } else {
          newDueDate.setMonth(newDueDate.getMonth() + 1)
        }
        updatedLoan.dueDate = newDueDate
        updatedLoan.isOverdue = false
        updatedLoan.overdueInterestApplied = false
      }

      return {
        ...prevState,
        loans: prevState.loans.map(l => l.id === loanId ? updatedLoan : l),
        payments: [...prevState.payments, newPayment]
      }
    })
  }

  const systemReset = () => {
    if (!state.currentUser || state.currentUser.role !== 'lender') return
    
    setState({
      users: [state.currentUser], // Keep only current user
      capital: [],
      loans: [],
      payments: [],
      currentUser: state.currentUser
    })
  }

  const switchUser = (userId: string) => {
    const user = state.users.find(u => u.id === userId)
    if (user) {
      setState(prevState => ({
        ...prevState,
        currentUser: user
      }))
    }
  }

  const getUserCount = () => ({
    lenders: state.users.filter(u => u.role === 'lender').length,
    borrowers: state.users.filter(u => u.role === 'borrower').length
  })

  // Show registration if no current user
  if (!state.currentUser) {
    return (
      <UserRegistration
        onRegister={registerUser}
        userCount={getUserCount()}
        allUsers={state.users}
        onSwitchUser={switchUser}
      />
    )
  }

  // Show appropriate dashboard based on user role
  if (state.currentUser.role === 'lender') {
    return (
      <LenderDashboard
        currentUser={state.currentUser}
        capital={state.capital}
        loans={state.loans}
        users={state.users}
        payments={state.payments}
        onDepositCapital={depositCapital}
        onWithdrawCapital={withdrawCapital}
        onApproveLoan={approveLoan}
        onSystemReset={systemReset}
        onSwitchUser={switchUser}
      />
    )
  }

  return (
    <BorrowerDashboard
      currentUser={state.currentUser}
      loans={state.loans.filter(l => l.borrowerId === state.currentUser!.id)}
      payments={state.payments.filter(p => p.borrowerId === state.currentUser!.id)}
      onRequestLoan={requestLoan}
      onRecordPayment={recordPayment}
      onSwitchUser={switchUser}
      allUsers={state.users}
    />
  )
}