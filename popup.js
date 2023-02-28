function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function setSizes(changes) {
  if (changes && changes.recordedRequests) {
    document.getElementById('size').innerHTML = `&nbsp;&nbsp;${formatBytes(
      JSON.stringify(changes.recordedRequests).length,
    )}`
  }
}

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

function setRecordings(recordings) {
  const recordingsList = document.getElementById('recordings')
  if (recordings.length > 0) {
    recordings.forEach((recording) => {
      const option = document.createElement('option')
      option.innerHTML = recording
      option.value = recording.date
      recordingsList.appendChild(option)
    })
  }
}

document.addEventListener('DOMContentLoaded', function () {
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

    db.collection('recordings')
      .get()
      .then((snapshot) => {
        console.log(snapshot)
      })
      .catch((error) => {
        console.error(error)
        document.getElementById('firebase-interactions').style.display = 'none'
      })
  } catch {}

  console.log(db)

  document.getElementById('record').addEventListener('click', function () {
    chrome.storage.local.set({ mode: 'record' })
    document.getElementById('record').classList.add('active')
    document.getElementById('playback').classList.remove('active')
  })

  document.getElementById('playback').addEventListener('click', function () {
    chrome.storage.local.set({ mode: 'playback' })
    document.getElementById('playback').classList.add('active')
    document.getElementById('record').classList.remove('active')
  })

  document.getElementById('reset').addEventListener('click', function () {
    chrome.storage.local.clear()
    document.getElementById('playback').classList.remove('active')
    document.getElementById('record').classList.remove('active')
  })

  document.getElementById('save').addEventListener('click', function () {
    console.log('send to firebase')

    chrome.storage.local.get('recordedRequests', function (recordedRequests) {
      // @TODO scrub senstiive data
      // email, firstname, lastname, address, phone, etc

      console.log(
        db,
        recordedRequests.recordedRequests,
        db && recordedRequests.recordedRequests,
      )

      if (db && recordedRequests.recordedRequests) {
        // @TODO need to use cloud storage for this file
        // then reference it below
        db.collection('recordings')
          .add({
            date: new Date(),
            requests: JSON.stringify(recordedRequests.recordedRequests),
          })
          .then(function (docRef) {
            console.log('Document written with ID: ', docRef.id)
          })
          .catch(function (error) {
            console.error('Error adding document: ', error)
          })
      }
    })
  })

  document.getElementById('load').addEventListener('click', function () {
    console.log('load from firebase')
  })
})
