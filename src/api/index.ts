import { promisedWeb3 } from './web3Provider'
import { promisedTokens } from './Tokens'
import { promisedDutchX } from './dutchx'

import { toBigNumber } from 'web3/lib/utils/utils.js'

import { TokenCode, TokenPair, Account, Balance, BigNumber, AuctionObject } from 'types'
import { dxAPI, Index, DefaultTokenList, DefaultTokenObject, DutchExchange, Receipt, Hash } from './types'
import { promisedContractsMap } from './contracts'
import { ETH_ADDRESS, FIXED_DECIMALS } from 'globals'

const promisedAPI = /* (window as any).AP = */ initAPI()

/* =================================================================
====================================================================
WEB3 API
====================================================================
===================================================================*/

export const toBN = async (x: string | number) => {
  const { web3: { web3 } } = await promisedAPI

  return web3.toBigNumber(x)
}

export const toNative = async (amt: string | number | BigNumber, decimal: number): Promise<BigNumber> => {
  const { web3: { web3 } } = await promisedAPI

  return web3.toBigNumber(amt).mul(10 ** decimal)
}

export const toWei = async (amt: string | number | BigNumber): Promise<BigNumber> => {
  const { web3: { web3 } } = await promisedAPI

  return web3.toBigNumber(web3.toWei(amt))
}

export const toEth = async (amt: number | string | BigNumber): Promise<string> => {
  const { web3: { web3 } } = await promisedAPI

  return web3.toBigNumber(web3.fromWei(amt))
}

export const getCurrentAccount = async () => {
  const { web3 } = await promisedAPI

  return web3.getCurrentAccount()
}

export const fillDefaultAccount = (account?: Account) => !account ? getCurrentAccount() : account

export const getAllAccounts = async () => {
  const { web3 } = await promisedAPI

  return web3.getAccounts()
}

// Web3 ether balance, not ETH tokens
export const getETHBalance = async (account?: Account, inETH?: boolean) => {
  const { web3 } = await promisedAPI
  account = await web3.getCurrentAccount()

  return web3.getETHBalance(account, inETH)
}

export const getTime = async () => {
  const { web3 } = await promisedAPI

  return web3.getTimestamp()
}

/* =================================================================
====================================================================
TOKENS API
====================================================================
===================================================================*/

// ETH token balance
// TODO: delete or keep
/* export const getCurrentBalance = async (tokenName: TokenCode = 'ETH', account?: Account) => {
  account = await fillDefaultAccount(account)

  if (tokenName && tokenName === 'ETH') {
    const { getETHBalance } = await promisedWeb3

    return getETHBalance(account)
  }

  const { Tokens } = await promisedAPI
  // account would normally be taken from redux state and passed inside an action
  // but just in case

  // should probably change name here to WETH
  return Tokens.getTokenBalance(tokenName, account)
} */

export const getTokenDecimals = async (tokenAddress: Account) => {
  const { Tokens } = await promisedAPI

  try {
    return (await Tokens.getTokenDecimals(tokenAddress)).toNumber()
  } catch (e) {
    console.warn(`Token @ address ${tokenAddress} has no Decimals value set - defaulting to 18`)
    return 18
  }
}

export const getAllTokenDecimals = async (tokenList: DefaultTokenObject[]) => {
  const tokenDecimalsArr = await Promise.all(tokenList.map(tok => getTokenDecimals(tok.address)))
  return tokenList.map((tok, index) => ({
    ...tok,
    decimals: tokenDecimalsArr[index],
  }))
}

export const getTokenBalance = async (tokenAddress: Account, account?: Account) => {
  account = await fillDefaultAccount(account)

  const { Tokens } = await promisedAPI

  // ETH (not wrapped ETH) is given user's account as it's `token address`
  // here, check if the ETH address (user's address) matches the default account above
  if (tokenAddress === ETH_ADDRESS) return getETHBalance(account, false)

  return Tokens.getTokenBalance(tokenAddress, account)
}

// TODO: remove ['ETH', 'GNO'] default, use actions for this
export const getTokenBalances = async (tokenList: DefaultTokenObject[], account?: Account) => {
  account = await fillDefaultAccount(account)

  const balances = await Promise.all(tokenList.map(tok =>
    getTokenBalance(tok.address, account).catch(() => {
      console.warn('Could not grab balance of specified Token @ ', tok.address, ' defaulting to 0')
      return toBigNumber(0)
    })))

  // [{ name: 'ETH': balance: Balance }, { ... }]
  return tokenList.map((token, i) => ({
    name: token.symbol || token.name || token.address || 'Unknown Token',
    decimals: token.decimals,
    address: token.address,
    balance: balances[i] as BigNumber,
  }))
}

