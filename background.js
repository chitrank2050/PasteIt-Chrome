/* global chrome, PasteIt, firebase */
'user strict'

var pasteIt

function initApp () {
  pasteIt = new PasteIt()
  pasteIt.initializeApp()
  console.log('background.js running')
}

// Controller for various events from Popup
chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    console.log(sender.tab ? 'from a content script:' + sender.tab.url : 'from the extension')

    switch (request.command) {
      case 'copy':
        pasteIt.copyMessage(request.message, sendResponse)
        break
      case 'push':
        pasteIt.pushMessage(request.message, sendResponse)
        break
      case 'isSignedIn':
        sendResponse({
          success: Boolean(pasteIt.auth.currentUser)
        })
        break
      case 'signOut':
        pasteIt.auth.signOut()
        sendResponse({
          success: Boolean(pasteIt.auth.currentUser),
          message: 'User signed out'
        })
        break
      default:
        console.error('Request contains no command')
    }
  })

window.onload = function () {
  firebase.initializeApp(config)
  initApp()
}

// config variable from firebase console
var config = {
  apiKey: 'AIzaSyDo8JPYxtypGEuNsXwkAEszoW5Sjr6z9Fs',
  authDomain: 'pasteit-84c04.firebaseapp.com',
  databaseURL: 'https://pasteit-84c04.firebaseio.com',
  storageBucket: 'pasteit-84c04.appspot.com',
  messagingSenderId: '97814606005'
}
