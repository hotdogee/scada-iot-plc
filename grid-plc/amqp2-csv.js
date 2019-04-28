// node grid-plc/amqp2-csv.js

// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    logdir: 'log',
    totalmax: '200GB',
    filemax: '10MB',
    amqpUrl: 'amqp://localhost'
  }
})

// const config = require('config')
const logger = require('../lib/logger')
const os = require('os')
const fs = require('fs')
const path = require('path')
const util = require('util')
const _ = require('lodash')
const { parse } = require('json2csv')
const amqplib = require('amqplib')
const filesizeParser = require('filesize-parser')
const logdir = path.resolve(argv.logdir)
const totalMax = filesizeParser(argv.totalmax)
const fileMax = filesizeParser(argv.filemax)

function getPlcSettings () {
  return {
    name: 'Geo9',
    location: '宜蘭清水九號井',
    rtus: [
      // {
      //   name: '併接點',
      //   type: 'nhr3800',
      //   addr: 70,
      //   fc03: [
      //     {
      //       addr: 256,
      //       name: '頻率',
      //       unit: 'Hz',
      //       min: 0,
      //       max: 100
      //     }
      //   ]
      // },
      {
        name: '發電機300kVA',
        type: 'nhr3800',
        addr: 71,
        fc03: [
          {
            addr: 256,
            name: '頻率',
            unit: 'Hz',
            min: 0,
            max: 100
          }
        ]
      },
      {
        name: '併接點',
        type: 'nhr3500',
        addr: 72,
        cmds: [
          {
            code: 3,
            start: 0x106,
            len: 46,
            regs: [
              {
                addr: 0x106,
                name: 'AB線電壓',
                factor: 100,
                unit: 'V',
                type: 'readInt32BE'
              },
              {
                addr: 0x108,
                name: 'BC線電壓',
                factor: 100,
                unit: 'V',
                type: 'readInt32BE'
              },
              {
                addr: 0x10A,
                name: 'CA線電壓',
                factor: 100,
                unit: 'V',
                type: 'readInt32BE'
              },
              {
                addr: 0x10C,
                name: 'A相電流',
                factor: 1000,
                unit: 'A',
                type: 'readInt32BE'
              },
              {
                addr: 0x10E,
                name: 'B相電流',
                factor: 1000,
                unit: 'A',
                type: 'readInt32BE'
              },
              {
                addr: 0x110,
                name: 'C相電流',
                factor: 1000,
                unit: 'A',
                type: 'readInt32BE'
              },
              {
                addr: 0x118,
                name: '有功功率',
                factor: 10,
                unit: 'kW',
                type: 'readFloatBE'
              },
              {
                addr: 0x120,
                name: '無功功率',
                factor: 10,
                unit: 'kvar',
                type: 'readFloatBE'
              },
              {
                addr: 0x128,
                name: '視在功率',
                factor: 10,
                unit: 'kVA',
                type: 'readFloatBE'
              },
              {
                addr: 0x130,
                name: '功率因數',
                factor: 10,
                unit: '%',
                type: 'readInt32BE'
              },
              {
                addr: 0x132,
                name: '頻率',
                factor: 1000,
                unit: '%',
                type: 'readInt32BE'
              }
            ]
          },
          {
            code: 3,
            start: 0x608,
            len: 6,
            regs: [
              {
                addr: 0x608,
                name: '有功電量',
                factor: 100,
                unit: 'kWh',
                type: 'readInt32BE'
              },
              {
                addr: 0x60A,
                name: '無功電量',
                factor: 100,
                unit: 'kvarh',
                type: 'readInt32BE'
              },
              {
                addr: 0x60C,
                name: '視在電量',
                factor: 100,
                unit: 'kVAh',
                type: 'readInt32BE'
              }
            ]
          },
          {
            code: 3,
            start: 0x1100,
            len: 30,
            regs: [
              {
                addr: 0x1100,
                name: 'A相電流諧波比',
                factor: 100,
                unit: '%',
                type: 'readInt16BE',
                len: 30
              }
            ]
          },
          {
            code: 3,
            start: 0x1120,
            len: 30,
            regs: [
              {
                addr: 0x1120,
                name: 'B相電流諧波比',
                factor: 100,
                unit: '%',
                type: 'readInt16BE',
                len: 30
              }
            ]
          },
          {
            code: 3,
            start: 0x1140,
            len: 30,
            regs: [
              {
                addr: 0x1140,
                name: 'C相電流諧波比',
                factor: 100,
                unit: '%',
                type: 'readInt16BE',
                len: 30
              }
            ]
          },
          {
            code: 3,
            start: 0x11C0,
            len: 30,
            regs: [
              {
                addr: 0x11C0,
                name: 'A相電壓諧波比',
                factor: 100,
                unit: '%',
                type: 'readInt16BE',
                len: 30
              }
            ]
          },
          {
            code: 3,
            start: 0x11E0,
            len: 30,
            regs: [
              {
                addr: 0x11E0,
                name: 'B相電壓諧波比',
                factor: 100,
                unit: '%',
                type: 'readInt16BE',
                len: 30
              }
            ]
          },
          {
            code: 3,
            start: 0x1200,
            len: 30,
            regs: [
              {
                addr: 0x1200,
                name: 'C相電壓諧波比',
                factor: 100,
                unit: '%',
                type: 'readInt16BE',
                len: 30
              }
            ]
          }
        ]
      },
      {
        name: '發電機300kVA',
        type: 'nhr3500',
        addr: 73,
        cmds: [
          {
            code: 3,
            start: 0x106,
            len: 44,
            regs: [
              {
                addr: 0x106,
                name: 'AB線電壓',
                factor: 100,
                unit: 'V',
                type: 'readInt32BE'
              },
              {
                addr: 0x108,
                name: 'BC線電壓',
                factor: 100,
                unit: 'V',
                type: 'readInt32BE'
              },
              {
                addr: 0x10A,
                name: 'CA線電壓',
                factor: 100,
                unit: 'V',
                type: 'readInt32BE'
              },
              {
                addr: 0x10C,
                name: 'A相電流',
                factor: 1000,
                unit: 'A',
                type: 'readInt32BE'
              },
              {
                addr: 0x10E,
                name: 'B相電流',
                factor: 1000,
                unit: 'A',
                type: 'readInt32BE'
              },
              {
                addr: 0x110,
                name: 'C相電流',
                factor: 1000,
                unit: 'A',
                type: 'readInt32BE'
              },
              {
                addr: 0x118,
                name: '有功功率',
                factor: 10,
                unit: 'kW',
                type: 'readFloatBE'
              },
              {
                addr: 0x120,
                name: '無功功率',
                factor: 10,
                unit: 'kvar',
                type: 'readFloatBE'
              },
              {
                addr: 0x128,
                name: '視在功率',
                factor: 10,
                unit: 'kVA',
                type: 'readFloatBE'
              },
              {
                addr: 0x130,
                name: '功率因數',
                factor: 10,
                unit: '%',
                type: 'readInt32BE'
              }
            ]
          },
          {
            code: 3,
            start: 0x608,
            len: 6,
            regs: [
              {
                addr: 0x608,
                name: '有功電量',
                factor: 100,
                unit: 'kWh',
                type: 'readInt32BE'
              },
              {
                addr: 0x60A,
                name: '無功電量',
                factor: 100,
                unit: 'kvarh',
                type: 'readInt32BE'
              },
              {
                addr: 0x60C,
                name: '視在電量',
                factor: 100,
                unit: 'kVAh',
                type: 'readInt32BE'
              }
            ]
          },
          {
            code: 3,
            start: 0x1100,
            len: 30,
            regs: [
              {
                addr: 0x1100,
                name: 'A相電流諧波比',
                factor: 100,
                unit: '%',
                type: 'readInt16BE',
                len: 30
              }
            ]
          },
          {
            code: 3,
            start: 0x1120,
            len: 30,
            regs: [
              {
                addr: 0x1120,
                name: 'B相電流諧波比',
                factor: 100,
                unit: '%',
                type: 'readInt16BE',
                len: 30
              }
            ]
          },
          {
            code: 3,
            start: 0x1140,
            len: 30,
            regs: [
              {
                addr: 0x1140,
                name: 'C相電流諧波比',
                factor: 100,
                unit: '%',
                type: 'readInt16BE',
                len: 30
              }
            ]
          },
          {
            code: 3,
            start: 0x11C0,
            len: 30,
            regs: [
              {
                addr: 0x11C0,
                name: 'A相電壓諧波比',
                factor: 100,
                unit: '%',
                type: 'readInt16BE',
                len: 30
              }
            ]
          },
          {
            code: 3,
            start: 0x11E0,
            len: 30,
            regs: [
              {
                addr: 0x11E0,
                name: 'B相電壓諧波比',
                factor: 100,
                unit: '%',
                type: 'readInt16BE',
                len: 30
              }
            ]
          },
          {
            code: 3,
            start: 0x1200,
            len: 30,
            regs: [
              {
                addr: 0x1200,
                name: 'C相電壓諧波比',
                factor: 100,
                unit: '%',
                type: 'readInt16BE',
                len: 30
              }
            ]
          }
        ]
      }
    ]
  }
}

