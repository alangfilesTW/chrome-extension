chrome.storage.local.get('mode', function(items) {
    const mode = items.mode;

    if (mode === 'record') {
        if(chrome.webRequest.onCompleted.hasListener(responsePlaybackFunction)){
            chrome.webRequest.onCompleted.removeListener(responsePlaybackFunction);
        }
        chrome.webRequest.onCompleted.addListener(listeningFunction, { urls: ["<all_urls>"] }, ["responseHeaders"]);
    } else if (mode === 'playback') {
        if(chrome.webRequest.onBeforeRequest.hasListener(listeningFunction)){
            chrome.webRequest.onBeforeRequest.removeListener(listeningFunction);
        }
        chrome.webRequest.onBeforeRequest.addListener(responsePlaybackFunction, { urls: ["<all_urls>"] }, ["blocking"]);
    }
  });

  const recordingFunction = function(details) {
    const response = details;
    if (response.statusCode >= 200 && response.statusCode < 300) {
      const url = response.url;
      const request = new XMLHttpRequest();
      request.open("GET", url, true);
      request.onreadystatechange = function() {
        if (request.readyState === 4) {
          const response = request.responseText;
          chrome.storage.local.get('recordedRequests', function(items) {
            const recordedRequests = items.recordedRequests || {};
            recordedRequests[url] = response;
            chrome.storage.local.set({ recordedRequests: recordedRequests });
          });
        }
      };
      request.send();
    }
  }
  
  const playbackFunction = function(details) {
    const response = details;
    chrome.storage.local.get('recordedRequests', function(items) {
      const recordedRequests = items.recordedRequests || {};
      const response = recordedRequests[response.url];
      if (response) {
        return { redirectUrl: "data:text/html;charset=utf-8," + encodeURIComponent(response) };
      }
    });
  }
