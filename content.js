// ----------
// Constants
// ----------
let shopName = ''

// ----------
// Helpers
// ----------
function contains(selector, text) {
  var elements = document.querySelectorAll(selector)
  // lord forgive me
  return [].filter.call(elements, function (element) {
    return RegExp(text).test(
      Array.from(element.childNodes)
        .map(function (e) {
          return e.nodeType === 3 && e.textContent.trim().includes(text)
            ? e.textContent.trim()
            : ''
        })
        .join(''),
    )
  })
}

function wrapRedacted() {
  ;['[REDACTED]', '[REDACTED] [REDACTED]', shopName].forEach(function (text) {
    const redactedText = contains(
      'h1, h2, h3, h4, h5, h6, p, div, span, button',
      text,
    )
    redactedText.forEach(function (element) {
      if ((element.getAttribute('data-id') || '').includes('redacted')) return
      element.setAttribute('data-id', 'redacted')
    })
  })
}

// ----------
// Listeners
// ----------
document.addEventListener('DOMContentLoaded', function () {
  var styleSheet = document.createElement('style')
  styleSheet.innerText = `
    [data-id="redacted"] {
      filter: blur(3px);
    }
  `
  document.head.appendChild(styleSheet)

  // try to find shop name
  try {
    const shopImage = document.querySelector('img[alt="shop logo"]')
    if (shopImage) {
      shopName = shopImage.src.split('shop-icon/')[1].split('.myshopify')[0]
    }
  } catch {}
})

const config = { attributes: true, childList: true, subtree: true }
const observerCallback = (mutationList, observer) => {
  for (const mutation of mutationList) {
    if (mutation.type === 'childList') {
      wrapRedacted()
    } else if (mutation.type === 'attributes') {
      // wrapRedacted()
    }
  }
}

let observer = false
function makeObserver(items) {
  if (observer) observer.disconnect()

  if (items.mode === 'playback') {
    observer = new MutationObserver(observerCallback)
    observer.observe(document.body, config)
  }
}

// repentance required
document.addEventListener('DOMContentLoaded', function () {
  chrome.storage.local.get('mode', function (items) {
    if (items.mode === 'playback') {
      makeObserver(items)
    } else if (observer) {
      observer.disconnect()
    }
  })
})

chrome.storage.onChanged.addListener(function (changes) {
  for (let key in changes) {
    if (key === 'mode' && changes[key] === 'playback') {
      makeObserver(changes)
    } else if (observer) {
      observer.disconnect()
    }
  }
})