export const getLockedMGNBalance = async (account?: Account) => {
  const { TokenMGN } = await promisedContractsMap
  account = await fillDefaultAccount(account)

  return TokenMGN.lockedTokenBalances.call(account)
}

export const getEtherTokenBalance = async (account?: Account) => {
  const { Tokens: { ethTokenBalance } } = await promisedAPI
  account = await fillDefaultAccount(account)

  return ethTokenBalance(account)
}

export const getTokenAllowance = async (tokenAddress: Account, userAddress?: Account) => {
  const { DutchX, Tokens } = await promisedAPI
  userAddress = await fillDefaultAccount(userAddress)

  return Tokens.allowance(tokenAddress, userAddress, DutchX.address)
}
interface TokenApproval<T = Receipt> {
  (tokenAddress: Account, amount: Balance, userAddress?: Account): Promise<T>,
  sendTransaction?: T extends Hash ? never :  TokenApproval<Hash>,
}
export const tokenApproval: TokenApproval = async (tokenAddress: Account, amount: Balance, userAddress?: Account) => {
  const { DutchX, Tokens } = await promisedAPI
  userAddress = await fillDefaultAccount(userAddress)

  return Tokens.approve(tokenAddress, DutchX.address, amount, { from: userAddress })
}

tokenApproval.sendTransaction = async (tokenAddress: Account, amount: Balance, userAddress?: Account) => {
  const { DutchX, Tokens } = await promisedAPI
  userAddress = await fillDefaultAccount(userAddress)

  return Tokens.approve.sendTransaction(tokenAddress, DutchX.address, amount, { from: userAddress })
}

export const tokenSupply = async (tokenAddress: Account) => {
  const { Tokens } = await promisedAPI

  return Tokens.getTotalSupply(tokenAddress)
}

interface DepositETH<T = Receipt> {
  (amount: Balance, userAddress?: Account): Promise<T>,
  sendTransaction?: T extends Hash ? never :  DepositETH<Hash>,
}

export const depositETH: DepositETH = async (amount: Balance, userAddress?: Account) => {
  const { Tokens } = await promisedAPI
  userAddress = await fillDefaultAccount(userAddress)

  return Tokens.depositETH({ from: userAddress, value: amount })
}

depositETH.sendTransaction = async (amount: Balance, userAddress?: Account) => {
  const { Tokens } = await promisedAPI
  userAddress = await fillDefaultAccount(userAddress)

  return Tokens.depositETH.sendTransaction({ from: userAddress, value: amount })
}

/* =================================================================
====================================================================
DUTCH-EXCHANGE API
====================================================================
===================================================================*/

export const getLatestAuctionIndex = async (pair: TokenPair) => {
  const { sell, buy } = pair
  if (!sell || !buy) return

  const { DutchX } = await promisedAPI

  return DutchX.getLatestAuctionIndex(pair)
}

/*
 * closingPrice - get's closingPrice of Auction
 * @param sellToken
 * @param buyToken
 * @param aDiff - Number to offset auctionIndex by - if left blank defaults to lastAuction (-1)
 * @returns [BigNumber(num), BigNumber(den)]
 */
export const closingPrice = async (pair: TokenPair, aDiff: number = -1) => {
  const { DutchX } = await promisedAPI

  const currentAuctionIdx = await DutchX.getLatestAuctionIndex(pair)

  const auctionIdx = currentAuctionIdx.add(aDiff)
  // Guard against negative index
  if (auctionIdx.lessThan(0) || auctionIdx.eq(currentAuctionIdx)) {
    return Promise.reject(`Invalid auction index ${auctionIdx}. Auction index must be >= 0 and < ${currentAuctionIdx}`)
  }

  return DutchX.getClosingPrice(pair, auctionIdx)
}

export const getClosingPrice = async (pair: TokenPair, auctionIndex?: Index) => {
  const { DutchX } = await promisedAPI

  if (auctionIndex === undefined) auctionIndex = await DutchX.getLatestAuctionIndex(pair)

  return DutchX.getClosingPrice(pair, auctionIndex)
}

