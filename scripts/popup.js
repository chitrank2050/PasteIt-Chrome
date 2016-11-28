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
'use strict';

// config variable from firebase console
var config = {
    apiKey: "AIzaSyDo8JPYxtypGEuNsXwkAEszoW5Sjr6z9Fs",
    authDomain: "pasteit-84c04.firebaseapp.com",
    databaseURL: "https://pasteit-84c04.firebaseio.com",
    storageBucket: "pasteit-84c04.appspot.com",
    messagingSenderId: "97814606005"
  };

var MAX_MSG_LIMIT = 12;

var ANONYMOUS = 'ANONYMOUS';
var CHROME = 'CHROME';
var PHONE = 'PHONE';
var chromeImgUrl = '/images/chip_browser.png';
var phoneImgUrl = '/images/chip_phone.png';
var placeHolderImgUrl = '/images/profile_placeholder.png';

// Initializes PasteIt.
function PasteIt() {
    this.checkSetup();

    // Shortcuts to DOM Elements.
    this.messageList = document.getElementById('messages');
    this.messageForm = document.getElementById('message-form');
    this.messageInput = document.getElementById('message');
    this.submitButton = document.getElementById('submit');
    this.submitImageButton = document.getElementById('submitImage');
    this.imageForm = document.getElementById('image-form');
    this.mediaCapture = document.getElementById('mediaCapture');
    this.userPic = document.getElementById('user-pic');
    this.userName = document.getElementById('user-name');
    this.signInButton = document.getElementById('sign-in');
    this.signOutButton = document.getElementById('sign-out');
    this.signInSnackbar = document.getElementById('must-signin-snackbar');

    // Saves message on form submit.
    this.messageForm.addEventListener('submit', this.saveMessage.bind(this));
    this.signOutButton.addEventListener('click', this.signOut.bind(this));
    this.signInButton.addEventListener('click', this.signIn.bind(this));

    // Toggle for the button.
    var buttonTogglingHandler = this.toggleButton.bind(this);
    this.messageInput.addEventListener('keyup', buttonTogglingHandler);
    this.messageInput.addEventListener('change', buttonTogglingHandler);

    this.initFirebase();
}

// Sets up shortcuts to Firebase features and initiate firebase auth.
PasteIt.prototype.initFirebase = function() {
    // Shortcuts for Firebase SDK features.
    this.auth = firebase.auth();
    this.database = firebase.database();
    // this.storage = firebase.storage();
    // Initiates Firebase auth and listen to auth state state change.
    this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
};

// Loads chat messages history and listens for upcoming ones.
PasteIt.prototype.loadMessages = function() {
    // Reference to the /messages/ database path.
    this.messagesRef = this.database.ref('messages');
    // Make sure we remove all previous listeners.
    this.messagesRef.off();

    // Loads the last 12 messages and listen for new ones.
    var setMessage = function(data) {
        var val = data.val();
        this.displayMessage(data.key, val.sender_device, val.clip, val.sender_email, val.timestamp);
    }.bind(this);
    this.messagesRef.limitToLast(MAX_MSG_LIMIT).on('child_added', setMessage);
    this.messagesRef.limitToLast(MAX_MSG_LIMIT).on('child_changed', setMessage);
};

// Saves a new message on the Firebase DB.
PasteIt.prototype.saveMessage = function(e) {
    e.preventDefault();
    // Check that the user entered a message and is signed in.
    if (this.messageInput.value && this.checkSignedInWithMessage()) {
        var currentUser = this.auth.currentUser;
        var timestamp = Date.now();
        // Add a new message entry to the Firebase Database.
        var message = {
            clip: this.messageInput.value,
            email: currentUser.email,
            sender_device: CHROME,
            timestamp: timestamp
                // photoUrl: currentUser.photoURL || '/images/profile_placeholder.png'
        };
        this.messagesRef.push(message).then(function() {
            // Clear message text field and SEND button state.
            PasteIt.resetMaterialTextfield(this.messageInput);
            this.toggleButton();
        }.bind(this)).catch(function(error) {
            console.error('Error writing new message to Firebase Database', error);
        });
    }
};

// Signs-in Friendly Chat.
PasteIt.prototype.signIn = function() {
    // Sign in Firebase with credential from the Google user.
    // TODO: Change auth mode to signInWithCredential()
    // https://firebase.googleblog.com/2016/08/how-to-use-firebase-in-chrome-extension.html
    // var provider = new firebase.auth.GoogleAuthProvider();
    // this.auth.signInWithPopup(provider);
    firebase.auth().signInAnonymously().catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        // ...
    });
};

