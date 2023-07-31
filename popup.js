// ----------
// Helpers
// ----------
function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function setSizes() {
  chrome.storage.local.get('recordedRequests', function (items) {
    const size = JSON.stringify(items.recordedRequests || '').length
    if (size > 1000000 || size <= 2) {
      document.getElementById('save').disabled = true
    } else {
      document.getElementById('save').disabled = false
    }

    document.getElementById('size').innerHTML = `${formatBytes(size)} in-cache`

    const keysSize = Object.keys(items.recordedRequests || {}).length
    chrome.browserAction.setBadgeText({
      text: `${keysSize > 0 ? keysSize : ''}`,
    })
  })
}

function setRecordings(recordings) {
  const recordingsList = document.getElementById('recordings')
  recordingsList.innerHTML = ''

  if (recordings.length > 0) {
    recordings = recordings.sort((a, b) => {
      return b.date.seconds - a.date.seconds
    })

    const disabledOption = document.createElement('option')
    disabledOption.innerHTML = 'Select a recording'
    disabledOption.disabled = true
    disabledOption.selected = true
    disabledOption.value = ''
    recordingsList.appendChild(disabledOption)

    recordings.forEach((recording) => {
      const option = document.createElement('option')
      const view = recording.url.split('.com/')[1].split('/')[0].split('?')[0]
      const store =
        recording.url.split('shop-id=')[1]?.split('&')[0].replace('.myshopify.com', '') ?? ''

      const generatedTitle = `${
        recording.name?.length > 0 ? `${recording.name} - ` : store.length > 0 ? `${store} - ` : ''
      }${recording.name?.length > 0 ? '' : `${view} - `}${recording.date
        .toDate()
        .toLocaleString('en-US')}`

      option.innerHTML = generatedTitle
      option.value = JSON.stringify(recording)
      recordingsList.appendChild(option)
    })
  }
}

function sanitizeRequests(requests) {
  let req = requests
  let keys = [
    //@TODO
    // - this is a common key
    // - we have special name checks below
    'name',
    'firstName',
    'lastName',
    'email',
    'createdBy',
    'updatedBy',
    'first_name',
    'last_name',
    'address1',
    'address2',
    'campaignName',
    'adsetName',
  ]

  let allowedNameString = ['cdp/segment-members']

  Object.keys(req).forEach((key) => {
    keys.forEach((k) => {
      try {
        if (req[key].includes(k)) {
          const re = new RegExp(`"${k}":\s*"[^"]+?([^\/"]+)"`, 'g')

          if (k === 'name') {
            // if name, only allow strings provided above
            if (allowedNameString.filter((string) => key.includes(string)).length <= 0) {
              return
            }
          }

          req[key] = req[key].replaceAll(re, `"${k}":"[REDACTED]"`)

          // conditional to sift escaped quotes
          // only if they are "pre-esacped"
          if (req[key].includes('/"')) {
            const re2 = new RegExp(`\"${k}\":\s*\"[^"]+?([^\/"]+)\"`, 'g')
            req[key] = req[key].replaceAll(re2, `\"${k}\":\"[REDACTED]\"`)
          }
        }
      } catch {}
    })
  })

  return req
}

function getRecordings(db) {
  try {
    db.collection('recordings')
      .get()
      .then((snapshot) => {
        const data = snapshot.docs.map((doc) => doc.data())
        setRecordings(data)
      })
      .catch((error) => {
        console.error(error)
        document.getElementById('firebase-interactions').style.display = 'none'
      })
  } catch {
    document.getElementById('firebase-interactions').style.display = 'none'
  }
}

function showSuccess() {
  document.getElementById('error').style.display = 'none'

  const success = document.getElementById('success')
  success.style.display = 'inline'
  setTimeout(() => {
    document.getElementById('name').value = ''
    success.style.display = 'none'
  }, 3000)
}

function showError() {
  document.getElementById('success').style.display = 'none'

  const error = document.getElementById('error')
  error.style.display = 'inline'
  setTimeout(() => {
    error.style.display = 'none'
  }, 3000)
}

