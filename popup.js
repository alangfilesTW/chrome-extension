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

function toDateTime(secs) {
  var t = new Date(1970, 0, 1) // Epoch
  t.setSeconds(secs)
  return t
}

function setSizes() {
  chrome.storage.local.get('recordedRequests', function (items) {
    document.getElementById('size').innerHTML = `&nbsp;&nbsp;${formatBytes(
      JSON.stringify(items.recordedRequests || '').length,
    )}`
  })
}

function setRecordings(recordings) {
  const recordingsList = document.getElementById('recordings')
  recordingsList.innerHTML = ''

  if (recordings.length > 0) {
    const disabledOption = document.createElement('option')
    disabledOption.innerHTML = 'Select a recording'
    disabledOption.disabled = true
    disabledOption.selected = true
    disabledOption.value = ''
    recordingsList.appendChild(disabledOption)

    recordings.forEach((recording) => {
      const option = document.createElement('option')
      option.innerHTML = `${recording.title} - ${toDateTime(
        recording.date?.seconds,
      )}`
      option.value = JSON.stringify(recording)
      recordingsList.appendChild(option)
    })
  }
}

function sanitizeRequests(requests) {
  return requests.map((request) => {})
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
  } else if (mode === 'playback') {
    document.getElementById('playback').classList.add('active')
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
    setSizes()
  })

  document.getElementById('playback').addEventListener('click', function () {
    chrome.storage.local.set({ mode: 'playback' })
    document.getElementById('playback').classList.add('active')
    document.getElementById('record').classList.remove('active')
    setSizes()
  })

  document.getElementById('reset').addEventListener('click', function () {
    chrome.storage.local.clear()
    document.getElementById('playback').classList.remove('active')
    document.getElementById('record').classList.remove('active')
    setSizes()
  })

  document.getElementById('save').addEventListener('click', function (e) {
    e.target.disabled = true

    chrome.storage.local.get('recordedRequests', function (items) {
      // @TODO scrub senstiive data
      // email, firstname, lastname, address, phone, etc
      console.log(items.recordedRequests)

      chrome.tabs.getSelected(null, function (tab) {
        if (db && items.recordedRequests) {
          // @TODO use cloud storage for this file
          // then reference it below
          db.collection('recordings')
            .add({
              date: new Date(),
              title: tab.title,
              requests: items.recordedRequests,
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
              e.target.disabled = true
            })
        }
      })
    })
  })

  document.getElementById('load').addEventListener('click', function (e) {
    e.target.disabled = true
    const recording = document.getElementById('recordings').value
    const data = JSON.parse(recording)

    if (data && data.requests) {
      chrome.storage.local.set({ recordedRequests: data.requests })
      document.getElementById('playback').click()
    }

    e.target.disabled = false
  })
})
