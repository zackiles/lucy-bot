'use-strict';

var path = require('path');
if (typeof process.env.NODE_ENV === 'undefined') process.env.NODE_ENV = 'development';

module.exports = {
  // Minutes to automatically shut down. You could let it run forever
  // and it should be fine, but setting it for an hour helps to conserve memory/cpu.
  // A value of more than 60 (an hour) is recommended if you set this to allow
  // time for followers to be added as they are not added instantly.
  autoShutdown: null,

  // You can find this info on your Twitter developer console under your application settings.
  auth: {
    consumer_key: '',
    consumer_secret: '',
    access_token_key: '',
    access_token_secret: ''
  },

  // If set true, then a bearer_token will be fetched to autheticate.
  // Application authentication has different API rate limits.
  isApplicationAuth: false,

  // Keywords used to pull tweets from the stream, which is used to follow and like.
  trackingKeywords: [
    'follow',
    'followback',
    'followme',
    'shoutouts'
  ],

  // Max amounts for a 24 hour period. Used to adjust the agressiveness.
  dailyLimits: {
    follows: 50,
    likes: 25
  },

  // Simple string matches ran against the Twitter objects (user/tweet).
  // Bot will ignore any tweets/users that don't match.
  // Arrays will try and make at least one match, and null or undefined will match all.
  userConstraints: {
    lang: ['en', 'en-gb'],
    location: null,
    protected: false,
    verified: null
  },
  tweetConstraints: {
    source: [
      // An example that only allows the standard clients, no API's or 3rd party apps.

      //'<a href="http://twitter.com" rel="nofollow">Twitter Web Client</a>',
      //'<a href="https://mobile.twitter.com" rel="nofollow">Mobile Web (M2)</a>',
      //'<a href="http://www.twitter.com" rel="nofollow">Twitter for Windows Phone</a>',
      //'<a href="http://www.twitter.com" rel="nofollow">Twitter for Windows</a>',
      //'<a href="http://twitter.com/download/iphone" rel="nofollow">Twitter for iPhone</a>',
      //'<a href="http://twitter.com/download/android" rel="nofollow">Twitter for Android</a>'
    ]
  },

  // Normally leave this. The directory where data is stored.
  dataDir: path.join(__dirname, '/data'),
  env: process.env.NODE_ENV
};
