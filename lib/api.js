/* eslint-disable no-unused-vars */
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const { LocalStorage } = require('node-localstorage')
const io = require('socket.io-client')
const feathers = require('@feathersjs/feathers')
const socketio = require('@feathersjs/socketio-client')
const auth = require('@feathersjs/authentication-client')
const logger = require('./logger')
const { readKeyPair, sign } = require('./auth')
/* eslint-enables no-unused-vars */

// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    apiOrigin: process.env.API_ORIGIN,
    apiPathname: process.env.API_PATHNAME || '',
    storagePath: process.env.STORAGE_PATH || './.storage'
  }
})
// logger.debug(`argv`, argv)

const storage = new LocalStorage(
  path.resolve(__dirname, '../../' + argv.storagePath)
)

const socket = io(argv.apiOrigin, {
  path: argv.apiPathname + '/socket.io' // default: /socket.io
})

const api = feathers()
api.configure(socketio(socket), { timeout: 1000 })
api.configure(
  auth({
    header: 'Authorization',
    scheme: 'Bearer',
    storageKey: 'feathers-jwt',
    locationKey: 'access_token',
    locationErrorKey: 'error',
    jwtStrategy: 'jwt',
    path: '/authentication',
    Authentication: auth.AuthenticationClient,
    storage
  })
)

// handle access token expired
api.hooks({
  error: {
    all: [handleNotAuthenticated()]
  }
})

function handleNotAuthenticated () {
  return async (context) => {
    const {
      path,
      service,
      error,
      method,
      arguments: [a1, a2, a3]
    } = context
    // context.arguments = [ { name: 'geo9-pi3p1' }, { query: { '$client': {} } } ]
    // logger.debug(`context error`, error)
    // logger.debug(`handleNotAuthenticated`, a1, a2, a3)
    if (error.name !== 'NotAuthenticated') return context
    logger.warn(`${error.message}: trying to refresh access token`)
    let result
    try {
      result = await refreshAccessToken()
      logger.info(`new access token: ${result.accessToken}`)
    } catch (error) {
      logger.warn(`failed to refresh access token`)
      return context
    }
    if (path === 'authentication' && method === 'create') {
      const { strategy } = a1
      if (strategy === 'jwt') {
        logger.info(`trying again: ${path}[${method}]`, {
          strategy,
          accessToken: result.accessToken
        })
        context.result = await service[method]({
          strategy,
          accessToken: result.accessToken
        })
      }
    } else if (path !== 'authentication') {
      logger.info(`trying again: ${path}[${method}]`, a1, a2, a3)
      context.result = await service[method](a1, a2, a3)
    }
    return context
  }
}

async function refreshAccessToken (
  service = 'authenticate',
  strategy = 'ecdsa',
  userId = null
) {
  userId = userId || storage.getItem('user-id')
  if (!userId) throw new Error('userId required')
  const keyPair = readKeyPair()
  if (!keyPair.privateKey || !keyPair.publicKey) {
    throw new Error('keyPair required')
  }
  // logger.debug(`keyPair`, keyPair)
  const { signature, document } = await sign(keyPair, {
    userId
  })
  // logger.debug(`{ signature, document }`, { signature, document })
  // {
  //   signature:
  //     'bnGfjyG7m6YtUFmbHBMrBI5NCg9MxWcgdrmvqi3jO1EvnFStlBtH0Ei6YbAelaKSkdCjCXmDq2iS4DSKJOI4bw==',
  //   document: {
  //     payload: { userId: '5d4c86362cc96e9fb4667619' },
  //     publicKey:
  //       '{"kty":"EC","crv":"P-256","key_ops":["verify"],"x":"vYSJ8JWZkWCI0gUz6dZFoVbWIR-VV8kUZ0LiAPXrZrI","y":"VZUAzGBkAcLhrqZvJYtqrBrmZNz6jXxZLKIu932odWM"}',
  //     timestamp: '2019-08-09T11:02:27.827Z',
  //     userAgent:
  //       'bfdaca43d47406f301471f211210fce990269efbcc7c363ea9e2a11d0ab98ad5'
  //   }
  // }
  const data = {
    strategy,
    signature,
    document
  }
  // logger.info(`${argv.service} data =`, data)
  // const data = {
  //   strategy: 'ecdsa',
  //   signature:
  //     'bnGfjyG7m6YtUFmbHBMrBI5NCg9MxWcgdrmvqi3jO1EvnFStlBtH0Ei6YbAelaKSkdCjCXmDq2iS4DSKJOI4bw==',
  //   document: {
  //     payload: { userId: '5d4c86362cc96e9fb4667619' },
  //     publicKey:
  //       '{"kty":"EC","crv":"P-256","key_ops":["verify"],"x":"vYSJ8JWZkWCI0gUz6dZFoVbWIR-VV8kUZ0LiAPXrZrI","y":"VZUAzGBkAcLhrqZvJYtqrBrmZNz6jXxZLKIu932odWM"}',
  //     timestamp: '2019-08-09T11:02:27.827Z',
  //     userAgent:
  //       'bfdaca43d47406f301471f211210fce990269efbcc7c363ea9e2a11d0ab98ad5'
  //   }
  // }
  const result = await api[service](data)
  // logger.info(`${service} result =`, result)
  // const result = {
  //   accessToken:
  //     'eyJhbGciOiJIUzI1NiIsInR5cCI6ImFjY2VzcyJ9.eyJpYXQiOjE1NjUzNDg1NDcsImV4cCI6MTU2NTM1MDM0NywiaXNzIjoiaGFubC5pbiIsInN1YiI6IjVkNGM4NjM2MmNjOTZlOWZiNDY2NzYxOSIsImp0aSI6IjkyMjdlOTBlLTA0MzEtNDI0Zi1hMzJjLWU4Y2MwNGRkYmFhMCJ9.lG0vWbsiguE_7ynYCNHZAWeh1aHlS4J6m03RyqnHrzU',
  //   authentication: { strategy: 'ecdsa' },
  //   user: {
  //     _id: '5d4c86362cc96e9fb4667619',
  //     accounts: [
  //       {
  //         type: 'email',
  //         value: 'hotdogee@gmail.com',
  //         verified: '2019-08-08T20:32:27.430Z'
  //       }
  //     ],
  //     language: 'en',
  //     country: 'tw',
  //     created: '2019-08-08T20:29:42.713Z',
  //     updated: '2019-08-08T20:32:27.431Z',
  //     authorizations: [{ org: 'hanl.in', role: 'admin' }]
  //   }
  // }
  return result
}

module.exports = {
  api,
  socket,
  storage,
  refreshAccessToken
}
