const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })
const { machineId } = require('node-machine-id')
const WebCrypto = require('node-webcrypto-ossl') // this defines global.btoa and global.atob

// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    keystorePath: process.env.KEYSTORE_PATH || './.keystore'
  }
})

const webcrypto = new WebCrypto({
  directory: path.resolve(__dirname, '../../' + argv.keystorePath)
})
const keyStorage = webcrypto.keyStorage

async function generateKeyPair () {
  const keyPair = await webcrypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256' // can be 'P-256', 'P-384', or 'P-512'
    },
    false, // whether the key is extractable (i.e. can be used in exportKey)
    ['sign', 'verify']
  )
  return keyPair
}

function saveKeyPair (keyPair) {
  keyStorage.setItem('k1', keyPair.publicKey)
  keyStorage.setItem('k2', keyPair.privateKey)
}

function readKeyPair () {
  return {
    publicKey: keyStorage.getItem('k1'),
    privateKey: keyStorage.getItem('k2')
  }
}

async function sign (keyPair, payload) {
  // logger.debug(`sign`, keyPair, payload)
  const publicKey = await webcrypto.subtle.exportKey(
    'jwk', // can be 'jwk' (public or private), 'spki' (public only), or 'pkcs8' (private only)
    keyPair.publicKey // can be a publicKey or privateKey, as long as extractable was true
  )
  // logger.debug(`publicKey`, publicKey)
  // publicKey = {
  //   kty: 'EC',
  //   crv: 'P-256',
  //   key_ops: ['verify'],
  //   x: 'Y53YaXLOYmprCABXAFnB2HQIlv2Jyd7h1zs63b2V7E4',
  //   y: '3bNfwx3fnOoaG9btal2yY6-9g9lDlRAvD2lSFPUoJFI'
  // }
  const document = {
    payload,
    publicKey: JSON.stringify(publicKey),
    timestamp: new Date(),
    // timestamp: new Date('2018-11-06T07:34:20.671Z'),
    userAgent: await machineId()
  }
  // logger.debug(`document`, document)
  // document = {
  //   payload: { email: 'hotdogee@gmail.com' },
  //   publicKey:
  //     '{"kty":"EC","crv":"P-256","key_ops":["verify"],"x":"Y53YaXLOYmprCABXAFnB2HQIlv2Jyd7h1zs63b2V7E4","y":"3bNfwx3fnOoaG9btal2yY6-9g9lDlRAvD2lSFPUoJFI"}',
  //   userAgent:
  //     'bfdaca43d47406f301471f211210fce990269efbcc7c363ea9e2a11d0ab98ad5'
  // }
  const enc = new TextEncoder()
  const signature = await webcrypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' } // can be 'SHA-1', 'SHA-256', 'SHA-384', or 'SHA-512'
    },
    keyPair.privateKey, // from generateKey or importKey above
    enc.encode(JSON.stringify(document)) // ArrayBuffer of data you want to sign
  )
  // logger.debug(
  //   `signature(${signature.byteLength}) = ${new Uint8Array(signature)}`
  // )
  // signature(64) = 10,123,18,105,79,147,87,99,187,185,202,24,224,30,205,131,174,86,239,74,185,157,169,86,24,198,5,231,196,1,253,199,128,211,147,208,178,221,158,102,149,246,165,166,43,101,85,247,131,46,152,255,112,44,175,143,49,116,227,209,0,56,82,70
  return {
    signature: btoa(String.fromCharCode(...new Uint8Array(signature))),
    document
  }
}

