import * as React from 'react';

const { storiesOf } = require('@storybook/react')
const { action } = require('@storybook/addon-actions')
const { linkTo } = require('@storybook/addon-links/')
const { Button, Welcome } = require('@storybook/react/demo')

import createStoreWithHistory from '../src/store.js'
import createHistory from 'history/createBrowserHistory'
const history = createHistory()
const store = createStoreWithHistory(history)
import { Provider } from 'react-redux'

import BalanceButton from '../src/containers/BalanceButton/'
import Header from '../src/components/Header'

storiesOf('Welcome', module).add('to Storybook', () => <Welcome showApp={linkTo('Button')} />);

storiesOf('App/Button', module)
  .addDecorator((story: any) => <Provider store={store as any}>{story()}</Provider>)
  .add('with text', () => <Button onClick={action('clicked')}>Hello Button</Button>)
  .add('with some emoji', () => <Button onClick={action('clicked')}>😀 😎 👍 💯</Button>)
  .add('some random button', () => <Button>Hello World</Button>)
  .add('BalanceButton Container', () => <BalanceButton>This is a Balance Button</BalanceButton>)

storiesOf('Header', module)
  .addDecorator((story: any) => <Provider store={store as any}>{story()}</Provider>)
  .add('Dumb Header', () => <Header />)
