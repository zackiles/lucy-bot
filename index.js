'use-strict';

var conf = require('./config'),
    logger = require('./lib/logger'),
    logic = require('./lib/logic'),
    TaskManager = require('./lib/task-manager'),
    Twitter = require('./lib/twitter-promised'),
    Promise = require('bluebird'),
    lowDB = require('lowdb'),
    fs = require('fs-extra-promise'),
    path = require('path'),
    OAuth2 = require('oauth').OAuth2;

var twitter = null;
var taskManager = null;

var state = {
  auth: {
    consumer_key: conf.auth.consumer_key,
    consumer_secret: conf.auth.consumer_secret,
    access_token_key: conf.auth.access_token_key,
    access_token_secret: conf.auth.access_token_secret
  },
  stream: null,
  user: null,
  db: null
};

function loadUser(){
  return twitter.get('account/verify_credentials').then(function(results){
    var userDBPath = path.join(conf.dataDir, results.id_str + '.json');
    state.db = lowDB(userDBPath);
    state.user = results;
    logger.info('Lodaded database for user', results.screen_name);
    return Promise.resolve();
  });
}

function authenticate(){
  return new Promise(function(resolve, reject){

    var loadState = function(){
      logger.info('Authenticated');
      twitter = new Twitter(state.auth);
      loadUser().then(resolve).catch(reject);
    };

    // If it's only user auth, we don't need a bearer token and can skip the next part.
    if(!conf.isApplicationAuth) return loadState();

    // Get a bearer token to be used for application auth.
    var oauth2 = new OAuth2(state.auth.consumer_key, state.auth.consumer_secret, 'https://api.twitter.com/', null, 'oauth2/token', null);
    oauth2.getOAuthAccessToken('', {'grant_type': 'client_credentials'}, function (err, token) {
      if(token){
        state.auth.bearer_token = token;
        return loadState();
      }else{
        reject(err || new Error('Twitter: Authentication failed.'));
      }
    });
  });
}

function handleTweetStream(tweet){

  if(!tweet || !tweet.id_str){
    // Seems to be a rare case, but it happens, probably something wrong with npm twitter.
    return logger.error('Malformed tweet received, value', tweet);
  }

  if(logic.shouldHandleTweet(tweet)){
    return;
  }else{
    logger.info('Handling tweet', tweet.id_str);
  }

  if(logic.shouldFollow(tweet.user, state)){

    if(state.db('shouldFollows').size() >= 150){
      // Max number of should follows in the database, keeps it small.
      // We'll splice off 100 users that are following the most people.
      var shouldFollows = state.db('shouldFollows').chain().sortBy('friends_count').reverse().take(100).value();
      state.db.object.shouldFollows = shouldFollows;
      state.db.save();
    }

    // Make sure this user isn't already in the queue.
    var doesExist = state.db('shouldFollows').find({id_str: tweet.user.id_str});
    if(doesExist) return;

    tweet.user.addedOn = new Date().toISOString();
    state.db('shouldFollows').push(tweet.user);

    logger.info('Added follow task to queue for user', tweet.user.screen_name);
    logger.info('Follows queued', state.db('shouldFollows').size());
  }
}

function startBot(){
  // Setup a schedule based task manager.
  taskManager = new TaskManager(twitter, state);
  taskManager.start();

  return twitter.stream('statuses/filter', {track: conf.trackingKeywords.join(',')}).then(function(stream){
    logger.info('Opened stream. Tracking', conf.trackingKeywords);
    state.stream = stream;
    state.stream.on('data', handleTweetStream);
    state.stream.on('error', logger.error);
  });
}

function stopBot(){
  if(state.stream){
    delete state.stream;
  }
  if(taskManager){
    taskManager.stop();
  }
  logger.info('Shutting down.');
  process.exit(0);
}

fs.ensureDirAsync(conf.dataDir)
.then(authenticate)
.then(startBot)
.then(function(){
  logger.info('Bot Started.');
})
.catch(logger.error);

if(conf.autoShutdown){
  conf.autoShutdown = parseInt(conf.autoShutdown);
  if(!isNaN(conf.autoShutdown)){
    logger.info('Auto shutdown set to', conf.autoShutdown.toString(), 'minutes.');
    setTimeout(function(){
      stopBot();
    }, conf.autoShutdown * 60 * 1000);
  }
}

process.on('SIGINT', stopBot)