/* eslint-disable no-unused-vars */
async function generateKeyExplore () {
  const key = await webcrypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256' // can be 'P-256', 'P-384', or 'P-512'
    },
    true, // whether the key is extractable (i.e. can be used in exportKey)
    ['sign', 'verify']
  )
  /**
   * saving private RSA key to KeyStorage
   * creates file ./key_storage/prvRSA-1024.json
   */
  // keyStorage.setItem("prvRSA-1024", keyPairs.privateKey);
  // console.log(keyPairs)
  // console.log(keyPairs.privateKey)
  // console.log(keyPairs.publicKey)
  // CryptoKey {
  //   usages: [ 'sign' ],
  //   native_: Key { type: 408 },
  //   extractable: false,
  //   algorithm: { name: 'ECDSA', namedCurve: 'P-256' },
  //   type: 'private'
  // }
  // CryptoKey {
  //   usages: [ 'verify' ],
  //   native_: Key { type: 408 },
  //   extractable: true,
  //   algorithm: { name: 'ECDSA', namedCurve: 'P-256' },
  //   type: 'public'
  // }

  const jwk = await webcrypto.subtle.exportKey(
    'jwk', // can be 'jwk' (public or private), 'spki' (public only), or 'pkcs8' (private only)
    key.publicKey // can be a publicKey or privateKey, as long as extractable was true
  )
  console.log(`publicKey`, jwk)
  // publicKey {
  //   kty: 'EC',
  //   crv: 'P-256',
  //   key_ops: [ 'verify' ],
  //   x: '-eGGqhymn8iL3ogA3UqNiXZmBfBLqFJhwXALwC7qgz0',
  //   y: 'dY_tapL4n6CbxZNRRagYE9JnCg9AN-kWekmQEUdvzv4'
  // }

  const jwk2 = await webcrypto.subtle.exportKey(
    'jwk', // can be 'jwk' (public or private), 'spki' (public only), or 'pkcs8' (private only)
    key.privateKey // can be a publicKey or privateKey, as long as extractable was true
  )
  console.log(`privateKey`, jwk2)
  // privateKey {
  //   kty: 'EC',
  //   crv: 'P-256',
  //   key_ops: [ 'sign' ],
  //   x: '-eGGqhymn8iL3ogA3UqNiXZmBfBLqFJhwXALwC7qgz0',
  //   y: 'dY_tapL4n6CbxZNRRagYE9JnCg9AN-kWekmQEUdvzv4',
  //   d: 'LHwHF8aPlkt0KZ9LsnRkS_Epxk28ucCWD4m2ulWZqoA'
  // }
  keyStorage.setItem('ECDSA1publicKey', key.publicKey)
  // {
  //   "algorithm": { "name": "ECDSA", "namedCurve": "P-256" },
  //   "usages": ["verify"],
  //   "type": "public",
  //   "keyJwk": {
  //     "kty": "EC",
  //     "crv": 415,
  //     "x": "+eGGqhymn8iL3ogA3UqNiXZmBfBLqFJhwXALwC7qgz0=",
  //     "y": "dY/tapL4n6CbxZNRRagYE9JnCg9AN+kWekmQEUdvzv4="
  //   },
  //   "name": "ECDSA1publicKey",
  //   "extractable": true
  // }

  keyStorage.setItem('ECDSA1privateKey', key.privateKey)
  // {
  //   "algorithm": { "name": "ECDSA", "namedCurve": "P-256" },
  //   "usages": ["sign"],
  //   "type": "private",
  //   "keyJwk": {
  //     "kty": "EC",
  //     "crv": 415,
  //     "x": "+eGGqhymn8iL3ogA3UqNiXZmBfBLqFJhwXALwC7qgz0=",
  //     "y": "dY/tapL4n6CbxZNRRagYE9JnCg9AN+kWekmQEUdvzv4=",
  //     "d": "LHwHF8aPlkt0KZ9LsnRkS/Epxk28ucCWD4m2ulWZqoA="
  //   },
  //   "name": "ECDSA1privateKey",
  //   "extractable": true
  // }

  // keyStorage.setItem('ECDSA1key', key) // error
  const key2 = await webcrypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256' // can be 'P-256', 'P-384', or 'P-512'
    },
    false, // whether the key is extractable (i.e. can be used in exportKey)
    ['sign', 'verify']
  )
  const jwk3 = await webcrypto.subtle.exportKey(
    'jwk', // can be 'jwk' (public or private), 'spki' (public only), or 'pkcs8' (private only)
    key2.publicKey // can be a publicKey or privateKey, as long as extractable was true
  )
  console.log(`publicKey`, jwk3)
  keyStorage.setItem('ECDSA2publicKey', key2.publicKey)
  keyStorage.setItem('ECDSA2privateKey', key2.privateKey)
}
/* eslint-enables no-unused-vars */

module.exports = {
  generateKeyPair,
  saveKeyPair,
  readKeyPair,
  sign
}