export const getLastAuctionPrice = async (pair: TokenPair, auctionIndex?: Index) => {
  const { DutchX } = await promisedAPI

  if (auctionIndex === undefined) auctionIndex = await DutchX.getLatestAuctionIndex(pair)

  return DutchX.getLastAuctionPrice(pair, auctionIndex)
}

export const getPrice = async (pair: TokenPair, auctionIndex?: Index) => {
  const { DutchX } = await promisedAPI

  if (auctionIndex === undefined) auctionIndex = await DutchX.getLatestAuctionIndex(pair)

  return DutchX.getPrice(pair, auctionIndex)
}

export const getAuctionStart = async (pair: TokenPair) => {
  const { DutchX } = await promisedAPI

  return DutchX.getAuctionStart(pair)
}

export const approveAndPostSellOrder = async (
  sell: DefaultTokenObject,
  buy: DefaultTokenObject,
  amount: Balance,
  index: Index,
  account?: Account,
) => {
  const { Tokens, DutchX } = await promisedAPI
  const pair = { sell, buy }
  account = await fillDefaultAccount(account)

  // TODO: in future ask for a larger allowance
  const receipt = await Tokens.approve(sell.address, DutchX.address, amount, { from: account })
  console.log('approved tx', receipt)

  return DutchX.postSellOrder(pair, amount, index, account)
}

interface PostSellOrder<T = Receipt> {
  (
    sell: DefaultTokenObject,
    buy: DefaultTokenObject,
    amount: Balance,
    index: Index,
    account?: Account,
  ): Promise<T>,
  sendTransaction?: T extends Hash ? never : PostSellOrder<Hash>,
}

// TODO: pass in the whole TokenPair from the action
export const postSellOrder: PostSellOrder = async (
  sell: DefaultTokenObject,
  buy: DefaultTokenObject,
  amount: Balance,
  index: Index,
  account?: Account,
) => {
  const { DutchX } = await promisedAPI
  const pair = { sell, buy }
  account = await fillDefaultAccount(account)

  return DutchX.postSellOrder(pair, amount, index, account)
}

postSellOrder.call = async (
  sell: DefaultTokenObject,
  buy: DefaultTokenObject,
  amount: Balance,
  index: Index,
  account?: Account,
) => {
  const { DutchX } = await promisedAPI
  const pair = { sell, buy }
  account = await fillDefaultAccount(account)

  return DutchX.postSellOrder.call(pair, amount, index, account)
}

postSellOrder.sendTransaction = async (
  sell: DefaultTokenObject,
  buy: DefaultTokenObject,
  amount: Balance,
  index: Index,
  account?: Account,
) => {
  const { DutchX } = await promisedAPI
  const pair = { sell, buy }
  account = await fillDefaultAccount(account)

  return DutchX.postSellOrder.sendTransaction(pair, amount, index, account)
}

interface DepositAndSell<T = Receipt> {
  (
    sell: DefaultTokenObject,
    buy: DefaultTokenObject,
    amount: Balance,
    account?: Account,
  ): Promise<T>,
  sendTransaction?: T extends Hash ? never :  DepositAndSell<Hash>,
}

export const depositAndSell: DepositAndSell = async (
  sell: DefaultTokenObject,
  buy: DefaultTokenObject,
  amount: Balance,
  account?: Account,
) => {
  const { DutchX } = await promisedAPI
  const pair = { sell, buy }
  account = await fillDefaultAccount(account)

  return DutchX.depositAndSell(pair, amount, account)
}

depositAndSell.call = async (
  sell: DefaultTokenObject,
  buy: DefaultTokenObject,
  amount: Balance,
  account?: Account,
) => {
  const { DutchX } = await promisedAPI
  const pair = { sell, buy }
  account = await fillDefaultAccount(account)

  return DutchX.depositAndSell.call(pair, amount, account)
}

depositAndSell.sendTransaction = async (
  sell: DefaultTokenObject,
  buy: DefaultTokenObject,
  amount: Balance,
  account?: Account,
) => {
  const { DutchX } = await promisedAPI
  const pair = { sell, buy }
  account = await fillDefaultAccount(account)

  return DutchX.depositAndSell.sendTransaction(pair, amount, account)
}

export const getDXTokenBalance = async (tokenAddress: Account, userAccount?: Account) => {
  const { DutchX } = await promisedAPI
  userAccount = await fillDefaultAccount(userAccount)

  return DutchX.getDXTokenBalance(tokenAddress, userAccount)
}