const ps = getPlcSettings()

function ensureDirectoryExistence (dirPath) {
  if (fs.existsSync(dirPath)) {
    return true
  }
  ensureDirectoryExistence(path.dirname(dirPath))
  fs.mkdirSync(dirPath)
}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getFilePath () {
  const date = new Date()
  const dateTimeStr = date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+/, '')
    .replace(/T/, '-') // '20190427-155011'
  const fileName = util.format('%s-%s.csv', ps.name, dateTimeStr)
  const filePath = path.join(logdir, fileName)
  if (fs.existsSync(filePath)) {
    await sleep(1000) // wait 1 sec so we get a different date_time_str
    return getFilePath()
  }
  return filePath
}

function deleteOldFiles () {
  // get a list of files in log dir sorted oldest first
  let filesList
  try {
    ensureDirectoryExistence(logdir)
    filesList = fs.readdirSync(logdir)
    const files = filesList
      .map(function (v) {
        const stats = fs.statSync(path.join(logdir, v))
        return {
          file_path: path.join(logdir, v),
          time: stats.mtime.getTime(),
          size: stats.size
        }
      })
      .sort(function (a, b) {
        return a.time - b.time
      })
    // console.log(files);
    // check dir size
    while (_.sumBy(files, 'size') > totalMax) {
      // delete oldest files
      const filePath = files.shift().file_path
      fs.unlinkSync(filePath)
      logger.info(`Deleted file: ${filePath}`, { label: 'file' })
    }
  } catch (e) {
    logger.error(filesList, { label: 'file' })
  }
}

