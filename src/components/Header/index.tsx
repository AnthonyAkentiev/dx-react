import React, { ComponentClass } from 'react'

import MenuWallet from 'containers/MenuWallet'
import MenuAuctions from 'containers/MenuAuctions'
import Hamburger from 'components/Hamburger'
import MenuFeeBalance from 'containers/MenuFeeBalance'
import { Link } from 'react-router-dom'
import { connect } from 'react-redux'
import { State } from 'types'
import { withRouter } from 'react-router'
import { getActiveProviderObject } from 'selectors'

interface HeaderProps {
  content?: boolean;
}

interface HeaderState {
  network?: string | 'RINKEBY' | 'MAIN' | 'UNKNOWN';
}

export const Header = ({ content, network }: HeaderProps & HeaderState) => (
  <header className={content ? 'solid-background' : ''}>
    <div>
      <Link to="/" title="DutchX - Dutch Auction Exchange" className={`logo ${network && network.toLowerCase()}`}></Link>
      <MenuWallet />
      <MenuAuctions />
      <MenuFeeBalance />
      <Hamburger />
    </div>
  </header>
)

const mapState = (state: State) => {
  const provider = getActiveProviderObject(state)

  return { network: provider ? provider.network : 'UNKNOWN NETWORK' }
}

export default withRouter(
  connect<HeaderState>(mapState)(Header) as ComponentClass<any>,
) as ComponentClass<HeaderProps>
