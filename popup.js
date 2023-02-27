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
  // SEND TO FIREBASE
  console.log('send to firebase')
})

chrome.storage.local.get('mode', function (items) {
  const mode = items.mode

  if (mode === 'record') {
    document.getElementById('record').classList.add('active')
  } else if (mode === 'playback') {
    document.getElementById('playback').classList.add('active')
  }
})
