function getMode() {
  chrome.storage.local.get('mode', function (items) {
    const mode = items.mode

    if (mode === 'record') {
      console.log('Record mode')
      chrome.webRequest.onCompleted.removeListener(recordingFunction)
      chrome.webRequest.onBeforeRequest.removeListener(playbackFunction)

      chrome.webRequest.onCompleted.addListener(
        recordingFunction,
        { urls: ['<all_urls>'] },
        ['responseHeaders'],
      )
    } else if (mode === 'playback') {
      console.log('Playback mode')
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
      console.log('Empty state')
    }
  })
}

getMode()
chrome.storage.onChanged.addListener(function (changes, namespace) {
  for (let key in changes) {
    if (key === 'mode') {
      getMode()
    }
  }
})

let cachedEndpointRequests = []
const recordingFunction = function (details) {
  const response = details
  const url = response?.url && response.url?.length > 0 ? response.url : false

  if (!url) return
  if (url.includes('chrome-extension://')) return

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
            console.log(`${response.method} request recorded: ${response.url}`)
          }
        })
      })
  }
}

const playbackFunction = function (res) {
  chrome.storage.local.get('recordedRequests', function (items) {
    const recordedRequests = items.recordedRequests || {}
    const response = recordedRequests[`${res.method}:${res.url}`]
    if (response) {
      console.log(`${res.method} request intercepted: ${res.url}`)

      return {
        redirectUrl:
          'data:text/html;charset=utf-8,' + encodeURIComponent(response),
      }
    }
  })
}

const sendRecording = function () {
  chrome.storage.local.get('recordedRequests', function (items) {
    const recordedRequests = items.recordedRequests || {}

    // SEND TO FIREBASE
    console.log(recordedRequests)
  })
}
