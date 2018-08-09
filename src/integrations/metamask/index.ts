// import { WALLET_PROVIDER } from 'globals'
import { WalletProvider } from '../types'
import Web3 from 'web3'

const Provider: WalletProvider = {
  checkAvailability() {
    if (this.web3) return this.walletAvailable = this.web3.isConnected()
    return this.walletAvailable = typeof window.web3 !== 'undefined' && window.web3.currentProvider
  },

  get name() {
    if (!this.checkAvailability()) return null
    return window.web3.currentProvider.constructor.name
  },

  initialize() {
    if (!this.checkAvailability()) return
    this.web3 = new Web3(window.web3.currentProvider)
    this.state = {}
  },
}

export default Provider
