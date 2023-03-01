// ----------
// Helpers
// ----------
function logger(message, color) {
  color = color || 'black'

  switch (color) {
    case 'success':
      color = 'Green'
      break
    case 'info':
      color = 'DodgerBlue'
      break
    case 'error':
      color = 'Red'
      break
    case 'warning':
      color = 'Orange'
      break
    default:
      color = color
  }

  console.log('%c' + message, 'color:' + color)
}

function convertHeadersArrayToObject(array) {
  const newObj = {}

  array.forEach((header) => {
    newObj[header.name] = header.value
  })

  return newObj
}

let recordedRequests = {}
function getMode() {
  chrome.storage.local.get('mode', function (items) {
    recordedRequests = {}
    cachedEndpointBodies = {}
    cachedEndpointRequests = []
    chrome.webRequest.onBeforeRequest.removeListener(bodyRecordingFunction)
    chrome.webRequest.onBeforeSendHeaders.removeListener(recordingFunction)
    chrome.webRequest.onBeforeRequest.removeListener(playbackFunction)

    const mode = items.mode

    if (mode === 'record') {
      logger('Record mode', 'info')
      chrome.webRequest.onBeforeRequest.addListener(
        bodyRecordingFunction,
        { types: ['xmlhttprequest'], urls: ['<all_urls>'] },
        ['blocking', 'extraHeaders', 'requestBody'],
      )
      chrome.webRequest.onBeforeSendHeaders.addListener(
        recordingFunction,
        { types: ['xmlhttprequest'], urls: ['<all_urls>'] },
        ['blocking', 'requestHeaders'],
      )
    } else if (mode === 'playback') {
      logger('Playback mode', 'info')
      chrome.storage.local.get('recordedRequests', function (items) {
        recordedRequests = items.recordedRequests || {}
        chrome.webRequest.onBeforeRequest.addListener(
          playbackFunction,
          { types: ['xmlhttprequest'], urls: ['<all_urls>'] },
          ['blocking'],
        )
      })
    } else {
      logger('Mode not set', 'info')
    }
  })
}

function generateKey(details) {
  return `${details.method}:${details.url}`
}

function isGoodRequest(url, method) {
  if (!url || url.includes('chrome')) return false
  if (method && method === 'OPTIONS') return false
  if (url.includes('api.triplewhale.com')) return true
  return false
}

function setDefaultToken(headers) {
  if (headers && headers.Authorization) {
    chrome.storage.local.set({ token: headers.Authorization })
  }
}

function getToken(headers) {
  if (headers && headers.Authorization) {
    return headers.Authorization
  }

  return chrome.storage.local.get('token', function (items) {
    return items.token
  })
}

// ----------
// Chrome storage
// ----------
// Run once initially
getMode()
// Update on storage change
chrome.storage.onChanged.addListener(function (changes) {
  for (let key in changes) {
    if (key === 'mode') {
      getMode()
    }
  }
})

// ----------
// Record Network Requests
// ----------
let cachedEndpointBodies = {}
const bodyRecordingFunction = function (details) {
  const url =
    details && details.url && details.url?.length > 0 ? details.url : false
  const method = details && details.method ? details.method : false

  if (
    isGoodRequest(url, method) &&
    details.method === 'POST' &&
    details.requestBody &&
    details.requestBody.raw &&
    details.requestBody.raw[0] &&
    details.requestBody.raw[0].bytes &&
    !details.message
  ) {
    const key = generateKey(details)

    try {
      cachedEndpointBodies[key] = JSON.parse(
        decodeURIComponent(
          String.fromCharCode.apply(
            null,
            new Uint8Array(details.requestBody.raw[0].bytes),
          ),
        ),
      )
    } catch (e) {
      logger(`Error parsing body: ${e}`, 'error')
    }
  }
}

let cachedEndpointRequests = []
const recordingFunction = function (details) {
  const url =
    details && details.url && details.url?.length > 0 ? details.url : false
  const method = details && details.method ? details.method : false

  if (isGoodRequest(url, method)) {
    const key = generateKey(details)
    let token = getToken(details.requestHeaders)

    if (!cachedEndpointRequests.includes(key)) {
      cachedEndpointRequests.push(key)

      var params = {
        method: method,
      }

      if (details.requestHeaders) {
        if (url.includes('https://api.triplewhale.com/') && !token) {
          setDefaultToken(details.requestHeaders)
          token = getToken(details.requestHeaders)
        }

        if (token) params.headers.Authorization = token
        params.headers = convertHeadersArrayToObject(details.requestHeaders)
      }

      if (method === 'POST' && cachedEndpointBodies[key]) {
        params.body = JSON.stringify(cachedEndpointBodies[key])
      }

      fetch(details.url, params)
        .then((response) => response.text())
        .then((res) => {
          chrome.storage.local.get('recordedRequests', function (items) {
            const recordedRequests = items.recordedRequests || {}

            if (res && !res.error) {
              recordedRequests[key] = res
              chrome.storage.local.set({ recordedRequests: recordedRequests })
              logger(
                `${details.method} request recorded: ${details.url}`,
                'success',
              )
            } else {
              cachedEndpointRequests = cachedEndpointRequests.filter(
                (item) => item !== key,
              )
            }
          })
        })
    }
  }
}

// ----------
// Playback Network Requests
// ----------
const playbackFunction = function (req) {
  if (!isGoodRequest(req.url, req.method)) return
  if (Object.keys(recordedRequests).length === 0) return

  const key = generateKey(req)
  if (!key) return

  const recordedResponse = recordedRequests[generateKey(req)]
  if (recordedResponse && !recordedResponse.message) {
    logger(`${req.method} request intercepted: ${req.url}`, 'success')

    return {
      redirectUrl:
        'data:text/html;charset=utf-8,' + encodeURIComponent(recordedResponse),
    }
  }

  return
}
