chrome.storage.local.get('mode', function(items) {
    const mode = items.mode;

    if (mode === 'record') {
      recordingFunction();
    } else if (mode === 'playback') {
      playbackFunction();
    }
  });
  

  const recordingFunction = () => {
    // Record mode: capture request and response data
    chrome.webRequest.onCompleted.addListener(function(response) {
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
      }, { urls: ["<all_urls>"] }, ["responseHeaders"]);
  }

  const playbackFunction = () => {
    // Playback mode: modify response data for matching URLs
    chrome.webRequest.onBeforeRequest.addListener(function(details) {
        chrome.storage.local.get('recordedRequests', function(items) {
          const recordedRequests = items.recordedRequests || {};
          const response = recordedRequests[details.url];
          if (response) {
            return { redirectUrl: "data:text/html;charset=utf-8," + encodeURIComponent(response) };
          }
        });
      }, { urls: ["<all_urls>"] }, ["blocking"]);
  }