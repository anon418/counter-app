import CounterApp from '@/components/CounterApp'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
            <svg
              className="w-8 h-8 text-white"
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
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            블록체인 카운터 앱
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-md mx-auto break-keep leading-relaxed">
            <span>MetaMask&스마트 컨트랙트를 활용한</span>
            <span className="block">카운터 애플리케이션</span>
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            92313726 홍정현 
          </p>
        </div>

        {/* Main App */}
        <CounterApp />

        {/* Instructions */}
        <div className="mt-16 max-w-2xl mx-auto">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 dark:border-slate-700/20">
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-white mb-6 text-center">
              사용 방법
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-300">
                      1
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    MetaMask 지갑 설치 및 연결
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-purple-600 dark:text-purple-300">
                      2
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    카운터 값 조작
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-green-600 dark:text-green-300">
                      3
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    블록체인에 기록
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-orange-600 dark:text-orange-300">
                      4
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    실시간 업데이트 확인
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
