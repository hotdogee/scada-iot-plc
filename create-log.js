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
      $select: [ 'id' ] // return only the id field
    }
  }
  logs.create(getMessageExample(), params).then(log => {
    // results adds a field: "_id": "DO5DyBX0lz4suuzi"
    logger.info('logs.create: ', log)
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
 "logTime": "2017-08-06T07:16:56.741Z",
 "reads": [
  {
   "name": "九號井口",
   "addr": 1,
   "reads": [
    {
     "name": "溫度",
     "unit": "°C",
     "value": 175.1509246826172
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
     "value": 2.890937089920044
    },
    {
     "name": "溫度",
     "unit": "°C",
     "value": 130.15086364746094
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
     "value": 1.9508538246154785
    },
    {
     "name": "溫度",
     "unit": "°C",
     "value": 99.6741714477539
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
     "value": 1.7195450067520142
    },
    {
     "name": "溫度",
     "unit": "°C",
     "value": 112.9797592163086
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
     "value": 1.5468308925628662
    },
    {
     "name": "溫度",
     "unit": "°C",
     "value": 108.93707275390625
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
     "value": 0.9483972787857056
    },
    {
     "name": "溫度",
     "unit": "°C",
     "value": 105.29886627197266
    }
   ]
  },
  {
   "name": "軸心1",
   "addr": 60,
   "reads": [
    {
     "name": "入水測溫度",
     "unit": "°C",
     "value": 54.9986457824707
    }
   ]
  },
  {
   "name": "軸心1",
   "addr": 61,
   "reads": [
    {
     "name": "發電機測溫度",
     "unit": "°C",
     "value": 62.966278076171875
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
     "value": 0.9483972787857056
    },
    {
     "name": "溫度",
     "unit": "°C",
     "value": 105.29886627197266
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
     "value": 0.9592282176017761
    },
    {
     "name": "溫度",
     "unit": "°C",
     "value": 621.8770751953125
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
     "value": 0.6929931640625
    },
    {
     "name": "三相功因",
     "unit": "",
     "value": 0.836700439453125
    },
    {
     "name": "發電量",
     "unit": "kWh",
     "value": 4090.375
    },
    {
     "name": "A相電壓",
     "unit": "V",
     "value": 29.60693359375
    },
    {
     "name": "A相電流",
     "unit": "A",
     "value": 11.8955078125
    },
    {
     "name": "B相電壓",
     "unit": "V",
     "value": 30.08642578125
    },
    {
     "name": "B相電流",
     "unit": "A",
     "value": 12.233642578125
    },
    {
     "name": "C相電壓",
     "unit": "V",
     "value": 28.74951171875
    },
    {
     "name": "C相電流",
     "unit": "A",
     "value": 0.097747802734375
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
     "value": 19.61
    }
   ]
  },
  {
   "name": "軸心1",
   "addr": 62,
   "reads": [
    {
     "name": "轉速",
     "unit": "Hz",
     "value": 19.48
    }
   ]
  },
  {
   "name": "主排水管",
   "addr": 22,
   "reads": [
    {
     "name": "流量",
     "unit": "m3/h",
     "value": 5.166999816894531
    }
   ]
  }
 ]
}
}
