'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Identity } from '@clockworklabs/spacetimedb-sdk'
import * as moduleBindings from '../spacetime_module_bindings'

type DbConnection = moduleBindings.DbConnection
type EventContext = moduleBindings.EventContext
type ErrorContext = moduleBindings.ErrorContext
type User = moduleBindings.User
type Capital = moduleBindings.Capital
type Loan = moduleBindings.Loan
type Payment = moduleBindings.Payment
type Role = moduleBindings.Role
type LoanStatus = moduleBindings.LoanStatus
type PaymentMethod = moduleBindings.PaymentMethod

export interface SpacetimeDBState {
  connected: boolean
  identity: Identity | null
  statusMessage: string
  users: ReadonlyMap<string, User>
  currentUser: User | null
  capital: Capital | null
  loans: ReadonlyMap<string, Loan>
  payments: ReadonlyMap<string, Payment>
  connection: DbConnection | null
}

export interface SpacetimeDBActions {
  registerUser: (username: string, role: Role) => void
  depositCapital: (amountCents: bigint) => void
  withdrawCapital: (amountCents: bigint) => void
  requestLoan: (principalCents: bigint, interestRateBps: number, termDays: number, preferredPaymentMethod: PaymentMethod) => void
  approveLoan: (loanId: bigint) => void
  recordPayment: (loanId: bigint, amountCents: bigint, method: PaymentMethod) => void
  systemReset: () => void
}

