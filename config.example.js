'use-strict';

var path = require('path');
if (typeof process.env.NODE_ENV === 'undefined') process.env.NODE_ENV = 'development';

module.exports = {
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

  // Simple string matches ran against the Twitter user object.
  // Any property can be added for equals comparison. The bot wont follow if there isn't a match.
  // Bot wont follow if there isn't a match. Arrays will try and make at least one match.
  constraints: {
    lang: ['en'], //can be left null or empty for all.
    location: null,
    protected: false,
    verified: false
  },

  // Normally leave this. The directory where data is stored.
  dataDir: path.join(__dirname, '/data'),
  env: process.env.NODE_ENV
};