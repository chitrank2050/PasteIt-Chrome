'user strict'

var pasteIt

function initApp (app) {
  pasteIt = new PasteIt(app)
  pasteIt.initializeApp()
  if (pasteIt.USER_ID !== '0000') {
    console.log('Authentication in background - ' + (pasteIt.signIn().success ? 'successful' : 'unsuccessful'))
  }
}

/*
 ██████  ██████  ███    ██ ████████ ███████ ██   ██ ████████     ███    ███ ███████ ███    ██ ██    ██
██      ██    ██ ████   ██    ██    ██       ██ ██     ██        ████  ████ ██      ████   ██ ██    ██
██      ██    ██ ██ ██  ██    ██    █████     ███      ██        ██ ████ ██ █████   ██ ██  ██ ██    ██
██      ██    ██ ██  ██ ██    ██    ██       ██ ██     ██        ██  ██  ██ ██      ██  ██ ██ ██    ██
 ██████  ██████  ██   ████    ██    ███████ ██   ██    ██        ██      ██ ███████ ██   ████  ██████
*/

var PHONE_TITLE = 'Phone'
var PHONE_ID = 'phone'
var PAGE = 'page'
var SELECTION = 'selection'
var LINK = 'link'
var chromeApi = chrome

function onClickHandler (info, tab) {
  var id = info.menuItemId.split(':')
  switch (id[1]) {
    case PAGE:
      pasteIt.pushMessage(info.pageUrl, function (response) {
        console.log(JSON.stringify(response))
      })
      break
    case SELECTION:
      pasteIt.pushMessage(info.selectionText, function (response) {
        console.log(JSON.stringify(response))
      })
      break
    case LINK:
      pasteIt.pushMessage(info.linkUrl, function (response) {
        console.log(JSON.stringify(response))
      })
      break
    default:
      console.log('Not supported')
  }
}

chromeApi.contextMenus.onClicked.addListener(onClickHandler)

/* Method to setup context menu items */
function setUpContextMenu () {
  // Create one test item for each context type.
  var contexts = [PAGE, SELECTION, LINK]
  for (var i = 0; i < contexts.length; i++) {
    var context = contexts[i]
    var title = PHONE_TITLE
    var id = chromeApi.contextMenus.create({
      'title': title,
      'contexts': [context],
      'id': PHONE_ID + ':' + context
    })
    console.log("'" + context + "' item:" + id)
  }
}

/*
███████ ██    ██ ███████ ███    ██ ████████     ██   ██  █████  ███    ██ ██████  ██      ███████ ██████
██      ██    ██ ██      ████   ██    ██        ██   ██ ██   ██ ████   ██ ██   ██ ██      ██      ██   ██
█████   ██    ██ █████   ██ ██  ██    ██        ███████ ███████ ██ ██  ██ ██   ██ ██      █████   ██████
██       ██  ██  ██      ██  ██ ██    ██        ██   ██ ██   ██ ██  ██ ██ ██   ██ ██      ██      ██   ██
███████   ████   ███████ ██   ████    ██        ██   ██ ██   ██ ██   ████ ██████  ███████ ███████ ██   ██
*/

// Controller for various events from Popup
chromeApi.runtime.onMessage.addListener(
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

var config = {
  apiKey: 'AIzaSyDo8JPYxtypGEuNsXwkAEszoW5Sjr6z9Fs',
  authDomain: 'pasteit-84c04.firebaseapp.com',
  databaseURL: 'https://pasteit-84c04.firebaseio.com',
  storageBucket: 'pasteit-84c04.appspot.com',
  messagingSenderId: '97814606005'
}

window.onload = function () {
  var app = firebase.initializeApp(config)
  setUpContextMenu()
  console.log('background.js running')
  initApp(app)
}
