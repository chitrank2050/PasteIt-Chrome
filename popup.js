/**
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

 /* global chrome, jQuery, firebase */

'use strict'

// Initializes Popup.
function Popup () {
  this.checkSetup()

  // Properties
  // Firebase
  this.MESSAGES = 'clip_items/'
  this.USERS = 'users/'
  this.MAX_MSG_LIMIT = 12
  this.CHROME = 'CHROME'
  this.PHONE = 'PHONE'
    // User
  this.email = this.FAKE_EMAIL
  this.displayName = this.ANONYMOUS
  this.profilePicUrl = this.PROFILE_PLACEHOLDER

  this.FAKE_EMAIL = 'user@common.room'
  this.ANONYMOUS = 'Anonymous'
    // Asset Paths
  this.CHIP_CHROME = './images/chip_browser.png'
  this.CHIP_PHONE = './images/chip_phone.png'
  this.PROFILE_PLACEHOLDER = './images/profile_placeholder.png'
    // A loading image URL.
  this.LOADING_IMAGE_URL = 'https://www.google.com./images/spin-32.gif'
    // Template for messages.
  this.MESSAGE_TEMPLATE =
    '<div class="message-container">' +
    '<div class="spacing"><div class="pic"></div></div>' +
    '<div class="message"></div>' +
    '<div class="time"></div>' +
    '</div>'

  // Shortcuts to DOM Elements.
  this.messageList = document.getElementById('messages')
  this.messageForm = document.getElementById('message-form')
  this.messageInput = document.getElementById('message')
  this.submitButton = document.getElementById('submit')
  this.submitImageButton = document.getElementById('submitImage')
  this.imageForm = document.getElementById('image-form')
  this.mediaCapture = document.getElementById('mediaCapture')
  this.userPic = document.getElementById('user-pic')
  this.userName = document.getElementById('user-name')
  this.signInButton = document.getElementById('sign-in')
  this.signOutButton = document.getElementById('sign-out')
  this.signInSnackbar = document.getElementById('must-signin-snackbar')

  // Saves message on form submit.
  this.messageForm.addEventListener('submit', this.saveMessage.bind(this))
  this.signOutButton.addEventListener('click', this.signOut.bind(this))
  this.signInButton.addEventListener('click', this.signIn.bind(this))

  // Toggle for the button.
  var buttonTogglingHandler = this.toggleButton.bind(this)
  this.messageInput.addEventListener('keyup', buttonTogglingHandler)
  this.messageInput.addEventListener('change', buttonTogglingHandler)

  this.initFirebase()
}

// Sets up shortcuts to Firebase features and initiate firebase auth.
Popup.prototype.initFirebase = function () {
  // Shortcuts for Firebase SDK features.
  this.database = firebase.database()
  this.auth = firebase.auth()
    // Listen to auth state state change.
  this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this))
}

// Triggers when the auth state change for instance when the user signs-in or signs-out.
Popup.prototype.onAuthStateChanged = function (user) {
  if (user) {
    // User is signed in!
    this.userId = user.uid
    if (!user.isAnonymous) {
      this.profilePicUrl = user.photoURL
      this.displayName = user.displayName
      this.email = user.email
    } else {
      this.profilePicUrl = this.PROFILE_PLACEHOLDER
      this.displayName = this.ANONYMOUS
      this.email = ''
    }

    // Set the user's profile pic and name.
    this.userPic.firstElementChild.src = this.profilePicUrl
    this.userName.textContent = this.displayName

    // Show user's profile and sign-out button.
    this.userName.removeAttribute('hidden')
    this.userPic.removeAttribute('hidden')
    this.signOutButton.removeAttribute('hidden')

    // Hide sign-in button.
    this.signInButton.setAttribute('hidden', 'true')

    // We load currently existing chant messages.
    this.loadMessages()
  } else { // User is signed out!
    // Hide user's profile and sign-out button.
    this.userName.setAttribute('hidden', 'true')
    this.userPic.setAttribute('hidden', 'true')
    this.signOutButton.setAttribute('hidden', 'true')

    // Show sign-in button.
    this.signInButton.removeAttribute('hidden')
  }
}

// Loads chat messages history and listens for upcoming ones.
Popup.prototype.loadMessages = function () {
  // TODO change email -> this.currentUser.email
  this.messagesRef = this.database.ref(this.MESSAGES + this.userId)
    // Loads the last MAX persmissible messages and listen for new ones.
  this.messagesRef.limitToLast(this.MAX_MSG_LIMIT).on('child_added', this.onMessageLoadedListener.bind(this))
}

Popup.prototype.onMessageLoadedListener = function (snapshot) {
  var clipData = snapshot.val()
  this.mapDataToView(clipData)
}

// call displayMessage to display messages from Firebase DataSnapShot
Popup.prototype.mapDataToView = function (data) {
  console.log(JSON.stringify(data))
  this.displayMessage(data.id, data.deviceType, data.text, data.senderEmail, data.timestamp)
}

