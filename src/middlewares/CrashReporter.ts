import { Middleware, Action } from 'redux'
import { ThunkAction } from 'redux-thunk'
import { push } from 'connected-react-router'
// import { State } from 'types'

/**
 * Sends crash reports as state is updated and listeners are notified.
 */
const CrashReporter: Middleware = () => next => (action: ThunkAction<Action, any, void>) => {
  try {
    return next(action)
  } catch (err) {
    console.error('Caught an exception!', err)
    next(push('/'))
    throw err
  }
}

export default CrashReporter
