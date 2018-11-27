module.exports = {
  supervisor: {
    //"url": "http://localhost:8081"
    // "url": "http://api.scada.hanl.in"
    url: "https://scada.hanl.in",
    options: {
      path: "/api/socket.io" // default: /socket.io
    }
  },
  amqp: {
    url: "amqp://localhost"
  },
  serial: {
    port: "auto"
  }
}
