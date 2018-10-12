const feathers = require('feathers/client')
const socketio = require('feathers-socketio/client')
const hooks = require('feathers-hooks')
const errors = require('feathers-errors') // An object with all of the custom error types.
const auth = require('feathers-authentication-client')
const io = require('socket.io-client')
const config = require('config')
const winston = require('winston')
var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({
        // setup console logging with timestamps
        level: 'debug',
        timestamp: function() {
          return (new Date()).toISOString();
        },
        formatter: function(options) {
          return options.timestamp() + ' ' + options.level[0].toUpperCase() + ' ' + (options.message ? options.message : '') +
            (options.meta && Object.keys(options.meta).length ? JSON.stringify(options.meta, null, 2) : '' );
        }
      })
    ]
});
// const Storage = require('dom-storage')
// var localStorage = new Storage('./localStorage.json')
const localStorage = require('node-persist')
// setup localStorage
localStorage.initSync();
localStorage.setItem = localStorage.setItemSync
localStorage.getItem = localStorage.getItemSync

logger.info(`Connecting to feathers server: ${config.get('supervisor.url')}`)
const socket = io(config.get('supervisor.url'))

const supervisor = feathers()
  .configure(socketio(socket))
  .configure(hooks())
  .configure(auth({
    storage: localStorage
  }))

// console.log(localStorage.getItem('feathers-jwt'))
// run login.js first to save jwt to localStorage
//supervisor.service('users').find().then(results => logger.info('Users: ', results))
supervisor.authenticate({
  strategy: 'jwt',
  accessToken: localStorage.getItem('feathers-jwt')
}).then(response => {
  logger.debug(response)
  // create logs
  const logs = supervisor.service('logs')
  const params = {
    query: {
      // $select: [ 'id' ] // return only the id field
    }
  }
  let start = new Date()
  logs.create(getLargeMessageExample(), params).then(log => {
    let elapsed = new Date() - start
    // results adds a field: "_id": "DO5DyBX0lz4suuzi"
    logger.info('logs.create: ', log)
    logger.info(`Elapsed: ${elapsed} ms`)
    process.exit()
  }).catch(err => {
    logger.error('logs.create:', err)
    process.exit()
  })
}).catch(err => {
  logger.error('supervisor.authenticate:', err)
  process.exit()
})

function getMessageExample() {
  return {
    "name": "Geo9",
    "logTime": "2017-10-23T09:17:59.741Z",
    "reads": [
      {
      "name": "九號井口",
      "addr": 1,
      "reads": [
        {
        "name": "溫度",
        "unit": "°C",
        "value": 175.1509246826172,
        "time": "2017-10-21T10:16:56.741Z"
        }
      ]
      }
    ]
  }
}

