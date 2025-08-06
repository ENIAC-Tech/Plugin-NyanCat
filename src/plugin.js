const { plugin, logger, pluginPath, resourcesPath } = require("@eniac/flexdesigner")

// Store key data
const keyData = {}
const fs = require('fs')
const path = require('path')
let nyancatInterval = null
const nyancats = []
function loadPngImages() {
    try {
        const files = fs.readdirSync(resourcesPath)
        files.forEach(file => {
            if (path.extname(file).toLowerCase() === '.png') {
                const filePath = path.join(resourcesPath, file)
                const imageBuffer = fs.readFileSync(filePath)
                const base64Data = imageBuffer.toString('base64')
                const fileName = path.basename(file, '.png')
                nyancats.push(`data:image/png;base64,${base64Data}`)
            }
        })
    } catch (error) {
        logger.error('Failed to load nyancats:', error)
    }
}
loadPngImages()

/**
 * Called when device status changes
 * @param {object} devices device status data
 * [
 *  {
 *    serialNumber: '',
 *    deviceData: {
 *       platform: '',
 *       profileVersion: '',
 *       firmwareVersion: '',
 *       deviceName: '',
 *       displayName: ''
 *    }
 *  }
 * ]
 */
plugin.on('device.status', (devices) => {
    logger.info('Device status changed:', devices)
    for (let device of devices) {
      if (device.status === 'disconnected') {
        clearInterval(nyancatInterval)
        nyancatInterval = null
      }
    }
})


/**
 * Called when a plugin key is loaded
 * @param {Object} payload alive key data
 * {
 *  serialNumber: '',
 *  keys: []
 * }
 */
plugin.on('plugin.alive', (payload) => {
    logger.info('Plugin alive:', payload)
    let hasNyancat = false
    for (let key of payload.keys) {
      keyData[key.uid] = key
      if (key.cid === 'com.eniac.nyancat.nyancat') {
        let nyancatIndex = 0
        nyancatInterval = setInterval(async () => {
          try {
            await plugin.directDraw(payload.serialNumber, key, nyancats[nyancatIndex])
          } catch (error) {
            logger.error('Error drawing nyancat:', error)
            clearInterval(nyancatInterval)
            nyancatInterval = null
          }
          nyancatIndex++
          if (nyancatIndex >= nyancats.length) {
            nyancatIndex = 0
          }
        }, 80)
        hasNyancat = true
      }
    }
    if (!hasNyancat) {
      clearInterval(nyancatInterval)
      nyancatInterval = null
    }
})

// Connect to flexdesigner and start the plugin
plugin.start()