const exchangeName = 'reads'
const routingKey = 'geo9-pi3p2.grid.plc'
const queueName = 'logger'

// To ensure that messages do survive server restarts, the message needs to:
// Be declared as persistent message,
// Be published into a durable exchange,
// Be queued into a durable queue

async function amqpCsv () {
  // connect to ampq server, connection is a ChannelModel object
  // 'amqp://localhost'
  const connection = await amqplib.connect(argv.amqpUrl).catch(err => {
    logger.error(err, { label: 'connect' })
    process.exit()
  })
  logger.info(connection, `${argv.amqpUrl} connected`, { label: 'connect' })

  // channel is a Channel object
  const channel = await connection.createChannel().catch(err => {
    logger.error(err, { label: 'createChannel' })
    process.exit()
  })
  logger.info(channel, 'Channel created', { label: 'createChannel' })

  // To ensure that messages do survive server restarts, the message needs to:
  // Be declared as persistent message,
  // Be published into a durable exchange,
  // Be queued into a durable queue
  // assert exchange
  const ex = await channel.assertExchange(exchangeName, 'topic', {
    durable: true
  }).catch(err => {
    logger.error(err, { label: 'assertExchange' })
    process.exit()
  })
  logger.info(ex, { label: 'assertExchange' }) // { exchange: 'reads' }

  // assert a durable queue
  const q = await channel.assertQueue(queueName, {
    durable: true
  })
  // { queue: 'logger', messageCount: 0, consumerCount: 0 }
  logger.info(q, { label: 'assertQueue' })

  // prefetch 1
  channel.prefetch(1)

  // Assert a routing path from an exchange to a queue
  const bq = await channel.bindQueue(queueName, exchangeName, routingKey)
  logger.info(bq, { label: 'bindQueue' }) // {}

  let fileH = null
  let fileHeader = null
  // logger.info('2', file, file_path)
  const cs = await channel.consume(queueName, async (msg) => {
    // { consumerTag: 'amq.ctag-f-KUGP6js31pjKFX90lCvg' }
    // let file, file_path, file_header;
    // console.log('1', file_h, file_path, file_header)
    if (msg !== null) {
      // let file, file_path, file_header;
      // console.log('2', file_h, file_path, file_header)
      // console.log(msg.content.toString());
      // Traversal order of properties is fixed in ES6
      // http://exploringjs.com/es6/ch_oop-besides-classes.html#_traversal-order-of-properties
      const message = JSON.parse(msg.content.toString())
      const [header, row] = parse(flattenMessage(message)).split(os.EOL)
      // console.log('2.5', file_h, file_path, file_header)
      // check file size
      let fileFull = false
      if (fileH) {
        const fileSize = fs.fstatSync(fileH).size
        if (fileSize >= fileMax) {
          // create a new file if file size > file_max
          fileFull = true
          logger.info('Log file full, creating new file...', { label: 'file' })
        }
      }
      let headerChanged = false
      if (header !== fileHeader) {
        headerChanged = true
        logger.info('Header has changed, creating new file...', { label: 'file' })
      }
      if (fileFull || headerChanged) {
        // console.log('3', file_h, file_path, file_header)
        if (fileH) {
          fs.closeSync(fileH)
        }
        // console.log('a', file_h, file_path)
        deleteOldFiles()
        const filePath = await getFilePath()
        ensureDirectoryExistence(path.dirname(filePath))
        fileH = fs.openSync(filePath, 'a')
        logger.info(`Created new file: ${filePath}`, { label: 'file' })
        // console.log(file, file_path)
        // return [file, file_path]
        // console.log('b')
        // console.log('c', file_h, file_path)
        // write header line if we got a empty file
        fs.writeSync(fileH, '\ufeff' + header + '\n') // utf8 bom
        fileHeader = header
        logger.info(header, { label: 'header' })
      }
      logger.info(row, { label: `row-${fileH}` })
      fs.writeSync(fileH, row + '\n')
      fs.fsyncSync(fileH) // flush to disk
      // acknowledge message sucessfully processed
      channel.ack(msg)
    }
  })
  logger.info(cs, { label: 'consume' }) // {}
}
// amqpCsv()
try {
  amqpCsv()
} catch (e) {
  logger.error('amqpCsv:', e)
  process.exit()
}

