export interface User {
  id: string
  name: string
  role: 'lender' | 'borrower'
  joinedAt: Date
}

export interface Capital {
  id: string
  lenderId: string
  amount: number
  addedAt: Date
}

export interface Loan {
  id: string
  borrowerId: string
  borrowerName: string
  amount: number
  interestRate: number
  paymentSchedule: 'weekly' | 'monthly'
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: Date
  approvedAt?: Date
  dueDate?: Date
  totalDue: number
  principalPaid: number
  interestPaid: number
  isOverdue: boolean
  overdueInterestApplied: boolean
}

export interface Payment {
  id: string
  loanId: string
  borrowerId: string
  amount: number
  method: 'cash' | 'bank' | 'card' | 'mobile'
  paidAt: Date
  principalAmount: number
  interestAmount: number
}

export interface LendingState {
  users: User[]
  capital: Capital[]
  loans: Loan[]
  payments: Payment[]
  currentUser?: User
}