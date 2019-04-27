function getUuid () {
  return new Promise((resolve, reject) => {
    require('machine-uuid')(uuid => {
      resolve(uuid)
    })
  })
}

module.exports = getUuid