function flattenMessage (message) {
  const data = _.fromPairs(
    _.flatMap(message.reads, (rtu, index) => {
      return rtu.reads.map((reg, i) => {
        // 'M1-九號井口-溫度(°C)'
        const header = util.format(
          'M%i-%s-%s(%s)',
          rtu.addr,
          rtu.name,
          reg.name,
          reg.unit
        )
        return [header, reg.value]
      })
    })
  )
  return Object.assign(
    {
      Name: message.name,
      Time: message.logTime
    },
    data
  )
}

// console.log(inspect(flattenMessage(getMessageExample()), {
//   compact: true,
//   depth: 5,
//   breakLength: 200,
//   colors: true
// }))
// var [header, row] = parse(flattenMessage(getMessageExample())).split(os.EOL)

// { Name: 'Geo9',
//   Time: '2019-04-27T16:21:48.281Z',
//   'M71-發電機300kVA-頻率(Hz)': 21.96,
//   'M72-併接點-AB線電壓(V)': 396.35,
//   'M72-併接點-BC線電壓(V)': 394.84,
//   'M72-併接點-CA線電壓(V)': 393.99,
//   'M72-併接點-A相電流(A)': 10.74,
//   'M72-併接點-B相電流(A)': 4.86,
//   'M72-併接點-C相電流(A)': 12.36,
//   'M72-併接點-有功功率(kW)': 6168,
//   'M72-併接點-無功功率(kvar)': -630,
//   'M72-併接點-視在功率(kVA)': 6366,
//   'M72-併接點-功率因數(%)': 96.8,
//   'M72-併接點-頻率(%)': 60.032,
//   'M72-併接點-有功電量(kWh)': 1697.29,
//   'M72-併接點-無功電量(kvarh)': 291.29,
//   'M72-併接點-視在電量(kVAh)': 1830.95,
//   'M72-併接點-A相電流諧波比(%)': [ 0.46, 0.35, 0, 0.35, 0.23, 0, 0.12, 0, 0, 0.23, 0, 0.12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
//   'M72-併接點-B相電流諧波比(%)': [ 1.33, 5.3, 0.34, 0.34, 0.34, 0.34, 0.34, 0.34, 0, 0.68, 0, 0.34, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.34, 0, 0, 0, 0, 0, 0, 0, 0 ],
//   'M72-併接點-C相電流諧波比(%)': [ 0, 1.25, 0.12, 0.12, 0.12, 0.12, 0, 0.12, 0.12, 0.24, 0, 0.12, 0, 0, 0, 0.12, 0, 0, 0, 0, 0, 0.12, 0, 0, 0, 0, 0, 0, 0, 0 ],
//   'M72-併接點-A相電壓諧波比(%)': [ 0.02, 0.05, 0.02, 0.04, 0, 0.07, 0.02, 0.02, 0.02, 0.02, 0, 0.02, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.02, 0.02, 0, 0, 0, 0, 0.02 ],
//   'M72-併接點-B相電壓諧波比(%)': [ 0, 0.06, 0, 0.04, 0, 0.06, 0.02, 0.03, 0, 0.02, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
//   'M72-併接點-C相電壓諧波比(%)': [ 0, 0.06, 0.02, 0.04, 0, 0.06, 0.02, 0.02, 0, 0.02, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
//   'M73-發電機300kVA-AB線電壓(V)': 203.33,
//   'M73-發電機300kVA-BC線電壓(V)': 204.44,
//   'M73-發電機300kVA-CA線電壓(V)': 209.97,
//   'M73-發電機300kVA-A相電流(A)': 38.82,
//   'M73-發電機300kVA-B相電流(A)': 40.02,
//   'M73-發電機300kVA-C相電流(A)': 36.6,
//   'M73-發電機300kVA-有功功率(kW)': 11196,
//   'M73-發電機300kVA-無功功率(kvar)': 7896,
//   'M73-發電機300kVA-視在功率(kVA)': 13710,
//   'M73-發電機300kVA-功率因數(%)': 81.6,
//   'M73-發電機300kVA-有功電量(kWh)': 2507,
//   'M73-發電機300kVA-無功電量(kvarh)': 1759.49,
//   'M73-發電機300kVA-視在電量(kVAh)': 3078.62,
//   'M73-發電機300kVA-A相電流諧波比(%)': [ 1.99, 10.44, 6.63, 2.46, 1.91, 1.84, 1.49, 1.28, 1.07, 0.93, 0.93, 0.93, 0.86, 0.72, 0.65, 0.65, 0.65, 0.72, 0.58, 0.51, 0.58, 0.58, 0.58, 0.51, 0.51, 0.51, 0.51, 0.51, 0.51, 0.51 ],
//   'M73-發電機300kVA-B相電流諧波比(%)': [ 4.46, 5.42, 5.31, 1.46, 1.18, 1.46, 0.68, 0.8, 0.63, 0.4, 0.46, 0.23, 0.35, 0.35, 0.23, 0.35, 0.29, 0.35, 0.35, 0.23, 0.23, 0.23, 0.18, 0.23, 0.23, 0.23, 0.23, 0.23, 0.23, 0.23 ],
//   'M73-發電機300kVA-C相電流諧波比(%)': [ 2.46, 10.25, 6.98, 2.53, 1.99, 1.55, 1.61, 1.3, 1.37, 0.94, 1, 0.88, 0.94, 0.82, 0.82, 0.57, 0.76, 0.63, 0.76, 0.57, 0.57, 0.57, 0.63, 0.51, 0.57, 0.51, 0.57, 0.51, 0.63, 0.51 ],
//   'M73-發電機300kVA-A相電壓諧波比(%)': [ 3.52, 2.57, 2.09, 1.28, 1.34, 1.14, 0.96, 0.93, 0.79, 0.74, 0.65, 0.57, 0.57, 0.52, 0.49, 0.48, 0.45, 0.44, 0.43, 0.43, 0.41, 0.41, 0.39, 0.4, 0.38, 0.38, 0.37, 0.35, 0.36, 0.35 ],
//   'M73-發電機300kVA-B相電壓諧波比(%)': [ 3.64, 2.12, 1.28, 1.41, 1.15, 1.03, 0.79, 0.72, 0.66, 0.66, 0.6, 0.53, 0.52, 0.46, 0.46, 0.43, 0.43, 0.4, 0.4, 0.36, 0.37, 0.35, 0.36, 0.33, 0.35, 0.32, 0.34, 0.33, 0.34, 0.31 ],
//   'M73-發電機300kVA-C相電壓諧波比(%)': [ 3.8, 2.62, 1.88, 1.62, 1.31, 1.02, 0.98, 0.82, 0.77, 0.71, 0.68, 0.64, 0.6, 0.58, 0.55, 0.48, 0.49, 0.4, 0.46, 0.41, 0.46, 0.44, 0.42, 0.42, 0.37, 0.36, 0.35, 0.36, 0.39, 0.37 ] }