// ----------
// Chrome Storage
// ----------
chrome.storage.onChanged.addListener(setSizes)
chrome.storage.local.get('recordedRequests', setSizes)
chrome.storage.local.get('mode', function (items) {
  const mode = items.mode

  if (mode === 'record') {
    document.getElementById('record').classList.add('active')
    document.getElementById('sanitize').style.display = 'none'
  } else if (mode === 'playback') {
    document.getElementById('playback').classList.add('active')
    document.getElementById('sanitize').style.display = 'inline'
  }
})

// ----------
// DCL - Needed for Firebase
// ----------
document.addEventListener('DOMContentLoaded', function () {
  // ----------
  // Firebase
  // ----------
  let app = false
  let db = false

  try {
    const firebaseConfig = {
      apiKey: 'AIzaSyDxtA6hzw-mrGVfSJUNBf1WgoSLjT8rFwc',
      authDomain: 'chrome-extension-6451e.firebaseapp.com',
      projectId: 'chrome-extension-6451e',
      storageBucket: 'chrome-extension-6451e.appspot.com',
      messagingSenderId: '928974935892',
      appId: '1:928974935892:web:6bbd46c6812aacf9831ac1',
      measurementId: 'G-0FMB1NC9D1',
    }
    app = firebase.initializeApp(firebaseConfig)
    db = app.firestore()
    getRecordings(db)
  } catch {
    document.getElementById('firebase-interactions').style.display = 'none'
  }

  // ----------
  // Event Listeners
  // ----------
  document.getElementById('record').addEventListener('click', function () {
    chrome.storage.local.set({ mode: 'record' })
    document.getElementById('record').classList.add('active')
    document.getElementById('playback').classList.remove('active')
    document.getElementById('sanitize').style.display = 'none'
    setSizes()
  })

  document.getElementById('playback').addEventListener('click', function () {
    chrome.storage.local.set({ mode: 'playback' })
    document.getElementById('playback').classList.add('active')
    document.getElementById('record').classList.remove('active')
    document.getElementById('sanitize').style.display = 'inline'
    setSizes()
  })

  document.getElementById('sanitize').addEventListener('click', function () {
    chrome.storage.local.get('recordedRequests', function (items) {
      const sanitizedRequests = sanitizeRequests(items.recordedRequests)
      chrome.storage.local.set({ recordedRequests: sanitizedRequests })

      debugger

      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.reload(tabs[0].id)
        chrome.runtime.reload()
      })
    })
  })

  document.getElementById('reset').addEventListener('click', function () {
    chrome.storage.local.clear()
    document.getElementById('playback').classList.remove('active')
    document.getElementById('record').classList.remove('active')
    document.getElementById('sanitize').style.display = 'none'
    document.getElementById('save').value = ''
    setSizes()
  })

  document.getElementById('save').addEventListener('click', function (e) {
    e.target.disabled = true

    let name = document.getElementById('name').value

    chrome.storage.local.get('recordedRequests', function (items) {
      const sanitizedRequests = sanitizeRequests(items.recordedRequests)
      chrome.storage.local.set({ recordedRequests: sanitizedRequests })
      chrome.tabs.getSelected(null, function (tab) {
        if (db && items.recordedRequests) {
          // @TODO - Improvement
          // use cloud storage for this file
          // if greater than 1mb
          // then reference it below
          // https://firebase.google.com/docs/storage/web/upload-files
          db.collection('recordings')
            .add({
              date: new Date(),
              title: tab.title,
              url: tab.url,
              name: name,
              requests: sanitizedRequests,
            })
            .then(function (docRef) {
              showSuccess()
              console.log('Document written with ID: ', docRef.id)
              getRecordings(db)
            })
            .catch(function (error) {
              showError()
              console.error('Error adding document: ', error)
            })
            .finally(() => {
              e.target.disabled = false
            })
        } else {
          e.target.disabled = false
        }
      })
    })
  })

  document.getElementById('recordings').addEventListener('change', function (e) {
    document.getElementById('load').disabled = false
  })

  document.getElementById('load').addEventListener('click', function (e) {
    e.target.disabled = true
    const recording = document.getElementById('recordings').value
    const data = JSON.parse(recording)

    if (data && data.requests) {
      chrome.storage.local.set({ recordedRequests: data.requests })
      document.getElementById('playback').click()
    }

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.update(tabs[0].id, { url: data.url }, function () {
        chrome.runtime.reload()
        window.close()
      })
    })
  })
})
