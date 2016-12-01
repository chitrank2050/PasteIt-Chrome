function PasteIt (firebaseApp) {
  // User Details
  this.email = this.FAKE_EMAIL
  this.userName = this.ANONYMOUS
  this.userId = this.USER_ID

  this.FAKE_EMAIL = 'user@common.room'
  this.ANONYMOUS = 'Anonymous'
  this.USER_ID = '0000'

  // Firebase Database
  this.userPath = 'users/'
  this.messagePath = 'clip_items/'

  this.firebaseApp = firebaseApp
}

/* Initialize firebase helper objects */
PasteIt.prototype.initializeApp = function () {
  this.auth = this.firebaseApp.auth()
  this.database = this.firebaseApp.database()
  this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this))
}

/* Sets user details when user signs in and signs out */
PasteIt.prototype.onAuthStateChanged = function (user) {
  if (user) { // User is signed in!
    this.userId = user.uid
    if (!user.isAnonymous) {
      this.email = user.email
    } else {
      this.email = user.uid
      this.userName = this.ANONYMOUS
    }

    this.writeUserData()
    this.loadLatestMessage()
  }
}

/* Add user to firebase database */
PasteIt.prototype.writeUserData = function () {
  this.database.ref(this.userPath + this.userId).set({
    name: this.userName,
    email: this.email,
    chrome: true
  })
}

/* Pushes a Message to Firebase Database */
PasteIt.prototype.pushMessage = function (text, sendResponse) {
  if (this.auth.currentUser) {
    var timestamp = Date.now()
      // Add a new message entry to the Firebase Database.
    var message = {
      clip: text,
      sender_email: this.email,
      sender_device: 'CHROME',
      timestamp: timestamp
        // photoUrl: currentUser.photoURL || './images/profile_placeholder.png'
    }
    console.log('message before push: ' + JSON.stringify(message))
    this.messagesRef.push(message, function (error) {
      console.log('message after push completed: ' + JSON.stringify(message))
      if (!error) {
        sendResponse({
          success: true,
          message: message
        })
      } else {
        sendResponse({
          success: false,
          message: error.message
        })
      }
    }).catch(function (error) {
      console.error('Error writing new message to Firebase Database', error)
    })
    console.log('Pushed to firebase')
  } else {
    sendResponse({
      success: false,
      message: 'Please Sign in First'
    })
  }
}

/* Copies the given message to clipboard */
PasteIt.prototype.copyMessage = function (message, sendResponse) {
  // Create a span for copy operation and add it to document
  var copyDiv = document.createElement('span')
  copyDiv.style.height = '1px'
  copyDiv.style.lineHeight = '1px'
  copyDiv.style.fontSize = '1px'
  copyDiv.contentEditable = true
  document.body.appendChild(copyDiv)
    // Set the message
  copyDiv.innerHTML = message
    // Select the span
  copyDiv.unselectable = 'off'
  copyDiv.focus()

  var response = {}
  try {
    document.execCommand('SelectAll')
    response.success = document.execCommand('Copy', false, null)
      // After copying, remove it
    document.body.removeChild(copyDiv)
    response.message = 'Message ' + (response.success ? 'copied' : 'not copied')
  } catch (e) {
    sendResponse({
      success: false,
      message: e
    })
  }
  sendResponse(response)
}

/* Load latest message and listen for future ones */
PasteIt.prototype.loadLatestMessage = function () {
  this.messagesRef = this.database.ref(this.messagePath + this.email)
  this.messagesRef.off()

  this.messagesRef.limitToLast(1).on('child_added', this.onMessageLoadedListener.bind(this))
}

/* Extract message from Firebase DataSnapShot and call copyMessage */
PasteIt.prototype.onMessageLoadedListener = function (data) {
  this.copyMessage(data.val().clip, function (response) {
    if (response.success) {
      console.log(response.message)
    } else {
      console.error(response.message)
    }
  })
}

PasteIt.prototype.signIn = function (sendResponse) {
  // var provider = new firebase.auth.GoogleAuthProvider();
  // this.auth.signInWithPopup(provider);
  this.auth.signInAnonymously().catch(function (error) {
    // Handle Errors here.
    console.error(error)
  })
  sendResponse({
    success: true,
    message: 'User signed in'
  })
}
