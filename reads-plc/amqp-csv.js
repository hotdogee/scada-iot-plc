// node reads-plc/amqp-csv.js

// parse arguments
const argv = require('minimist')(process.argv.slice(2), {
  default: {
    logdir: 'log',
    totalmax: '80GB',
    filemax: '10MB',
    ampqstr: 'amqp://localhost'
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
      {
        name: 'M1 房間',
        type: 'nhr5200',
        address: 1,
        devices: [
          {
            name: '壓力(bar)',
            type: 'pressure',
            min: 0,
            max: 4
          },
          {
            name: '溫度(°C)',
            type: 'temperature',
            min: -200,
            max: 650
          }
        ]
      },
      {
        name: 'M2 房間',
        type: 'dw8',
        address: 2,
        devices: [
          {
            name: '比壓器',
            type: 'pt',
            ratio: null
          },
          {
            name: '比流器',
            type: 'ct',
            ratio: 6
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
    .replace(/T/, '-')
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
      console.log('Deleted file: ', filePath)
    }
  } catch (e) {
    console.log(filesList)
  }
}

async function amqpCsv () {
  // assert ampq reads exchange and bind to logger queue
  const exReads = 'reads'
  const qLogger = 'logger'

  // connect to ampq server, connection is a ChannelModel object
  // 'amqp://localhost'
  const connection = await amqplib.connect(argv.ampqstr).catch(err => {
    logger.error('amqplib.connect:', err)
    process.exit()
  })
  logger.info(util.format('%s connected', argv.ampqstr))

  // channel is a Channel object
  const channel = await connection.createChannel().catch(err => {
    logger.error('connection.createChannel:', err)
    process.exit()
  })
  logger.info(util.format('Channel created'))

  const ex = await channel.assertExchange(exReads, 'fanout')
  logger.info('assertExchange:', ex) // { exchange: 'reads' }
  const q = await channel.assertQueue(qLogger)
  logger.info('assertQueue:', q) // { queue: 'logger', messageCount: 0, consumerCount: 0 }
  const bq = await channel.bindQueue(qLogger, exReads, '') // {}
  logger.info('bindQueue:', bq) // {}
  let fileH
  let fileHeader
  // logger.info('2', file, file_path)
  const cs = await channel.consume(qLogger, async function (msg) {
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
          console.log('Log file full, creating new file...')
        }
      }
      let headerChanged = false
      if (header != fileHeader) {
        headerChanged = true
        console.log('Header has changed, creating new file...')
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
        console.log('Created new file:', filePath)
        // console.log(file, file_path)
        // return [file, file_path]
        // console.log('b')
        // console.log('c', file_h, file_path)
        // write header line if we got a empty file
        console.log(header)
        fs.writeSync(fileH, '\ufeff' + header + '\n') // utf8 bom
        fileHeader = header
      }
      console.log(fileH, row)
      fs.writeSync(fileH, row + '\n')
      fs.fsyncSync(fileH) // flush to disk
      // acknowledge message sucessfully processed
      channel.ack(msg)
    }
  })
  logger.info('consume:', cs) // {}
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

// { 'M1-九號井口-溫度(°C)': 175.13446044921875,
//   'M2-手動閘閥前-壓力(bar)': 2.4341037273406982,
//   'M2-手動閘閥前-溫度(°C)': 123.98794555664062,
//   'M10-上貨櫃前-壓力(bar)': 1.6722092628479004,
//   'M10-上貨櫃前-溫度(°C)': 95.11329650878906,
//   'M11-三桶前-壓力(bar)': 1.475763201713562,
//   'M11-三桶前-溫度(°C)': 108.1790771484375,
//   'M13-渦輪1前-壓力(bar)': 1.3553271293640137,
//   'M13-渦輪1前-溫度(°C)': 104.67987060546875,
//   'M14-渦輪1後-壓力(bar)': 0.9487493634223938,
//   'M14-渦輪1後-溫度(°C)': 100.9875717163086,
//   'M60-軸心1-入水測溫度(°C)': 66.97000885009766,
//   'M61-軸心1-發電機測溫度(°C)': 58.30341720581055,
//   'M21-尾水箱-壓力(bar)': 0.9599348902702332,
//   'M21-尾水箱-溫度(°C)': 591.6082153320312,
//   'M63-發電機1-三相功率(kW)': 0.369384765625,
//   'M63-發電機1-三相功因()': 0.8448944091796875,
//   'M63-發電機1-發電量(kWh)': 4076.125,
//   'M63-發電機1-A相電壓(V)': 23.5625,
//   'M63-發電機1-A相電流(A)': 9.148681640625,
//   'M63-發電機1-B相電壓(V)': 23.41796875,
//   'M63-發電機1-B相電流(A)': 9.30908203125,
//   'M63-發電機1-C相電壓(V)': 23.21533203125,
//   'M63-發電機1-C相電流(A)': 0.0779571533203125,
//   'M64-發電機1-頻率(Hz)': 6.7,
//   'M62-軸心1-轉速(Hz)': 6.72,
//   'M22-主排水管-流量(m3/h)': 4.237500190734863 }

function getMessageExample () {
  return {
    name: 'Geo9',
    logTime: '2017-08-06T07:16:56.741Z',
    reads: [
      {
        name: '九號井口',
        addr: 1,
        reads: [
          {
            name: '溫度',
            unit: '°C',
            value: 175.1509246826172
          }
        ]
      },
      {
        name: '手動閘閥前',
        addr: 2,
        reads: [
          {
            name: '壓力',
            unit: 'bar',
            value: 2.890937089920044
          },
          {
            name: '溫度',
            unit: '°C',
            value: 130.15086364746094
          }
        ]
      },
      {
        name: '上貨櫃前',
        addr: 10,
        reads: [
          {
            name: '壓力',
            unit: 'bar',
            value: 1.9508538246154785
          },
          {
            name: '溫度',
            unit: '°C',
            value: 99.6741714477539
          }
        ]
      },
      {
        name: '三桶前',
        addr: 11,
        reads: [
          {
            name: '壓力',
            unit: 'bar',
            value: 1.7195450067520142
          },
          {
            name: '溫度',
            unit: '°C',
            value: 112.9797592163086
          }
        ]
      },
      {
        name: '渦輪1前',
        addr: 13,
        reads: [
          {
            name: '壓力',
            unit: 'bar',
            value: 1.5468308925628662
          },
          {
            name: '溫度',
            unit: '°C',
            value: 108.93707275390625
          }
        ]
      },
      {
        name: '渦輪1後',
        addr: 14,
        reads: [
          {
            name: '壓力',
            unit: 'bar',
            value: 0.9483972787857056
          },
          {
            name: '溫度',
            unit: '°C',
            value: 105.29886627197266
          }
        ]
      },
      {
        name: '軸心1',
        addr: 60,
        reads: [
          {
            name: '入水測溫度',
            unit: '°C',
            value: 54.9986457824707
          }
        ]
      },
      {
        name: '軸心1',
        addr: 61,
        reads: [
          {
            name: '發電機測溫度',
            unit: '°C',
            value: 62.966278076171875
          }
        ]
      },
      {
        name: '渦輪1後',
        addr: 14,
        reads: [
          {
            name: '壓力',
            unit: 'bar',
            value: 0.9483972787857056
          },
          {
            name: '溫度',
            unit: '°C',
            value: 105.29886627197266
          }
        ]
      },
      {
        name: '尾水箱',
        addr: 21,
        reads: [
          {
            name: '壓力',
            unit: 'bar',
            value: 0.9592282176017761
          },
          {
            name: '溫度',
            unit: '°C',
            value: 621.8770751953125
          }
        ]
      },
      {
        name: '發電機1',
        addr: 63,
        reads: [
          {
            name: '三相功率',
            unit: 'kW',
            value: 0.6929931640625
          },
          {
            name: '三相功因',
            unit: '',
            value: 0.836700439453125
          },
          {
            name: '發電量',
            unit: 'kWh',
            value: 4090.375
          },
          {
            name: 'A相電壓',
            unit: 'V',
            value: 29.60693359375
          },
          {
            name: 'A相電流',
            unit: 'A',
            value: 11.8955078125
          },
          {
            name: 'B相電壓',
            unit: 'V',
            value: 30.08642578125
          },
          {
            name: 'B相電流',
            unit: 'A',
            value: 12.233642578125
          },
          {
            name: 'C相電壓',
            unit: 'V',
            value: 28.74951171875
          },
          {
            name: 'C相電流',
            unit: 'A',
            value: 0.097747802734375
          }
        ]
      },
      {
        name: '發電機1',
        addr: 64,
        reads: [
          {
            name: '頻率',
            unit: 'Hz',
            value: 19.61
          }
        ]
      },
      {
        name: '軸心1',
        addr: 62,
        reads: [
          {
            name: '轉速',
            unit: 'Hz',
            value: 19.48
          }
        ]
      },
      {
        name: '主排水管',
        addr: 22,
        reads: [
          {
            name: '流量',
            unit: 'm3/h',
            value: 5.166999816894531
          }
        ]
      }
    ]
  }
}
