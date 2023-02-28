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

function getMode() {
  chrome.storage.local.get('mode', function (items) {
    const mode = items.mode

    if (mode === 'record') {
      logger('Record mode', 'info')
      chrome.webRequest.onCompleted.removeListener(recordingFunction)
      chrome.webRequest.onBeforeRequest.removeListener(playbackFunction)

      chrome.webRequest.onCompleted.addListener(
        recordingFunction,
        { urls: ['<all_urls>'] },
        ['responseHeaders'],
      )
    } else if (mode === 'playback') {
      logger('Playback mode', 'info')
      chrome.webRequest.onCompleted.removeListener(recordingFunction)
      chrome.webRequest.onBeforeRequest.removeListener(playbackFunction)

      chrome.webRequest.onBeforeRequest.addListener(
        playbackFunction,
        { urls: ['<all_urls>'] },
        ['blocking'],
      )
    } else {
      chrome.webRequest.onCompleted.removeListener(recordingFunction)
      chrome.webRequest.onBeforeRequest.removeListener(playbackFunction)
      logger('Mode not set', 'info')
    }
  })
}

// ----------
// Chrome storage
// ----------
// Run once initially
getMode()
// Update on storage change
chrome.storage.onChanged.addListener(function (changes, namespace) {
  for (let key in changes) {
    if (key === 'mode') {
      getMode()
    }
  }
})

// ----------
// Record Network Requests
// ----------
let cachedEndpointRequests = []
const recordingFunction = function (details) {
  const response = details
  const url = response?.url && response.url?.length > 0 ? response.url : false

  if (
    !url ||
    !response.frameType ||
    url.includes('chrome-extension://') ||
    url.includes('app.triplewhale.com/static/') ||
    url.includes('posthog') ||
    url.includes('datadoghq') ||
    url.includes('intercomcdn') ||
    url.includes('inscreen') ||
    url.includes('cdn.segment') ||
    url.includes('fast.appcues.com') ||
    url.includes('js.intercomcdn.com') ||
    url.includes('profitwell') ||
    url.includes('stripe.com') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('www.google-analytics.com')
  )
    return details

  const key = `${response.method}:${response.url}`

  if (
    url &&
    response?.statusCode >= 200 &&
    response?.statusCode < 300 &&
    !cachedEndpointRequests.includes(key)
  ) {
    cachedEndpointRequests.push(key)

    fetch(response.url)
      .then((response) => response.text())
      .then((res) => {
        chrome.storage.local.get('recordedRequests', function (items) {
          const recordedRequests = items.recordedRequests || {}

          if (res) {
            recordedRequests[key] = res
            chrome.storage.local.set({ recordedRequests: recordedRequests })
            logger(
              `${response.method} request recorded: ${response.url}`,
              'success',
            )
          }
        })
      })
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