// Displays a Message in the UI.
Popup.prototype.displayMessage = function (key, sender, text, email, timestamp) {
  var div = document.getElementById(key)
    // If an element for that message does not exists yet we create it.
  if (!div) {
    var container = document.createElement('div')
    container.innerHTML = this.MESSAGE_TEMPLATE
    div = container.firstChild
    div.setAttribute('id', key)
    this.messageList.appendChild(div)
  }

  var picUrl = null
  if (sender === this.CHROME) {
    picUrl = this.CHIP_CHROME
  } else if (sender === this.PHONE) {
    picUrl = this.CHIP_PHONE
  } else {
    picUrl = this.PROFILE_PLACEHOLDER
  }
  div.querySelector('.pic').style.backgroundImage = 'url(' + picUrl + ')'
  div.querySelector('.time').textContent = jQuery.timeago(new Date(timestamp))

  var messageElement = div.querySelector('.message')
  if (text) { // If the message is text.
    messageElement.textContent = text
      // Replace all line breaks by <br>.
    messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>')
  }

  div.addEventListener('click', function (e) {
    this.sendToBackground('copy', text, 'Copy Failed. Please try again')
      // TODO remove log
    console.log(messageElement + ' was clicked')
  })

  setTimeout(function () {
    div.classList.add('visible')
  }, 1)
  this.messageList.scrollTop = this.messageList.scrollHeight
  this.messageInput.focus()
}

// Save message in Firebase Database
Popup.prototype.saveMessage = function (e) {
  e.preventDefault()
    // Check that the user entered a message and is signed in.
  if (this.messageInput.value) {
    this.sendToBackground('push', this.messageInput.value, 'Couldn\'t push message. Please try again')
      // Clear message text field and SEND button state.
    this.resetMaterialTextfield(this.messageInput)
    this.toggleButton()
  }
}

/**
 * Starts the sign-in process.
 */
Popup.prototype.signIn = function () {
  this.startAuth(true)
}
/**
 * Start the auth flow and authorizes to Firebase.
 * @param{boolean} interactive True if the OAuth flow should request with an interactive mode.
 */
Popup.prototype.startAuth = function (interactive) {
  // Request an OAuth token from the Chrome Identity API.
  chrome.identity.getAuthToken({ interactive: !!interactive }, function (token) {
    if (chrome.runtime.lastError && !interactive) {
      console.log('It was not possible to get a token programmatically.')
    } else if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError)
    } else if (token) {
      // Authrorize Firebase with the OAuth Access Token.
      var credential = firebase.auth.GoogleAuthProvider.credential(null, token)
      this.auth.signInWithCredential(credential).catch(function (error) {
        // The OAuth token might have been invalidated. Lets' remove it from cache.
        if (error.code === 'auth/invalid-credential') {
          chrome.identity.removeCachedAuthToken({ token: token }, function () {
            this.startAuth(interactive)
          })
        }
      })
    } else {
      console.error('The OAuth Token was null')
    }
  }.bind(this))
}

// Signs-out of Friendly Chat.
Popup.prototype.signOut = function () {
  // Sign out of Firebase.
  this.sendToBackground('signOut')
}

// Resets the given MaterialTextField.
Popup.prototype.resetMaterialTextfield = function (element) {
  element.value = ''
  element.parentNode.MaterialTextfield.boundUpdateClassesHandler()
}

Popup.prototype.sendToBackground = function (command, message, errorMessage) {
  chrome.runtime.sendMessage({
    command: command,
    message: message
  }, function (response) {
    console.log('Response: ' + JSON.stringify(response) + '\nfor Command: ' + command)
    if (!response.success) {
      console.error(errorMessage)
      this.showToast(errorMessage)
    } else if (response.message) {
      console.log(response.message)
      this.showToast(response.message)
    }
  }.bind(this))
}

// Display a message to the user using a Toast.
Popup.prototype.showToast = function (text) {
  var data = {
    message: text,
    timeout: 2000
  }
  this.signInSnackbar.MaterialSnackbar.showSnackbar(data)
}

// Enables or disables the submit button depending on the values of the input
// fields.
Popup.prototype.toggleButton = function () {
  if (this.messageInput.value) {
    this.submitButton.removeAttribute('disabled')
  } else {
    this.submitButton.setAttribute('disabled', 'true')
  }
}

// Checks that the Firebase SDK has been correctly setup and configured.
Popup.prototype.checkSetup = function () {
  if (!window.firebase || !(window.firebase.app instanceof Function) || !config) {
    window.alert('You have not configured and imported the Firebase SDK. ' +
      'Make sure you go through the codelab setup instructions.')
  } else if (config.storageBucket === '') {
    window.alert('Your Firebase Storage bucket has not been enabled. Sorry about that. This is ' +
      'actually a Firebase bug that occurs rarely. ' +
      'Please go and re-generate the Firebase initialisation snippet (step 4 of the codelab) ' +
      'and make sure the storageBucket attribute is not empty. ' +
      'You may also need to visit the Storage tab and paste the name of your bucket which is ' +
      'displayed there.')
  }
}

// config variable from firebase console
var config = {
  apiKey: 'AIzaSyDo8JPYxtypGEuNsXwkAEszoW5Sjr6z9Fs',
  authDomain: 'pasteit-84c04.firebaseapp.com',
  databaseURL: 'https://pasteit-84c04.firebaseio.com',
  storageBucket: 'pasteit-84c04.appspot.com',
  messagingSenderId: '97814606005'
}

window.onload = function () {
  window.firebase.initializeApp(config)
  window.popup = new Popup()
}

window.unonload = function () {
  window.popup.messagesRef.off(this.onMessageLoadedListener.bind(this))
  console.log('popup window unloaded and listener switched off')
}