/*
 * get seller balance from auction corresponding to a pair of tokens at an index
 * @param pair TokenPair
 * @param index auctionIndex, current auction by default
 * @param account userccount, current web3 account by default
 */
export const getSellerBalance = async (pair: TokenPair, index?: Index, account?: Account) => {
  const { DutchX } = await promisedAPI;

  [index, account] = await Promise.all<Index, Account>([
    index === undefined ? DutchX.getLatestAuctionIndex(pair) : index,
    fillDefaultAccount(account),
  ])

  return DutchX.getSellerBalances(pair, index, account)
}

/*
 * gets sell volume from auction corresponding to a pair of tokens
 * @param pair TokenPair
 */
export const getSellVolumeCurrent = async (pair: TokenPair) => {
  const { DutchX } = await promisedAPI

  return DutchX.getSellVolumesCurrent(pair)
}

/*
 * gets buy volume from auction corresponding to a pair of tokens
 * @param pair TokenPair
 */
export const getBuyVolume = async (pair: TokenPair) => {
  const { DutchX } = await promisedAPI

  return DutchX.getBuyVolumes(pair)
}

interface OutstandingVolumeArgs {
  sellVolume?: BigNumber,
  buyVolume?: BigNumber,
  price?: [BigNumber, BigNumber],
  auctionIndex?: Index,
}

/*
 * gets buy volume from auction corresponding to a pair of tokens
 * @param pair TokenPair
 * @param opts
 * @param opts.sellVolume
 * @param opts.buyVolume
 * @param opts.price
 * @param opts.auctionIndex
 */
export const getOutstandingVolume = async (
  pair: TokenPair,
  { sellVolume, buyVolume, price, auctionIndex }: OutstandingVolumeArgs = {},
): Promise<BigNumber> => {
  const { DutchX } = await promisedAPI;

  [sellVolume, buyVolume, price] = await Promise.all([
    sellVolume || DutchX.getSellVolumesCurrent(pair),
    buyVolume || DutchX.getBuyVolumes(pair),
    price || DutchX.getPrice(pair, auctionIndex),
  ])

  const outstandingVolume = sellVolume.mul(price[0]).div(price[1]).sub(buyVolume)

  return outstandingVolume.lt(0) ? toBigNumber(0) : outstandingVolume
}

/*
 * claim seller funds from auction corresponding to a pair of tokens at an index
 * @param pair TokenPair
 * @param index auctionIndex, current auction by default
 * @param account userccount, current web3 account by default
 */
export const claimSellerFunds = async (pair: TokenPair, index?: Index, account?: Account) => {
  const { DutchX } = await promisedAPI

  return DutchX.claimSellerFunds(pair, index, account)
}

/*
 * claim seller funds from auction corresponding to a pair of tokens at an index
 * and withdraw an amount in one call
 * @param pair TokenPair
 * @param index auctionIndex, current auction by default
 * @param account userccount, current web3 account by default
 */
export const claimSellerFundsAndWithdraw = async (
  pair: TokenPair,
  index?: Index,
  amount?: BigNumber,
  account?: Account,
) => {
  const { DutchX } = await promisedAPI

  return DutchX.claimAndWithdraw(pair, index, amount, account)
}

export const getUnclaimedSellerFunds = async (pair: TokenPair, index?: Index, account?: Account) => {
  const { DutchX, web3: { web3 } } = await promisedAPI;

  [index, account] = await Promise.all<Index, Account>([
    index === undefined ? DutchX.getLatestAuctionIndex(pair) : index,
    fillDefaultAccount(account),
  ])

  try {
    const [claimable] = await DutchX.claimSellerFunds.call(pair, index, account)
    console.log('claimable: ', claimable)
    return claimable as BigNumber
  } catch (e) {
    console.log('Nothing to claim')
    return web3.toBigNumber(0) as BigNumber
  }
}

interface ClaimSellerFundsFromSeveralAuctions<T = Receipt> {
  (
  sell: DefaultTokenObject,
  buy: DefaultTokenObject,
  userAccount?: Account,
  indices?: number,
  ): Promise<T>,
  sendTransaction?: T extends Hash ? never :  ClaimSellerFundsFromSeveralAuctions<Hash>,
}