function getMessageExample () {
  return { name: 'Geo9',
    logTime: '2019-04-27T16:21:48.281Z',
    reads:
   [ { name: '發電機300kVA', addr: 71, reads: [ { name: '頻率', unit: 'Hz', value: 21.96, time: '2019-04-27T16:21:46.733Z' } ] },
     { name: '併接點',
       addr: 72,
       reads:
        [ { name: 'AB線電壓', unit: 'V', value: 396.35, time: '2019-04-27T16:21:46.844Z' },
          { name: 'BC線電壓', unit: 'V', value: 394.84, time: '2019-04-27T16:21:46.844Z' },
          { name: 'CA線電壓', unit: 'V', value: 393.99, time: '2019-04-27T16:21:46.844Z' },
          { name: 'A相電流', unit: 'A', value: 10.74, time: '2019-04-27T16:21:46.844Z' },
          { name: 'B相電流', unit: 'A', value: 4.86, time: '2019-04-27T16:21:46.844Z' },
          { name: 'C相電流', unit: 'A', value: 12.36, time: '2019-04-27T16:21:46.844Z' },
          { name: '有功功率', unit: 'kW', value: 6168, time: '2019-04-27T16:21:46.844Z' },
          { name: '無功功率', unit: 'kvar', value: -630, time: '2019-04-27T16:21:46.844Z' },
          { name: '視在功率', unit: 'kVA', value: 6366, time: '2019-04-27T16:21:46.844Z' },
          { name: '功率因數', unit: '%', value: 96.8, time: '2019-04-27T16:21:46.844Z' },
          { name: '頻率', unit: '%', value: 60.032, time: '2019-04-27T16:21:46.844Z' },
          { name: '有功電量', unit: 'kWh', value: 1697.29, time: '2019-04-27T16:21:46.923Z' },
          { name: '無功電量', unit: 'kvarh', value: 291.29, time: '2019-04-27T16:21:46.923Z' },
          { name: '視在電量', unit: 'kVAh', value: 1830.95, time: '2019-04-27T16:21:46.923Z' },
          { name: 'A相電流諧波比', unit: '%', value: [ 0.46, 0.35, 0, 0.35, 0.23, 0, 0.12, 0, 0, 0.23, 0, 0.12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], time: '2019-04-27T16:21:47.020Z' },
          { name: 'B相電流諧波比', unit: '%', value: [ 1.33, 5.3, 0.34, 0.34, 0.34, 0.34, 0.34, 0.34, 0, 0.68, 0, 0.34, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.34, 0, 0, 0, 0, 0, 0, 0, 0 ], time: '2019-04-27T16:21:47.115Z' },
          { name: 'C相電流諧波比', unit: '%', value: [ 0, 1.25, 0.12, 0.12, 0.12, 0.12, 0, 0.12, 0.12, 0.24, 0, 0.12, 0, 0, 0, 0.12, 0, 0, 0, 0, 0, 0.12, 0, 0, 0, 0, 0, 0, 0, 0 ], time: '2019-04-27T16:21:47.211Z' },
          { name: 'A相電壓諧波比', unit: '%', value: [ 0.02, 0.05, 0.02, 0.04, 0, 0.07, 0.02, 0.02, 0.02, 0.02, 0, 0.02, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.02, 0.02, 0, 0, 0, 0, 0.02 ], time: '2019-04-27T16:21:47.307Z' },
          { name: 'B相電壓諧波比', unit: '%', value: [ 0, 0.06, 0, 0.04, 0, 0.06, 0.02, 0.03, 0, 0.02, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], time: '2019-04-27T16:21:47.403Z' },
          { name: 'C相電壓諧波比', unit: '%', value: [ 0, 0.06, 0.02, 0.04, 0, 0.06, 0.02, 0.02, 0, 0.02, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], time: '2019-04-27T16:21:47.498Z' } ] },
     { name: '發電機300kVA',
       addr: 73,
       reads:
        [ { name: 'AB線電壓', unit: 'V', value: 203.33, time: '2019-04-27T16:21:47.611Z' },
          { name: 'BC線電壓', unit: 'V', value: 204.44, time: '2019-04-27T16:21:47.611Z' },
          { name: 'CA線電壓', unit: 'V', value: 209.97, time: '2019-04-27T16:21:47.611Z' },
          { name: 'A相電流', unit: 'A', value: 38.82, time: '2019-04-27T16:21:47.611Z' },
          { name: 'B相電流', unit: 'A', value: 40.02, time: '2019-04-27T16:21:47.611Z' },
          { name: 'C相電流', unit: 'A', value: 36.6, time: '2019-04-27T16:21:47.611Z' },
          { name: '有功功率', unit: 'kW', value: 11196, time: '2019-04-27T16:21:47.611Z' },
          { name: '無功功率', unit: 'kvar', value: 7896, time: '2019-04-27T16:21:47.611Z' },
          { name: '視在功率', unit: 'kVA', value: 13710, time: '2019-04-27T16:21:47.611Z' },
          { name: '功率因數', unit: '%', value: 81.6, time: '2019-04-27T16:21:47.611Z' },
          { name: '有功電量', unit: 'kWh', value: 2507, time: '2019-04-27T16:21:47.690Z' },
          { name: '無功電量', unit: 'kvarh', value: 1759.49, time: '2019-04-27T16:21:47.690Z' },
          { name: '視在電量', unit: 'kVAh', value: 3078.62, time: '2019-04-27T16:21:47.690Z' },
          { name: 'A相電流諧波比',
            unit: '%',
            value: [ 1.99, 10.44, 6.63, 2.46, 1.91, 1.84, 1.49, 1.28, 1.07, 0.93, 0.93, 0.93, 0.86, 0.72, 0.65, 0.65, 0.65, 0.72, 0.58, 0.51, 0.58, 0.58, 0.58, 0.51, 0.51, 0.51, 0.51, 0.51, 0.51, 0.51 ],
            time: '2019-04-27T16:21:47.802Z' },
          { name: 'B相電流諧波比',
            unit: '%',
            value: [ 4.46, 5.42, 5.31, 1.46, 1.18, 1.46, 0.68, 0.8, 0.63, 0.4, 0.46, 0.23, 0.35, 0.35, 0.23, 0.35, 0.29, 0.35, 0.35, 0.23, 0.23, 0.23, 0.18, 0.23, 0.23, 0.23, 0.23, 0.23, 0.23, 0.23 ],
            time: '2019-04-27T16:21:47.898Z' },
          { name: 'C相電流諧波比',
            unit: '%',
            value: [ 2.46, 10.25, 6.98, 2.53, 1.99, 1.55, 1.61, 1.3, 1.37, 0.94, 1, 0.88, 0.94, 0.82, 0.82, 0.57, 0.76, 0.63, 0.76, 0.57, 0.57, 0.57, 0.63, 0.51, 0.57, 0.51, 0.57, 0.51, 0.63, 0.51 ],
            time: '2019-04-27T16:21:47.994Z' },
          { name: 'A相電壓諧波比',
            unit: '%',
            value: [ 3.52, 2.57, 2.09, 1.28, 1.34, 1.14, 0.96, 0.93, 0.79, 0.74, 0.65, 0.57, 0.57, 0.52, 0.49, 0.48, 0.45, 0.44, 0.43, 0.43, 0.41, 0.41, 0.39, 0.4, 0.38, 0.38, 0.37, 0.35, 0.36, 0.35 ],
            time: '2019-04-27T16:21:48.090Z' },
          { name: 'B相電壓諧波比',
            unit: '%',
            value: [ 3.64, 2.12, 1.28, 1.41, 1.15, 1.03, 0.79, 0.72, 0.66, 0.66, 0.6, 0.53, 0.52, 0.46, 0.46, 0.43, 0.43, 0.4, 0.4, 0.36, 0.37, 0.35, 0.36, 0.33, 0.35, 0.32, 0.34, 0.33, 0.34, 0.31 ],
            time: '2019-04-27T16:21:48.185Z' },
          { name: 'C相電壓諧波比',
            unit: '%',
            value: [ 3.8, 2.62, 1.88, 1.62, 1.31, 1.02, 0.98, 0.82, 0.77, 0.71, 0.68, 0.64, 0.6, 0.58, 0.55, 0.48, 0.49, 0.4, 0.46, 0.41, 0.46, 0.44, 0.42, 0.42, 0.37, 0.36, 0.35, 0.36, 0.39, 0.37 ],
            time: '2019-04-27T16:21:48.281Z' } ] } ] }
}
