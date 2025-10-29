// src/components/CounterApp.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { counterService } from '@/lib/contract'

// JSON 가져오기용 타입 (any 제거)
type HistoryEntryJSON = {
  value: string
  action: 'increment' | 'decrement' | 'reset' | 'initial'
  timestamp: string
  txHash?: string
}

export default function CounterApp() {
  const [counter, setCounter] = useState<bigint>(0n)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [owner, setOwner] = useState<string>('')
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [isOwner, setIsOwner] = useState(false)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)
  const [networkInfo, setNetworkInfo] = useState<{
    name: string
    chainId: number
  } | null>(null)
  const [gasPrice, setGasPrice] = useState<string | null>(null)

  const [isDarkMode, setIsDarkMode] = useState(false)
  const [counterAnimation, setCounterAnimation] = useState<
    'increment' | 'decrement' | 'reset' | null
  >(null)
  const [achievement, setAchievement] = useState<string | null>(null)
  const [counterHistory, setCounterHistory] = useState<
    Array<{
      value: bigint
      action: 'increment' | 'decrement' | 'reset' | 'initial'
      timestamp: Date
      txHash?: string
    }>
  >([])
  const [showHistory, setShowHistory] = useState(false)
  const [goalValue, setGoalValue] = useState<bigint | null>(null)

  // ---------- 공통 ----------
  const clearMessages = useCallback(() => {
    setError(null)
    setSuccessMessage(null)
    setTransactionHash(null)
  }, [])

  const addToHistory = useCallback(
    (
      value: bigint,
      action: 'increment' | 'decrement' | 'reset' | 'initial',
      txHash?: string
    ) => {
      setCounterHistory((prev) => [
        ...prev,
        { value, action, timestamp: new Date(), txHash },
      ])
    },
    []
  )

  const statistics = useMemo(() => {
    if (counterHistory.length === 0) return null
    const increments = counterHistory.filter(
      (h) => h.action === 'increment'
    ).length
    const decrements = counterHistory.filter(
      (h) => h.action === 'decrement'
    ).length
    const resets = counterHistory.filter((h) => h.action === 'reset').length
    const totalChanges = increments + decrements + resets
    const averagePerDay =
      totalChanges > 0
        ? Math.round(
            totalChanges /
              Math.max(
                1,
                Math.ceil(
                  (Date.now() - counterHistory[0].timestamp.getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              )
          )
        : 0
    return { totalChanges, increments, decrements, resets, averagePerDay }
  }, [counterHistory])

  const exportHistory = useCallback(() => {
    const data = {
      history: counterHistory.map((h) => ({
        value: h.value.toString(),
        action: h.action,
        timestamp: h.timestamp.toISOString(),
        txHash: h.txHash,
      })),
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `counter-history-${
      new Date().toISOString().split('T')[0]
    }.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [counterHistory])

  const importHistory = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          if (Array.isArray(data.history)) {
            const importedHistory = (data.history as HistoryEntryJSON[]).map(
              (h) => ({
                value: BigInt(h.value),
                action: h.action,
                timestamp: new Date(h.timestamp),
                txHash: h.txHash,
              })
            )
            setCounterHistory(importedHistory)
            showSuccess('히스토리가 성공적으로 가져왔습니다!')
          }
        } catch {
          setError('히스토리 파일을 읽는데 실패했습니다.')
        }
      }
      reader.readAsText(file)
    },
    []
  )

  const setGoal = useCallback(() => {
    const input = prompt(
      '목표 카운터 값을 입력하세요:',
      goalValue?.toString() || ''
    )
    if (input !== null) {
      const value = BigInt(input || '0')
      setGoalValue(value)
      showSuccess(`목표가 ${value.toString()}으로 설정되었습니다!`)
    }
  }, [goalValue])

  const clearGoal = useCallback(() => {
    setGoalValue(null)
    showSuccess('목표가 해제되었습니다.')
  }, [])

  const isGoalReached = useCallback(
    () => goalValue !== null && counter >= goalValue,
    [goalValue, counter]
  )

  const showSuccess = useCallback((message: string, txHash?: string) => {
    setSuccessMessage(message)
    if (txHash) setTransactionHash(txHash)
    setTimeout(() => {
      setSuccessMessage(null)
      setTransactionHash(null)
    }, 5000)
  }, []) // 상태 setter는 안전하게 안정적이라 deps 비워도 됨

  // ---------- 데이터 로드 ----------
  const loadCounter = useCallback(async () => {
    try {
      const currentCounter = await counterService.getCounter()
      setCounter(currentCounter)
      if (counterHistory.length === 0) addToHistory(currentCounter, 'initial')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '카운터 값을 불러오는데 실패했습니다.'
      )
    }
  }, [addToHistory, counterHistory.length])

  const loadOwner = useCallback(async () => {
    try {
      const contractOwner = await counterService.getOwner()
      setOwner(contractOwner)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('소유자 정보를 불러오는데 실패했습니다:', err)
    }
  }, [])

  const loadWalletAddress = useCallback(async () => {
    try {
      const address = await counterService.getWalletAddress()
      setWalletAddress(address)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('지갑 주소를 불러오는데 실패했습니다:', err)
    }
  }, [])

  const loadNetworkInfo = useCallback(async () => {
    try {
      const network = await counterService.getNetworkInfo()
      setNetworkInfo(network)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('네트워크 정보를 불러오는데 실패했습니다:', err)
    }
  }, [])

  const loadGasPrice = useCallback(async () => {
    try {
      const price = await counterService.getGasPrice()
      setGasPrice(price)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('가스 가격을 불러오는데 실패했습니다:', err)
    }
  }, [])

  // ---------- 연결/해제 ----------
  const connectWallet = useCallback(async () => {
    try {
      clearMessages()
      setIsLoading(true)

      await counterService.connect()
      setIsConnected(true)

      const [cnt, own, addr, net, gas] = await Promise.all([
        counterService.getCounter(),
        counterService.getOwner(),
        counterService.getWalletAddress(),
        counterService.getNetworkInfo(),
        counterService.getGasPrice(),
      ])

      setCounter(cnt)
      setOwner(own)
      setWalletAddress(addr)
      setNetworkInfo(net)
      setGasPrice(gas)
      setIsOwner(own.toLowerCase() === addr.toLowerCase())

      setCounterHistory([
        { value: cnt, action: 'initial', timestamp: new Date() },
      ])
      showSuccess('지갑이 성공적으로 연결되었습니다!')
    } catch (err) {
      setError(err instanceof Error ? err.message : '지갑 연결에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [clearMessages, showSuccess])

  const disconnectWallet = useCallback(() => {
    setIsConnected(false)
    setOwner('')
    setWalletAddress('')
    setIsOwner(false)
    setCounter(0n)
    setNetworkInfo(null)
    setGasPrice(null)
    clearMessages()
    setCounterHistory([])
  }, [clearMessages])

  // ---------- 다크모드 ----------
  const applyTheme = useCallback((dark: boolean) => {
    const root = document.documentElement
    if (dark) root.classList.add('dark')
    else root.classList.remove('dark')
    root.classList.add('theme-transition')
    window.setTimeout(() => root.classList.remove('theme-transition'), 250)
  }, [])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme')
      const prefersDark = window.matchMedia?.(
        '(prefers-color-scheme: dark)'
      ).matches
      const initialDark = stored ? stored === 'dark' : !!prefersDark
      setIsDarkMode(initialDark)
      applyTheme(initialDark)
    } catch {
      // ignore
    }
  }, [applyTheme])

  const toggleDarkMode = useCallback(() => {
    const next = !isDarkMode
    setIsDarkMode(next)
    applyTheme(next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      // ignore
    }
  }, [applyTheme, isDarkMode])

  // 소유자 판별
  useEffect(() => {
    if (owner && walletAddress)
      setIsOwner(owner.toLowerCase() === walletAddress.toLowerCase())
  }, [owner, walletAddress])

  // 연결 후 정보 로드
  useEffect(() => {
    if (isConnected) {
      loadCounter()
      loadOwner()
      loadWalletAddress()
      loadNetworkInfo()
      loadGasPrice()
    }
  }, [
    isConnected,
    loadCounter,
    loadGasPrice,
    loadNetworkInfo,
    loadOwner,
    loadWalletAddress,
  ])

  // ---------- 애니메이션 ----------
  const triggerAnimation = useCallback(
    (type: 'increment' | 'decrement' | 'reset') => {
      setCounterAnimation(type)
      setTimeout(() => setCounterAnimation(null), 300)
    },
    []
  )

  // ---------- 공통 실행기 ----------
  const executeCounterAction = useCallback(
    async (
      action: () => Promise<string>,
      actionName: string,
      animationType: 'increment' | 'decrement' | 'reset'
    ) => {
      try {
        clearMessages()
        setIsLoading(true)
        const txHash = await action()
        const after = await counterService.getCounter()
        setCounter(after)
        triggerAnimation(animationType)
        addToHistory(after, animationType, txHash)
        if (goalValue && after >= goalValue) {
          setAchievement(`목표 달성! ${goalValue.toString()}에 도달했습니다!`)
          setTimeout(() => setAchievement(null), 5000)
        }
        showSuccess(`${actionName}이 성공적으로 완료되었습니다!`, txHash)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : `${actionName}에 실패했습니다.`
        )
      } finally {
        setIsLoading(false)
      }
    },
    [addToHistory, clearMessages, goalValue, showSuccess, triggerAnimation]
  )

  // 개별 액션 (useCallback로 메모)
  const incrementCounter = useCallback(
    () =>
      executeCounterAction(
        () => counterService.incrementCounter(),
        '카운터 증가',
        'increment'
      ),
    [executeCounterAction]
  )
  const decrementCounter = useCallback(
    () =>
      executeCounterAction(
        () => counterService.decrementCounter(),
        '카운터 감소',
        'decrement'
      ),
    [executeCounterAction]
  )
  const resetCounter = useCallback(
    () =>
      executeCounterAction(
        () => counterService.resetCounter(),
        '카운터 리셋',
        'reset'
      ),
    [executeCounterAction]
  )

  // 키보드 단축키
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!isConnected || isLoading) return
      switch (event.key) {
        case '+':
        case '=':
          event.preventDefault()
          incrementCounter()
          break
        case '-':
          event.preventDefault()
          decrementCounter()
          break
        case 'r':
        case 'R':
          if (isOwner) {
            event.preventDefault()
            resetCounter()
          }
          break
        case 'Escape':
          event.preventDefault()
          if (error) setError(null)
          if (successMessage) setSuccessMessage(null)
          break
      }
    }
    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [
    decrementCounter,
    error,
    incrementCounter,
    isConnected,
    isLoading,
    isOwner,
    resetCounter,
    successMessage,
  ])

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-0">
      {/* 전역 트랜지션 스타일 */}
      <style jsx global>{`
        .theme-transition *,
        .theme-transition {
          transition: background-color 200ms, color 200ms, border-color 200ms,
            fill 200ms, stroke 200ms;
        }
      `}</style>

      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/20 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white text-center">
                블록체인 카운터
              </h2>
              <p className="text-blue-100 text-center text-sm mt-1">
                스마트 컨트랙트 기반 카운터 앱
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleDarkMode}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title={isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
              >
                {isDarkMode ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                )}
              </button>
              {isConnected && (
                <button
                  onClick={disconnectWallet}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="지갑 연결 해제"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {!isConnected ? (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-blue-600 dark:text-blue-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                  지갑 연결 필요
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">
                  MetaMask를 연결하여 카운터를 사용하세요
                </p>
              </div>
              <button
                onClick={connectWallet}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>연결 중...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      />
                    </svg>
                    <span>지갑 연결</span>
                  </div>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Counter Display */}
              <div className="text-center">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 rounded-2xl p-6 mb-4 transition-all duration-500">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                    현재 값
                  </p>
                  <div
                    className={`text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent transition-all duration-500 ${
                      counterAnimation === 'increment'
                        ? 'scale-110'
                        : counterAnimation === 'decrement'
                        ? 'scale-90'
                        : counterAnimation === 'reset'
                        ? 'rotate-1'
                        : ''
                    }`}
                  >
                    {counter.toString()}
                  </div>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={incrementCounter}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg flex items-center justify-center space-x-2"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    <span>증가</span>
                  </button>
                  <button
                    onClick={decrementCounter}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg flex items-center justify-center space-x-2"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18 12H6"
                      />
                    </svg>
                    <span>감소</span>
                  </button>
                </div>

                <button
                  onClick={resetCounter}
                  disabled={isLoading || !isOwner}
                  className={`w-full font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg flex items-center justify-center space-x-2 ${
                    isOwner
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 text-white'
                      : 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>{isOwner ? '리셋' : '리셋 (소유자만 가능)'}</span>
                </button>
              </div>

              {/* Network & Gas Info */}
              {(networkInfo || gasPrice) && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 text-center">
                    네트워크 정보
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {networkInfo && (
                      <div className="text-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                          네트워크
                        </p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {networkInfo.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Chain ID: {networkInfo.chainId}
                        </p>
                      </div>
                    )}
                    {gasPrice && (
                      <div className="text-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                          가스 가격
                        </p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {parseFloat(gasPrice).toFixed(2)} Gwei
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Wallet Info */}
              {(owner || walletAddress) && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-center space-x-2 mb-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isOwner ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        isOwner
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {isOwner ? '컨트랙트 소유자' : '일반 사용자'}
                    </span>
                  </div>
                  {owner && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        컨트랙트 소유자
                      </p>
                      <p className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all bg-white dark:bg-slate-800 rounded px-2 py-1">
                        {owner}
                      </p>
                    </div>
                  )}
                  {walletAddress && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        연결된 지갑
                      </p>
                      <p className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all bg-white dark:bg-slate-800 rounded px-2 py-1">
                        {walletAddress}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Achievement */}
              {achievement && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 animate-bounce">
                  <div className="text-center">
                    <div className="text-2xl mb-2">🎉</div>
                    <h4 className="text-lg font-bold text-yellow-800 dark:text-yellow-200 mb-1">
                      축하합니다!
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      {achievement}
                    </p>
                  </div>
                </div>
              )}

              {/* Success */}
              {successMessage && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                        성공!
                      </h4>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {successMessage}
                      </p>
                      {transactionHash && (
                        <div className="mt-2">
                          <p className="text-xs text-green-600 dark:text-green-400 mb-1">
                            트랜잭션 해시:
                          </p>
                          <p className="font-mono text-xs text-green-700 dark:text-green-300 break-all bg-green-100 dark:bg-green-800/30 rounded px-2 py-1">
                            {transactionHash}
                          </p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setSuccessMessage(null)}
                      className="text-green-500 hover:text-green-600 transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                        오류 발생
                      </h4>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {error}
                      </p>
                    </div>
                    <button
                      onClick={() => setError(null)}
                      className="text-red-500 hover:text-red-600 transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Loading */}
              {isLoading && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center space-x-2 text-slate-600 dark:text-slate-300">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium">
                      트랜잭션 처리 중...
                    </span>
                  </div>
                </div>
              )}

              {/* Goal */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    🎯 목표 설정
                  </h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={setGoal}
                      className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                    >
                      목표 설정
                    </button>
                    {goalValue && (
                      <button
                        onClick={clearGoal}
                        className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                      >
                        해제
                      </button>
                    )}
                  </div>
                </div>

                {goalValue ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        목표:
                      </span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {goalValue.toString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        진행률:
                      </span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {Math.min(
                          100,
                          Math.round(
                            (Number(counter) / Number(goalValue)) * 100
                          )
                        )}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isGoalReached() ? 'bg-green-500' : 'bg-indigo-500'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              (Number(counter) / Number(goalValue)) * 100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                    {isGoalReached() && (
                      <div className="text-center text-green-600 dark:text-green-400 text-sm font-semibold">
                        🎉 목표 달성!
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                    목표를 설정하여 동기부여를 받으세요!
                  </p>
                )}
              </div>

              {/* History & Statistics */}
              <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    📊 통계 & 히스토리
                  </h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                    >
                      {showHistory ? '숨기기' : '히스토리'}
                    </button>
                    <button
                      onClick={exportHistory}
                      className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                    >
                      내보내기
                    </button>
                    <label className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors cursor-pointer">
                      가져오기
                      <input
                        type="file"
                        accept=".json"
                        onChange={importHistory}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {statistics && (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="text-center">
                      <p className="text-slate-500 dark:text-slate-400">
                        총 변경
                      </p>
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        {statistics.totalChanges}회
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 dark:text-slate-400">
                        일평균
                      </p>
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        {statistics.averagePerDay}회
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 dark:text-slate-400">증가</p>
                      <p className="font-semibold text-green-600 dark:text-green-400">
                        {statistics.increments}회
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 dark:text-slate-400">감소</p>
                      <p className="font-semibold text-red-600 dark:text-red-400">
                        {statistics.decrements}회
                      </p>
                    </div>
                  </div>
                )}

                {showHistory && counterHistory.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    <h5 className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      최근 활동
                    </h5>
                    {counterHistory
                      .slice(-5)
                      .reverse()
                      .map((entry, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between text-xs bg-white dark:bg-slate-800 rounded px-2 py-1"
                        >
                          <div className="flex items-center space-x-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                entry.action === 'increment'
                                  ? 'bg-green-500'
                                  : entry.action === 'decrement'
                                  ? 'bg-red-500'
                                  : entry.action === 'reset'
                                  ? 'bg-orange-500'
                                  : 'bg-gray-500'
                              }`}
                            />
                            <span className="text-slate-700 dark:text-slate-300">
                              {entry.value.toString()}
                            </span>
                          </div>
                          <div className="text-slate-500 dark:text-slate-400">
                            {entry.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Shortcuts */}
              <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 text-center">
                  키보드 단축키
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      증가:
                    </span>
                    <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-600 rounded text-slate-700 dark:text-slate-300">
                      +
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      감소:
                    </span>
                    <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-600 rounded text-slate-700 dark:text-slate-300">
                      -
                    </kbd>
                  </div>
                  {isOwner ? (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">
                        리셋:
                      </span>
                      <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-600 rounded text-slate-700 dark:text-slate-300">
                        R
                      </kbd>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between opacity-50">
                      <span className="text-slate-600 dark:text-slate-400">
                        리셋:
                      </span>
                      <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-600 rounded text-slate-700 dark:text-slate-300">
                        R
                      </kbd>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      닫기:
                    </span>
                    <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-600 rounded text-slate-700 dark:text-slate-300">
                      Esc
                    </kbd>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
