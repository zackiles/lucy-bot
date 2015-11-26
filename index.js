'use-strict';

var conf = require('./config'),
    pkg = require('./package.json'),
    logger = require('./lib/logger'),
    logic = require('./lib/logic'),
    TaskManager = require('./lib/task-manager'),
    Twitter = require('./lib/twitter-promised'),
    Promise = require('bluebird'),
    lowDB = require('lowdb'),
    fs = require('fs-extra-promise'),
    path = require('path'),
    _ = require('lodash'),
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

if(conf.autoShutdown){
  conf.autoShutdown = parseInt(conf.autoShutdown);
  if(!isNaN(conf.autoShutdown)){
    logger.info('Auto shutdown set to', conf.autoShutdown.toString(), 'minutes.');
    setTimeout(function(){
      stopBot();
    }, conf.autoShutdown * 60 * 1000);
  }
}

process.on('SIGINT', stopBot);

function loadUser(){
  return twitter.get('account/verify_credentials').then(function(results){
    var userDBPath = path.join(conf.dataDir, results.id_str + '.json');
    state.db = lowDB(userDBPath);
    state.user = results;
    logger.info('Lodaded database for user', results.screen_name);
    return Promise.resolve();
  });
}

function loadFollowers(){
  var results = [];
  var fetchPage = function(cursor){
    var opts = {
      user_id: state.user.id_str,
      stringify_ids: true,
      count: 5000
    };
    if(cursor) opts.cursor = cursor;
    return twitter.get('followers/ids', opts).then(function(data){
      results = results.concat(data.ids);
      if(data.next_cursor && data.next_cursor !== 0){
        return fetchPage(data.next_cursor_str);
      }else{
        results.forEach(function(v){
          if(!state.db('followers').find({id_str: v})){
            state.db('followers').push({id_str: v});
          }
        });
        logger.info('Loaded', results.length || 0, 'followers.');
        return Promise.resolve();
      }
    });
  };

  return fetchPage();
}

function authenticate(){
  return new Promise(function(resolve, reject){
    var loadState = function(){
      logger.info('Authenticated');
      var opts = _.assign({
        request_options: {
          headers: {
            'Accept': '*/*',
            'Connection': 'close',
            'User-Agent': 'lucy/' + pkg.version
          }
        }
      }, state.auth);
      twitter = new Twitter(opts);
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
        reject(err || new Error('Authentication failed.'));
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
.then(loadFollowers)
.then(startBot)
.then(function(){
  logger.info('Bot Started.');
})
.catch(logger.error);