function getLargeMessageExample() {
  return {
    "name": "Geo9",
    "logTime": "2018-10-17T21:00:32.507Z",
    "reads": [
      {
        "name": "九號井口",
        "addr": 1,
        "reads": [
          {
            "name": "壓力",
            "unit": "bar",
            "value": 10.879118919372559,
            "time": "2018-10-07T21:00:29.965Z"
          },
          {
            "name": "溫度",
            "unit": "℃",
            "value": 55.05418395996094,
            "time": "2018-10-07T21:00:29.966Z"
          }
        ]
      },
      {
        "name": "手動閘閥前",
        "addr": 2,
        "reads": [
          {
            "name": "壓力",
            "unit": "bar",
            "value": 1.0160058736801147,
            "time": "2018-10-07T21:00:30.061Z"
          },
          {
            "name": "溫度",
            "unit": "℃",
            "value": 21.696002960205078,
            "time": "2018-10-07T21:00:30.061Z"
          }
        ]
      },
      {
        "name": "渦輪2前",
        "addr": 5,
        "reads": [
          {
            "name": "壓力",
            "unit": "bar",
            "value": 0.9927088618278503,
            "time": "2018-10-07T21:00:30.173Z"
          },
          {
            "name": "溫度",
            "unit": "℃",
            "value": 19.637441635131836,
            "time": "2018-10-07T21:00:30.173Z"
          }
        ]
      },
      {
        "name": "渦輪2後",
        "addr": 6,
        "reads": [
          {
            "name": "壓力",
            "unit": "bar",
            "value": 1.0105949640274048,
            "time": "2018-10-07T21:00:30.269Z"
          },
          {
            "name": "溫度",
            "unit": "℃",
            "value": 21.31842041015625,
            "time": "2018-10-07T21:00:30.269Z"
          }
        ]
      },
      {
        "name": "大穩壓桶1",
        "addr": 7,
        "reads": [
          {
            "name": "壓力",
            "unit": "bar",
            "value": 0.992278516292572,
            "time": "2018-10-07T21:00:30.365Z"
          },
          {
            "name": "溫度",
            "unit": "℃",
            "value": 20.866090774536133,
            "time": "2018-10-07T21:00:30.365Z"
          }
        ]
      },
      {
        "name": "上貨櫃前",
        "addr": 10,
        "reads": [
          {
            "name": "壓力",
            "unit": "bar",
            "value": 1.0881874561309814,
            "time": "2018-10-07T21:00:30.461Z"
          },
          {
            "name": "溫度",
            "unit": "℃",
            "value": 22.257863998413086,
            "time": "2018-10-07T21:00:30.461Z"
          }
        ]
      },
      {
        "name": "三桶前",
        "addr": 11,
        "reads": [
          {
            "name": "壓力",
            "unit": "bar",
            "value": 1.0025155544281006,
            "time": "2018-10-07T21:00:30.556Z"
          },
          {
            "name": "溫度",
            "unit": "℃",
            "value": 23.4473934173584,
            "time": "2018-10-07T21:00:30.556Z"
          }
        ]
      },
      {
        "name": "渦輪1前",
        "addr": 13,
        "reads": [
          {
            "name": "壓力",
            "unit": "bar",
            "value": 1.0084205865859985,
            "time": "2018-10-07T21:00:30.652Z"
          },
          {
            "name": "溫度",
            "unit": "℃",
            "value": 20.9659481048584,
            "time": "2018-10-07T21:00:30.652Z"
          }
        ]
      },
      {
        "name": "渦輪1後",
        "addr": 14,
        "reads": [
          {
            "name": "壓力",
            "unit": "bar",
            "value": 1.0086079835891724,
            "time": "2018-10-07T21:00:30.749Z"
          },
          {
            "name": "溫度",
            "unit": "℃",
            "value": 20.772506713867188,
            "time": "2018-10-07T21:00:30.749Z"
          }
        ]
      },
      {
        "name": "尾水箱",
        "addr": 21,
        "reads": [
          {
            "name": "壓力",
            "unit": "bar",
            "value": 1.0086604356765747,
            "time": "2018-10-07T21:00:30.845Z"
          },
          {
            "name": "溫度",
            "unit": "℃",
            "value": 17.582820892333984,
            "time": "2018-10-07T21:00:30.845Z"
          }
        ]
      },
      {
        "name": "發電機1",
        "addr": 63,
        "reads": [
          {
            "name": "三相功率",
            "unit": "kW",
            "value": 0,
            "time": "2018-10-07T21:00:30.940Z"
          },
          {
            "name": "三相功因",
            "unit": "",
            "value": 32768,
            "time": "2018-10-07T21:00:31.036Z"
          },
          {
            "name": "發電量",
            "unit": "kWh",
            "value": 109.826171875,
            "time": "2018-10-07T21:00:31.132Z"
          },
          {
            "name": "A相電壓",
            "unit": "V",
            "value": 0,
            "time": "2018-10-07T21:00:31.292Z"
          },
          {
            "name": "A相電流",
            "unit": "A",
            "value": 0,
            "time": "2018-10-07T21:00:31.389Z"
          },
          {
            "name": "B相電壓",
            "unit": "V",
            "value": 0,
            "time": "2018-10-07T21:00:31.483Z"
          },
          {
            "name": "B相電流",
            "unit": "A",
            "value": 0,
            "time": "2018-10-07T21:00:31.579Z"
          },
          {
            "name": "C相電壓",
            "unit": "V",
            "value": 0,
            "time": "2018-10-07T21:00:31.660Z"
          },
          {
            "name": "C相電流",
            "unit": "A",
            "value": 0,
            "time": "2018-10-07T21:00:31.787Z"
          }
        ]
      },
      {
        "name": "發電機1",
        "addr": 64,
        "reads": [
          {
            "name": "頻率",
            "unit": "Hz",
            "value": 0,
            "time": "2018-10-07T21:00:31.868Z"
          }
        ]
      },
      {
        "name": "軸心1",
        "addr": 60,
        "reads": [
          {
            "name": "入水測溫度",
            "unit": "℃",
            "value": 56.74152374267578,
            "time": "2018-10-07T21:00:31.947Z"
          }
        ]
      },
      {
        "name": "軸心1",
        "addr": 61,
        "reads": [
          {
            "name": "發電機測溫度",
            "unit": "℃",
            "value": 21.698598861694336,
            "time": "2018-10-07T21:00:32.026Z"
          }
        ]
      },
      {
        "name": "軸心2",
        "addr": 50,
        "reads": [
          {
            "name": "入水測溫度",
            "unit": "℃",
            "value": 20.95969581604004,
            "time": "2018-10-07T21:00:32.171Z"
          }
        ]
      },
      {
        "name": "軸心2",
        "addr": 51,
        "reads": [
          {
            "name": "發電機測溫度",
            "unit": "℃",
            "value": 18.5609130859375,
            "time": "2018-10-07T21:00:32.251Z"
          }
        ]
      },
      {
        "name": "變速齒輪箱2",
        "addr": 52,
        "reads": [
          {
            "name": "溫度",
            "unit": "℃",
            "value": 21.311281204223633,
            "time": "2018-10-07T21:00:32.330Z"
          }
        ]
      },
      {
        "name": "排水管2",
        "addr": 26,
        "reads": [
          {
            "name": "流量",
            "unit": "m3/h",
            "value": 0,
            "time": "2018-10-07T21:00:32.411Z"
          }
        ]
      },
      {
        "name": "主排水管",
        "addr": 25,
        "reads": [
          {
            "name": "質量流率",
            "unit": "t/h",
            "value": 0,
            "time": "2018-10-07T21:00:32.507Z"
          },
          {
            "name": "密度",
            "unit": "g/cm3",
            "value": 0.9990593194961548,
            "time": "2018-10-07T21:00:32.507Z"
          },
          {
            "name": "溫度",
            "unit": "℃",
            "value": 21.833173751831055,
            "time": "2018-10-07T21:00:32.507Z"
          }
        ]
      }
    ]
  }
}
