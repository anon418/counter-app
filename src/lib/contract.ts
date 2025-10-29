// src/lib/contract.ts
import { ethers } from 'ethers'
import { contractAddress } from './constants'
import CounterABI from './Counter.json'

// ---- EIP-1193 최소 타입 (프로젝트 ethereum.d.ts와 합치) ----
type Eip1193RequestArgs = { method: string; params?: unknown[] }
type Eip1193Callback = (...args: unknown[]) => void
type Eip1193Provider = {
  isMetaMask?: boolean
  request: (args: Eip1193RequestArgs) => Promise<unknown>
  on: (event: string, callback: Eip1193Callback) => void
  removeListener: (event: string, callback: Eip1193Callback) => void
  providers?: Eip1193Provider[]
}

// window.ethereum 재선언 없이 안전 접근
const getEthereum = (): Eip1193Provider | undefined => {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { ethereum?: Eip1193Provider }).ethereum
}

// 컨트랙트 메서드 시그니처
interface CounterContractMethods {
  getCounter(): Promise<bigint>
  incrementCounter(): Promise<ethers.ContractTransactionResponse>
  decrementCounter(): Promise<ethers.ContractTransactionResponse>
  resetCounter(): Promise<ethers.ContractTransactionResponse>
  owner(): Promise<string>
}

// 멀티지갑 환경에서 MetaMask 우선
function pickMetaMask(
  injected: Eip1193Provider | undefined
): Eip1193Provider | null {
  if (!injected) return null
  const list = Array.isArray(injected.providers)
    ? injected.providers
    : undefined
  if (list?.length) {
    const mm = list.find((p) => p?.isMetaMask)
    return mm ?? null
  }
  return injected.isMetaMask ? injected : null
}

// 주입 대기(최대 1500ms) — ❌ as any 제거
async function waitForEthereum(): Promise<Eip1193Provider> {
  if (typeof window === 'undefined')
    throw new Error('브라우저 환경이 아닙니다.')
  const existing = getEthereum()
  if (existing) return existing

  return await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('MetaMask가 감지되지 않았습니다.')),
      1500
    )

    const onInitialized: EventListener = () => {
      clearTimeout(timer)
      const eth = getEthereum()
      if (eth) resolve(eth)
      else reject(new Error('MetaMask가 감지되지 않았습니다.'))
    }

    // 커스텀 이벤트 이름이지만 addEventListener는 string 허용
    window.addEventListener('ethereum#initialized', onInitialized, {
      once: true,
    })
  })
}

const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7' // 11155111

export class CounterContractService {
  private _contract: (ethers.Contract & CounterContractMethods) | null = null
  private _provider: ethers.BrowserProvider | null = null
  private _signer: ethers.JsonRpcSigner | null = null

  // ---- 내부 게터 (런타임 가드 + 정확한 반환 타입) ----
  private getContract(): ethers.Contract & CounterContractMethods {
    if (!this._contract) throw new Error('컨트랙트에 연결되지 않았습니다.')
    return this._contract
  }
  private getProvider(): ethers.BrowserProvider {
    if (!this._provider) throw new Error('프로바이더에 연결되지 않았습니다.')
    return this._provider
  }
  private getSigner(): ethers.JsonRpcSigner {
    if (!this._signer) throw new Error('지갑에 연결되지 않았습니다.')
    return this._signer
  }

  private async ensureSepoliaNetwork(mm: Eip1193Provider) {
    const chainIdHex = (await mm.request({ method: 'eth_chainId' })) as string
    if (chainIdHex?.toLowerCase() === SEPOLIA_CHAIN_ID_HEX) return

    try {
      await mm.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
      })
    } catch (e) {
      const err = e as { code?: number; message?: string }
      if (
        err?.code === 4902 ||
        (err?.message ?? '').includes('Unrecognized chain ID')
      ) {
        await mm.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: SEPOLIA_CHAIN_ID_HEX,
              chainName: 'Sepolia',
              nativeCurrency: {
                name: 'Sepolia Ether',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://rpc.sepolia.org'],
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            },
          ],
        })
        await mm.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
        })
      } else {
        throw e
      }
    }
  }

  async connect(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('해당 함수는 브라우저에서만 실행이 가능합니다.')
    }

    const injected = await waitForEthereum()
    const mm = pickMetaMask(injected)
    if (!mm)
      throw new Error('MetaMask가 설치되지 않았거나 활성화되지 않았습니다.')

    await this.ensureSepoliaNetwork(mm)
    await mm.request({ method: 'eth_requestAccounts' })

    // ethers v6 BrowserProvider는 EIP-1193 provider를 받음
    this._provider = new ethers.BrowserProvider(
      mm as unknown as ethers.Eip1193Provider
    )
    this._signer = await this._provider.getSigner()

    this._contract = new ethers.Contract(
      contractAddress,
      CounterABI,
      this._signer
    ) as ethers.Contract & CounterContractMethods

    // ABI/배포 주소 검증
    const required = [
      'getCounter',
      'incrementCounter',
      'decrementCounter',
      'resetCounter',
      'owner',
    ] as const
    for (const name of required) {
      if (!(name in this._contract)) {
        throw new Error(
          `컨트랙트 메소드 누락: ${name}. 배포 주소/ABI를 확인하세요.`
        )
      }
    }
  }

  // ---- 읽기/쓰기 메서드 ----
  async getCounter(): Promise<bigint> {
    return await this.getContract().getCounter()
  }

  async incrementCounter(): Promise<string> {
    const tx = await this.getContract().incrementCounter()
    const receipt = await tx.wait()
    return receipt?.hash ?? tx.hash
  }

  async decrementCounter(): Promise<string> {
    const tx = await this.getContract().decrementCounter()
    const receipt = await tx.wait()
    return receipt?.hash ?? tx.hash
  }

  async resetCounter(): Promise<string> {
    const contract = this.getContract()
    const owner = await contract.owner()
    const signerAddress = await this.getSigner().getAddress()
    if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
      throw new Error(
        '리셋 권한이 없습니다. 컨트랙트 소유자만 리셋할 수 있습니다.'
      )
    }
    const tx = await contract.resetCounter()
    const receipt = await tx.wait()
    return receipt?.hash ?? tx.hash
  }

  async getOwner(): Promise<string> {
    return await this.getContract().owner()
  }

  async getWalletAddress(): Promise<string> {
    return await this.getSigner().getAddress()
  }

  async getNetworkInfo(): Promise<{ name: string; chainId: number }> {
    const network = await this.getProvider().getNetwork()
    return { name: network.name, chainId: Number(network.chainId) }
  }

  async getGasPrice(): Promise<string> {
    const fee = await this.getProvider().getFeeData()
    return fee.gasPrice ? ethers.formatUnits(fee.gasPrice, 'gwei') : '0'
  }

  isConnected(): boolean {
    return this._contract !== null
  }
}

// 전역 인스턴스
export const counterService = new CounterContractService()
