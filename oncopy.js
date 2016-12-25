/* global chrome */

// on copy event, send a message to background.html
function onCopy (e) {
  var selectedText = window.getSelection().toString()
  console.log('text selected is: ' + selectedText)
  chrome.runtime.sendMessage({
    command: 'push',
    message: selectedText
  }, function (response) {
    console.log(JSON.stringify(response))
  })
}

// register event listener for copy events on document
document.addEventListener('copy', onCopy, true)