export const claimSellerFundsFromSeveralAuctions: ClaimSellerFundsFromSeveralAuctions = async (
  sell: DefaultTokenObject,
  buy: DefaultTokenObject,
  userAccount?: Account,
  indices: number = 0,
) => {
  const { DutchX } = await promisedAPI
  userAccount = await fillDefaultAccount(userAccount)

  const claimableIndices = (
    await DutchX.getIndicesWithClaimableTokensForSellers({ sell, buy }, userAccount, indices)
  )[0].map(i => i.toNumber())

  if (claimableIndices.length === 0) return

  // getIndicesWithClaimableTokensForSellers returns auctions with sellBalance > 0
  // this means currentAucIndx may have > 0 sellBalance BUT NOT HAVE CLEARED (only last Index though)
  const lastIndexCleared = (
    await DutchX.getClosingPrice({ sell, buy }, claimableIndices[claimableIndices.length - 1])
  )[0].gt(0)

  const length = lastIndexCleared ? claimableIndices.length : claimableIndices.length - 1

  const finalIndices = claimableIndices.slice(0, length)
  const sellArr = Array.from({ length }, () => sell.address)
  const buyArr = Array.from({ length }, () => buy.address)

  console.log('Params = ', sellArr, buyArr, finalIndices, userAccount)
  return DutchX.claimTokensFromSeveralAuctionsAsSeller(sellArr, buyArr, finalIndices, userAccount)
}

claimSellerFundsFromSeveralAuctions.sendTransaction = async (
  sell: DefaultTokenObject,
  buy: DefaultTokenObject,
  userAccount?: Account,
  indices: number = 0,
) => {
  const { DutchX } = await promisedAPI
  userAccount = await fillDefaultAccount(userAccount)

  const claimableIndices = (
    await DutchX.getIndicesWithClaimableTokensForSellers({ sell, buy }, userAccount, indices)
  )[0].map(i => i.toNumber())

  if (claimableIndices.length === 0) return

  // getIndicesWithClaimableTokensForSellers returns auctions with sellBalance > 0
  // this means currentAucIndx may have > 0 sellBalance BUT NOT HAVE CLEARED (only last Index though)
  const lastIndexCleared = (
    await DutchX.getClosingPrice({ sell, buy }, claimableIndices[claimableIndices.length - 1])
  )[0].gt(0)

  const length = lastIndexCleared ? claimableIndices.length : claimableIndices.length - 1

  const finalIndices = claimableIndices.slice(0, length)
  const sellArr = Array.from({ length }, () => sell.address)
  const buyArr = Array.from({ length }, () => buy.address)

  console.log('Params = ', sellArr, buyArr, finalIndices, userAccount)
  return DutchX.claimTokensFromSeveralAuctionsAsSeller.sendTransaction(sellArr, buyArr, finalIndices, userAccount)
}

/*
 * get amount of funds already claimed for auction corresponding to a pair of tokens at an index
 * @param pair TokenPair
 * @param index auctionIndex, current auction by default
 * @param account userccount, current web3 account by default
 */
export const getClaimedAmounts = async (pair: TokenPair, index?: Index, account?: Account) => {
  const { DutchX } = await promisedAPI

  return DutchX.getClaimedAmounts(pair, index, account)
}

/**
 * getFeeRatio - returns decimal - must be converted to Percent
 * @param account - Account
 */
export const getFeeRatio = async (account: Account) => {
  const { DutchX } = await promisedAPI
  account = await fillDefaultAccount(account)

  const [num, den] = await DutchX.getFeeRatio(account)
  return num.div(den)
}

/*
 * deposit amount of a tokens for the DutchExchange auction to hold in the account's name
 * @param pair TokenPair
 * @param index auctionIndex, current auction by default
 * @param account userccount, current web3 account by default
 */
export const deposit = async (code: TokenCode, amount: Balance, account?: Account) => {
  const { DutchX } = await promisedAPI

  return DutchX.deposit(code, amount, account)
}

deposit.call = async (code: TokenCode, amount: Balance, account?: Account) => {
  const { DutchX } = await promisedAPI

  return DutchX.deposit.call(code, amount, account)
}

interface Withdraw<T = Receipt> {
  (
  tokenAddress: string,
  amount?: Balance,
  userAccount?: Account,
  ): Promise<T>,
  sendTransaction?: T extends Hash ? never :  Withdraw<Hash>,
}

