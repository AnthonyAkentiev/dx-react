import { Account, Balance, State } from 'types'
import { ETHEREUM_NETWORKS } from 'globals'

export interface ProviderState {
  account: Account,
  network: ETHEREUM_NETWORKS,
  balance: Balance,
  available: boolean,
  unlocked: boolean,
  timestamp?: number,
}

export interface WalletProvider {
  // providerName: WALLET_PROVIDER,
  // controls which provider is considered default
  // priority: number,
  // internal flag determining if rovider was even injected
  walletAvailable?: boolean,
  // called first in initialization
  checkAvailability(): boolean,
  // creates ocal web3 instance
  initialize(): void,
  state?: ProviderState,
  web3?: any,
  name: string | null,
}

export interface ConnectedInterface {
  registerProvider: Function,
  updateProvider: Function,
  updateMainAppState: Function,
  resetMainAppState: Function,
  initDutchX: Function,
  getState(): State,
}
