# &#x1F433;&#x1F433;&#x1F433; Session Recorder

A chrome extension (Manifest v2) to record and replay user sessions, with the ability to push/pull the recorded sessions to Firebase

## &#9881;&#65039; Installation

1. Clone the repo
1. Open Chrome and go to `chrome://extensions`
1. Enable `Developer mode`
1. Click on `Load unpacked` and select the `extension` folder

## &#129497;&#8205;&#9794;&#65039; Usage

1. Click on the extension icon
1. Click `Record`
1. Do your thing
1. Click on `Playback`
1. (optional) Click `Sanitize` to remove sensitive data from the recorded requests
1. Reload the page (`Sanitize` will reload for you)
1. (optional) Click `Save to Firebase` to push the recorded session to Firebase
1. (optional) Select a session and click `Load from Firebase` to pull the recorded session from Firebase
1. (optional) Click `Clear` to clear the recorded session and start over