/*
 * withdraw tokens that the DutchExchange auction is holding in the account's name
 * @param pair TokenPair
 * @param index auctionIndex, current auction by default
 * @param account userccount, current web3 account by default
 *
 * If AMOUNT is left out, withdraws ALL funds
 */
export const withdraw: Withdraw = async (tokenAddress: string, amount?: Balance, userAccount?: Account) => {
  const { DutchX } = await promisedAPI
  userAccount = await fillDefaultAccount(userAccount)

  const withdrawableBalance = await DutchX.getDXTokenBalance(tokenAddress, userAccount)
  if (withdrawableBalance.lte(0)) throw new Error('Withdraw balance cannot be 0')

  return amount ? DutchX.withdraw(tokenAddress, amount, userAccount) : DutchX.withdraw(tokenAddress, withdrawableBalance, userAccount)
}

withdraw.sendTransaction = async (tokenAddress: string, amount?: Balance, userAccount?: Account) => {
  const { DutchX } = await promisedAPI
  userAccount = await fillDefaultAccount(userAccount)

  const withdrawableBalance = await DutchX.getDXTokenBalance(tokenAddress, userAccount)
  // if (withdrawableBalance.lte(0)) throw new Error('Withdraw balance cannot be 0')

  return amount ? DutchX.withdraw.sendTransaction(tokenAddress, amount, userAccount) : DutchX.withdraw.sendTransaction(tokenAddress, withdrawableBalance, userAccount)
}

// helper fro getting last index of a token pair and closing price
// of it's direct and reciprocal auctions
const getLastAuctionStats = async (DutchX: DutchExchange, pair: TokenPair, account: Account) => {
  const lastIndex = await DutchX.getLatestAuctionIndex(pair)
  console.log('lastIndex: ', lastIndex.toString())
  console.log('lastIndex + 1: ', lastIndex.add(1).toString())
  const oppositePair = { sell: pair.buy, buy: pair.sell }
  const [closingPriceDir, closingPriceOpp, normal, inverse, sellVolNormal, sellVolInverse] = await Promise.all([
    DutchX.getClosingPrice(pair, lastIndex),
    DutchX.getClosingPrice(oppositePair, lastIndex),
    DutchX.getSellerBalances(pair, lastIndex.add(1), account),
    DutchX.getSellerBalances(oppositePair, lastIndex.add(1), account),
    DutchX.getSellerBalances(pair, lastIndex, account),
    DutchX.getSellerBalances(oppositePair, lastIndex, account),
  ])

  return {
    lastIndex,
    closingPrices: {
      closingPriceDir,
      closingPriceOpp,
    },
    sellVolumeNext: { normal, inverse },
    sellVolNormal, sellVolInverse,
  }
}

interface CheckClaimableStatus {
  claimableIndices: BigNumber[];
  idx: BigNumber;
  closingPricePair: BigNumber[];
}

const checkClaimableStatus = ({ claimableIndices, idx, closingPricePair }: CheckClaimableStatus) => {
  if (claimableIndices.length >= 2) return true

  if (claimableIndices.length === 1) {
    if (idx.equals(claimableIndices.last())) return closingPricePair[1].gt(0)
    if (idx.greaterThan(claimableIndices.last())) return true
  }
  return false
}

export const getIndicesWithClaimableTokensForSellers = async (
  pair: TokenPair,
  userAccount?: Account,
  lastNAuctions: number = 0,
) => {
  const { DutchX } = await promisedAPI
  userAccount = await fillDefaultAccount(userAccount)

  return DutchX.getIndicesWithClaimableTokensForSellers(pair, userAccount, lastNAuctions)
}