// Signs-out of Friendly Chat.
PasteIt.prototype.signOut = function() {
    // Sign out of Firebase.
    this.auth.signOut();
};

// Triggers when the auth state change for instance when the user signs-in or signs-out.
PasteIt.prototype.onAuthStateChanged = function(user) {
    if (user) { // User is signed in!

        var profilePicUrl = placeHolderImgUrl;
        var userName = ANONYMOUS;

        // Get profile pic and user's name from the Firebase user object.
        if (!user.isAnonymous) {
            profilePicUrl = user.photoURL;
            userName = user.displayName;
        }

        // Set the user's profile pic and name.
        this.userPic.firstElementChild.src = profilePicUrl;
        this.userName.textContent = userName;

        // Show user's profile and sign-out button.
        this.userName.removeAttribute('hidden');
        this.userPic.removeAttribute('hidden');
        this.signOutButton.removeAttribute('hidden');

        // Hide sign-in button.
        this.signInButton.setAttribute('hidden', 'true');

        // We load currently existing chant messages.
        this.loadMessages();
    } else { // User is signed out!
        // Hide user's profile and sign-out button.
        this.userName.setAttribute('hidden', 'true');
        this.userPic.setAttribute('hidden', 'true');
        this.signOutButton.setAttribute('hidden', 'true');

        // Show sign-in button.
        this.signInButton.removeAttribute('hidden');
    }
};

// Returns true if user is signed-in. Otherwise false and displays a message.
PasteIt.prototype.checkSignedInWithMessage = function() {
    /* Check if user is signed-in Firebase. */
    if (this.auth.currentUser) {
        return true;
    }
    // Display a message to the user using a Toast.
    var data = {
        message: 'You must sign-in first',
        timeout: 2000
    };
    this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
    return false;
};

// Resets the given MaterialTextField.
PasteIt.resetMaterialTextfield = function(element) {
    element.value = '';
    element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
};

// Template for messages.
PasteIt.MESSAGE_TEMPLATE =
    '<div class="message-container">' +
    '<div class="spacing"><div class="pic"></div></div>' +
    '<div class="message"></div>' +
    '<div class="time"></div>' +
    '</div>';

// A loading image URL.
PasteIt.LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif';

// Displays a Message in the UI.
PasteIt.prototype.displayMessage = function(key, sender, text, email, timestamp) {
    var div = document.getElementById(key);
    // If an element for that message does not exists yet we create it.
    if (!div) {
        var container = document.createElement('div');
        container.innerHTML = PasteIt.MESSAGE_TEMPLATE;
        div = container.firstChild;
        div.setAttribute('id', key);
        this.messageList.appendChild(div);
    }

    var picUrl = null;
    if (sender === CHROME) {
        picUrl = chromeImgUrl;
    } else if (sender === PHONE) {
        picUrl = phoneImgUrl;
    } else {
        picUrl = this.auth.currentUser.photoURL;
    }
    div.querySelector('.pic').style.backgroundImage = 'url(' + picUrl + ')';

    div.querySelector('.time').textContent = jQuery.timeago(new Date(timestamp));

    var messageElement = div.querySelector('.message');
    if (text) { // If the message is text.
        messageElement.textContent = text;
        // Replace all line breaks by <br>.
        messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>');
    }

    setTimeout(function() {
        div.classList.add('visible')
    }, 1);
    this.messageList.scrollTop = this.messageList.scrollHeight;
    this.messageInput.focus();
};

// Enables or disables the submit button depending on the values of the input
// fields.
PasteIt.prototype.toggleButton = function() {
    if (this.messageInput.value) {
        this.submitButton.removeAttribute('disabled');
    } else {
        this.submitButton.setAttribute('disabled', 'true');
    }
};

// Checks that the Firebase SDK has been correctly setup and configured.
PasteIt.prototype.checkSetup = function() {
    if (!firebase || !(firebase.app instanceof Function) || !config) {
        window.alert('You have not configured and imported the Firebase SDK. ' +
            'Make sure you go through the codelab setup instructions.');
    } else if (config.storageBucket === '') {
        window.alert('Your Firebase Storage bucket has not been enabled. Sorry about that. This is ' +
            'actually a Firebase bug that occurs rarely. ' +
            'Please go and re-generate the Firebase initialisation snippet (step 4 of the codelab) ' +
            'and make sure the storageBucket attribute is not empty. ' +
            'You may also need to visit the Storage tab and paste the name of your bucket which is ' +
            'displayed there.');
    }
};

window.onload = function() {
    firebase.initializeApp(config);
    console.log(firebase);
    window.friendlyChat = new PasteIt();
};