export function useSpacetimeDB(): SpacetimeDBState & SpacetimeDBActions {
  const [connected, setConnected] = useState(false)
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [statusMessage, setStatusMessage] = useState('Connecting...')
  const [users, setUsers] = useState<ReadonlyMap<string, User>>(new Map())
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [capital, setCapital] = useState<Capital | null>(null)
  const [loans, setLoans] = useState<ReadonlyMap<string, Loan>>(new Map())
  const [payments, setPayments] = useState<ReadonlyMap<string, Payment>>(new Map())
  
  const connectionRef = useRef<DbConnection | null>(null)

  const subscribeToTables = useCallback(() => {
    if (!connectionRef.current) return
    
    console.log('Subscribing to tables...')
    
    const queries = [
      'SELECT * FROM user',
      'SELECT * FROM capital', 
      'SELECT * FROM loan',
      'SELECT * FROM payment'
    ]
    
    connectionRef.current
      .subscriptionBuilder()
      .onApplied(() => {
        console.log(`Subscription applied for: ${queries}`)
        processInitialCache()
      })
      .onError((error: Error) => {
        console.error(`Subscription error:`, error)
        setStatusMessage(`Subscription Error: ${error?.message || error}`)
      })
      .subscribe(queries)
  }, [])

  const processInitialCache = useCallback(() => {
    if (!connectionRef.current) return
    console.log('Processing initial cache...')
    
    // Load users
    const currentUsers = new Map<string, User>()
    for (const user of connectionRef.current.db.user.iter()) {
      currentUsers.set(user.identity.toHexString(), user)
    }
    setUsers(currentUsers)
    
    // Load capital
    for (const cap of connectionRef.current.db.capital.iter()) {
      setCapital(cap)
      break // Only one capital record for the lender
    }
    
    // Load loans
    const currentLoans = new Map<string, Loan>()
    for (const loan of connectionRef.current.db.loan.iter()) {
      currentLoans.set(loan.loanId.toString(), loan)
    }
    setLoans(currentLoans)
    
    // Load payments
    const currentPayments = new Map<string, Payment>()
    for (const payment of connectionRef.current.db.payment.iter()) {
      currentPayments.set(payment.paymentId.toString(), payment)
    }
    setPayments(currentPayments)
  }, [])

  const registerTableCallbacks = useCallback((currentIdentity: Identity) => {
    if (!connectionRef.current) return
    
    console.log('Registering table callbacks...')

    // User callbacks
    connectionRef.current.db.user.onInsert((ctx: EventContext | undefined, user: User) => {
      console.log('User inserted:', user.identity.toHexString())
      setUsers((prev: ReadonlyMap<string, User>) => 
        new Map(prev).set(user.identity.toHexString(), user)
      )
      
      if (currentIdentity && user.identity.toHexString() === currentIdentity.toHexString()) {
        setCurrentUser(user)
        setStatusMessage(`Registered as ${user.username} (${user.role.tag})`)
      }
    })

    connectionRef.current.db.user.onUpdate((ctx: EventContext | undefined, _oldUser: User, newUser: User) => {
      setUsers((prev: ReadonlyMap<string, User>) => {
        const newMap = new Map(prev)
        newMap.set(newUser.identity.toHexString(), newUser)
        return newMap
      })
      
      if (currentIdentity && newUser.identity.toHexString() === currentIdentity.toHexString()) {
        setCurrentUser(newUser)
      }
    })

    // Capital callbacks
    connectionRef.current.db.capital.onInsert((ctx: EventContext | undefined, cap: Capital) => {
      console.log('Capital inserted:', cap.lender.toHexString())
      setCapital(cap)
    })

    connectionRef.current.db.capital.onUpdate((ctx: EventContext | undefined, _oldCap: Capital, newCap: Capital) => {
      setCapital(newCap)
    })

    // Loan callbacks
    connectionRef.current.db.loan.onInsert((ctx: EventContext | undefined, loan: Loan) => {
      console.log('Loan inserted:', loan.loanId.toString())
      setLoans((prev: ReadonlyMap<string, Loan>) => 
        new Map(prev).set(loan.loanId.toString(), loan)
      )
    })

    connectionRef.current.db.loan.onUpdate((ctx: EventContext | undefined, _oldLoan: Loan, newLoan: Loan) => {
      setLoans((prev: ReadonlyMap<string, Loan>) => {
        const newMap = new Map(prev)
        newMap.set(newLoan.loanId.toString(), newLoan)
        return newMap
      })
    })

    connectionRef.current.db.loan.onDelete((ctx: EventContext, loan: Loan) => {
      setLoans((prev: ReadonlyMap<string, Loan>) => {
        const newMap = new Map(prev)
        newMap.delete(loan.loanId.toString())
        return newMap
      })
    })

    // Payment callbacks
    connectionRef.current.db.payment.onInsert((ctx: EventContext | undefined, payment: Payment) => {
      console.log('Payment inserted:', payment.paymentId.toString())
      setPayments((prev: ReadonlyMap<string, Payment>) => 
        new Map(prev).set(payment.paymentId.toString(), payment)
      )
    })

    connectionRef.current.db.payment.onDelete((ctx: EventContext, payment: Payment) => {
      setPayments((prev: ReadonlyMap<string, Payment>) => {
        const newMap = new Map(prev)
        newMap.delete(payment.paymentId.toString())
        return newMap
      })
    })
  }, [])

  useEffect(() => {
    if (connectionRef.current) {
      console.log('Connection already established, skipping setup.')
      return
    }

    const dbHost = 'wss://maincloud.spacetimedb.com'
    const dbName = process.env.NEXT_PUBLIC_SPACETIME_MODULE_NAME || 'lending_app'

    const onConnect = (connection: DbConnection, id: Identity, _token: string) => {
      console.log('Connected!')
      connectionRef.current = connection
      setIdentity(id)
      setConnected(true)
      localStorage.setItem('auth_token', _token)
      setStatusMessage(`Connected as ${id.toHexString().substring(0, 8)}...`)
      
      subscribeToTables()
      registerTableCallbacks(id)
    }

    const onDisconnect = (_ctx: ErrorContext, reason?: Error | null) => {
      const reasonStr = reason ? reason.message : 'No reason given'
      console.log('Disconnected:', reasonStr)
      setStatusMessage(`Disconnected: ${reasonStr}`)
      connectionRef.current = null
      setIdentity(null)
      setConnected(false)
    }

    moduleBindings.DbConnection.builder()
      .withUri(dbHost)
      .withModuleName(dbName)
      .withToken(localStorage.getItem('auth_token') || '')
      .onConnect(onConnect)
      .onDisconnect(onDisconnect)
      .build()
  }, [subscribeToTables, registerTableCallbacks])

  // Actions
  const registerUser = useCallback((username: string, role: Role) => {
    if (!connectionRef.current) return
    connectionRef.current.reducers.registerUser(username, role)
  }, [])

  const depositCapital = useCallback((amountCents: bigint) => {
    if (!connectionRef.current) return
    connectionRef.current.reducers.depositCapital(amountCents)
  }, [])

  const withdrawCapital = useCallback((amountCents: bigint) => {
    if (!connectionRef.current) return
    connectionRef.current.reducers.withdrawCapital(amountCents)
  }, [])

  const requestLoan = useCallback((principalCents: bigint, interestRateBps: number, termDays: number, preferredPaymentMethod: PaymentMethod) => {
    if (!connectionRef.current) return
    connectionRef.current.reducers.requestLoan(principalCents, interestRateBps, termDays, preferredPaymentMethod)
  }, [])

  const approveLoan = useCallback((loanId: bigint) => {
    if (!connectionRef.current) return
    connectionRef.current.reducers.approveLoan(loanId)
  }, [])

  const recordPayment = useCallback((loanId: bigint, amountCents: bigint, method: PaymentMethod) => {
    if (!connectionRef.current) return
    connectionRef.current.reducers.recordPayment(loanId, amountCents, method)
  }, [])

  const systemReset = useCallback(() => {
    if (!connectionRef.current) return
    connectionRef.current.reducers.systemReset()
  }, [])

  return {
    connected,
    identity,
    statusMessage,
    users,
    currentUser,
    capital,
    loans,
    payments,
    connection: connectionRef.current,
    registerUser,
    depositCapital,
    withdrawCapital,
    requestLoan,
    approveLoan,
    recordPayment,
    systemReset,
  }
}