/**
* getSellerOngoingAuctions
* Multi-Dimensional fn
    1. Grabs running Auctions from all active Tokens on DX (@param tokensJSON)
    2. Reduce @param tokensJSON into new Array: ongoingAuctions built of Auction Objects consisting of:
      i.  tokenName
      ii. address
    3. Loop through ongoingAuctions Array and attach Indices of auctions + check if there are claimableTokens
* @param { DefaultTokenObject[] } tokensJSON
* @param account
* @returns { Promise<AuctionObject[]> } returns new Array of AuctionObject
*/
export const getSellerOngoingAuctions = async (
  tokensJSON: DefaultTokenList,
  account: Account,
): Promise<AuctionObject[]> => {
  const { DutchX } = await promisedAPI
  // assuming tokensJSON comes in form:
  // defaultToken = { name: 'Ether Token', address: '0xAg9823nfejcdksak1o38fFa09384', imgBytes: [ ... ] }
  const tokensJSONAddresses: Account[] = tokensJSON.map(t => t.address)
  try {
    const runningPairsArr = await DutchX.getRunningTokenPairs(tokensJSONAddresses)

    // TODO: addressesToTokenJSON can be calculated once when we get the list from IPFS
    // or at least memoize calculation with reselect
    const addressesToTokenJSON = tokensJSON.reduce((acc, tk) => {
      acc[tk.address] = tk
      return acc
    }, {}) as { [P in TokenCode]: DefaultTokenObject }
    const [runningPairsS, runningPairsB] = runningPairsArr

    interface promisedClaimableTokensObjectInterface {
      normal: Promise<[BigNumber[], BigNumber[]]>[];
      inverse: Promise<[BigNumber[], BigNumber[]]>[];
    }

    const promisedClaimableTokensObject: promisedClaimableTokensObjectInterface = {
      normal: [],
      inverse: [],
    }
    const lastAuctionPerPair: Promise<{
      lastIndex: BigNumber,
      closingPrices: {
        closingPriceDir: [BigNumber, BigNumber],
        closingPriceOpp: [BigNumber, BigNumber],
      },
      sellVolumeNext: { normal: BigNumber, inverse: BigNumber },
      sellVolNormal: BigNumber, sellVolInverse: BigNumber,
    }>[] = []

    const ongoingAuctions: {
      sell: DefaultTokenObject,
      buy: DefaultTokenObject,
    }[] = runningPairsS.reduce((accum, sellAddress, index) => {

      const buyAddress = runningPairsB[index]

      const sell = addressesToTokenJSON[sellAddress]
      const buy = addressesToTokenJSON[buyAddress]
      if (sell && buy) {
        const pair: TokenPair = { sell, buy },
          inversePair: TokenPair = { sell: buy, buy: sell }
        accum.push(pair)
        promisedClaimableTokensObject.normal.push(
          getIndicesWithClaimableTokensForSellers(pair, account, 0),
        )
        promisedClaimableTokensObject.inverse.push(
          getIndicesWithClaimableTokensForSellers(inversePair, account, 0),
        )

        lastAuctionPerPair.push(getLastAuctionStats(DutchX, pair, account))
      }

      return accum
    }, [])

    console.log('​ongoingAuctions', ongoingAuctions)
    if (ongoingAuctions.length === 0) return []

    // Checks ongoingAuctions Array if each ongoingAuction has claimable Tokens
    // Array indices are lined up
    // @returns => forEach ongoingAuction => (indices[], userBalanceInSpecificAuction[]) => e.g for: ETH/GNO => (indices[], userBalance[])
    const [claimableTokens, inverseClaimableTokens, lastAuctionsData] = await Promise.all([
      Promise.all(promisedClaimableTokensObject.normal),
      Promise.all(promisedClaimableTokensObject.inverse),
      Promise.all(lastAuctionPerPair),
    ])

    // consider adding LAST userBalance from claimableTokens to ongoingAuctions object as COMMITTED prop
    const auctionsArray: AuctionObject[] = ongoingAuctions.reduce((accum, auction, index) => {
      // indices of auctions for which there is sellerBalance > 0
      // that is past auctions with claimable tokens
      // or current auction with committed tokens
      const [indicesWithSellerBalance, balancePerIndex] = claimableTokens[index]
      const [indicesWithSellerBalanceInverse, balancePerIndexInverse] = inverseClaimableTokens[index]
      let ongoingAuction: AuctionObject

      const { sell: { decimals }, buy: { decimals: decimalsInverse } } = auction

      const { lastIndex, closingPrices: { closingPriceDir, closingPriceOpp }, sellVolumeNext, sellVolNormal, sellVolInverse } = lastAuctionsData[index]

      const currAuctionNeverRanDir = sellVolNormal.eq(0) && closingPriceDir[1].eq(0)
      const currAuctionNeverRanOpp = sellVolInverse.eq(0) && closingPriceOpp[1].eq(0)
      const committedToNextNormal = sellVolumeNext.normal.gt(0)
      const committedToNextInverse = sellVolumeNext.inverse.gt(0)

      console.log(`
        closingPriceDir: ${closingPriceDir}
        closingPriceOpp: ${closingPriceOpp}

        sellVolNormal: ${sellVolNormal}
        sellVolInverse: ${sellVolInverse}

        currAuctionNeverRanDir: ${currAuctionNeverRanDir}
        currAuctionNeverRanOpp: ${currAuctionNeverRanOpp}
      `)

      if (  // if there are truly no auctions with sellBalance
        !committedToNextNormal && !committedToNextInverse &&
        indicesWithSellerBalance.length === 0 && indicesWithSellerBalanceInverse.length === 0
      ) return accum

      let latestIndicesNormal: BigNumber[] = indicesWithSellerBalance,
        latestIndicesReverse: BigNumber[] = indicesWithSellerBalanceInverse

      if (committedToNextNormal && currAuctionNeverRanDir) {
        // if (currAuctionNeverRanDir)
        latestIndicesNormal = [...indicesWithSellerBalance, lastIndex.add(1)]
        balancePerIndex.push(sellVolumeNext.normal)
      }
      if (committedToNextInverse && currAuctionNeverRanOpp) {
        latestIndicesReverse = [...indicesWithSellerBalanceInverse, lastIndex.add(1)]
        balancePerIndexInverse.push(sellVolumeNext.inverse)
      }

      ongoingAuction = {
        ...auction,
        indicesWithSellerBalance: latestIndicesNormal,
        indicesWithSellerBalanceInverse: latestIndicesReverse,
        balancePerIndex: balancePerIndex.map(i => i.div(10 ** decimals).toFixed(FIXED_DECIMALS)),
        balancePerIndexInverse: balancePerIndexInverse.map(i => i.div(10 ** decimalsInverse).toFixed(FIXED_DECIMALS)),
        claim: checkClaimableStatus({ claimableIndices: indicesWithSellerBalance, idx: lastIndex, closingPricePair: closingPriceDir }),
        claimInverse: checkClaimableStatus({ claimableIndices: indicesWithSellerBalanceInverse, idx: lastIndex, closingPricePair: closingPriceOpp }),
      }

      accum.push(ongoingAuction)
      return accum
    }, [])

    return Promise.all(auctionsArray)
  } catch (e) {
    console.warn(e)
    return []
  }
}

