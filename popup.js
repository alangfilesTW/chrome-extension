document.getElementById('record').addEventListener('click', function() {
    chrome.storage.local.set({ mode: 'record' });
    document.getElementById('record').classList.add("active");
    document.getElementById('playback').classList.remove("active");
  });
  
document.getElementById('playback').addEventListener('click', function() {
    chrome.storage.local.set({ mode: 'playback' });
    document.getElementById('playback').classList.add("active");
    document.getElementById('record').classList.remove("active");
});