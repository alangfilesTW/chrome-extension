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

function getMode() {
  chrome.storage.local.get('mode', function (items) {
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
        ['blocking', 'extraHeaders', 'requestHeaders'],
      )
    } else if (mode === 'playback') {
      logger('Playback mode', 'info')
      chrome.webRequest.onBeforeRequest.addListener(
        playbackFunction,
        { types: ['xmlhttprequest'], urls: ['<all_urls>'] },
        ['blocking'],
      )
    } else {
      logger('Mode not set', 'info')
    }
  })
}

function generateKey(details) {
  return `${details.method}:${details.url}`
}

function isGoodRequest(url, method) {
  if (
    !url ||
    url.includes('chrome-extension://') ||
    url.includes('app.triplewhale.com/static/') ||
    url.includes('firebaselogging-pa.googleapis.com') ||
    url.includes('lotties') ||
    url.includes('firestore') ||
    url.includes('google-analytics') ||
    url.includes('play.google') ||
    url.includes('posthog') ||
    url.includes('datadoghq') ||
    url.includes('intercom') ||
    url.includes('inscreen') ||
    url.includes('amplitude') ||
    url.includes('cdn.segment') ||
    url.includes('fast.appcues.com') ||
    url.includes('js.intercomcdn.com') ||
    url.includes('profitwell') ||
    url.includes('stripe.com') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('canny.io') ||
    url.includes('cdn.jsdelivr.net') ||
    url.includes('api.segment.io') ||
    url.includes('stripe') ||
    (method && method === 'OPTIONS')
  )
    return false

  return true
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
    !details.error
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

    if (!cachedEndpointRequests.includes(key)) {
      cachedEndpointRequests.push(key)

      var params = {
        method: method,
      }

      if (method === 'POST' && cachedEndpointBodies[key]) {
        params.body = JSON.stringify(cachedEndpointBodies[key])

        if (details.requestHeaders) {
          params.headers = convertHeadersArrayToObject(details.requestHeaders)
        }
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
const playbackFunction = function (res) {
  chrome.storage.local.get('recordedRequests', function (items) {
    const recordedRequests = items.recordedRequests || {}
    const response = recordedRequests[`${res.method}:${res.url}`]
    if (response) {
      logger(`${res.method} request intercepted: ${res.url}`, 'success')

      return {
        redirectUrl:
          'data:text/html;charset=utf-8,' + encodeURIComponent(response),
      }
    } else {
      return res
    }
  })
}