/**
 * returns a list of approved token addresses
 * @param tokensJSON - DefaultTokenList
 * @return addresses - Account[] of approved tokens from the tokensJSON
 */
export const getApprovedTokensFromAllTokens = async (tokensJSON: DefaultTokenList): Promise<Account[]> => {
  const tokenAddresses = tokensJSON.map(token => token.address)

  const { DutchX } = await promisedAPI

  const approvalMap = await DutchX.getApprovedAddressesOfList(tokenAddresses)

  return tokenAddresses.filter((_, i) => approvalMap[i])
}

/**
 * returns a list of tradable token pairs ["address1-address2"]
 * @param tokensJSON - DefaultTokenList
 * @return address1-address2 - Account[] of approved tokens from the tokensJSON
 */
export const getAvailableAuctionsFromAllTokens = async (tokensJSON: DefaultTokenList): Promise<Account[]> => {
  // const tokenAddresses = tokensJSON.map(token => token.address)

  const { DutchX } = await promisedAPI
  const auctionPairs: string[] = []
  const auctionPairsPromises = []

  for (let i = 0, len = tokensJSON.length; i < len; ++i) {
    const sell = tokensJSON[i]

    for (let j = i + 1, len = tokensJSON.length; j < len; ++j) {
      const buy = tokensJSON[j]

      const directPromise =  DutchX.getLatestAuctionIndex({ sell, buy })
        .then((latestAuctionIndexDirect) => {
          if (latestAuctionIndexDirect.gt(0)) {
            console.log(`${sell.symbol}-${buy.symbol} / ${buy.symbol}-${sell.symbol} auction is available, latestIndex = ${latestAuctionIndexDirect}`)
            auctionPairs.push(`${sell.address}-${buy.address}`, `${buy.address}-${sell.address}`)
          }
        })

      auctionPairsPromises.push(directPromise)
    }
  }

  await Promise.all(auctionPairsPromises)

  return auctionPairs
}

async function initAPI(): Promise<dxAPI> {
  try {
    const [web3, Tokens, DutchX] = await Promise.all([
      promisedWeb3,
      promisedTokens,
      promisedDutchX,
    ])
    console.log('INDEX API => ', { web3, Tokens, DutchX })
    return { web3, Tokens, DutchX }
  } catch (err) {
    console.error('Error in init - API has not been initialised')
  }
}
