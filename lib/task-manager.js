'use-strict';

var conf = require('../config'),
    logic = require('./logic'),
    logger = require('./logger'),
    jitterTime = require('jitter-time'),
    RateLimiter = require('limiter').RateLimiter,
    nodeSchedule = require('node-schedule');

var limits = {
  follow: new RateLimiter(60, 'hour'),
  unfollow: new RateLimiter(30, 'hour'),
  like: new RateLimiter(20, 'hour')
};

var timers = {
  follow: {
    cron: '*/5 * * * *', //5 minutes
    jitter: 5 // 5 minutes
  }
};

// Set quick times for development.
if(conf.env === 'development'){
  timers.follow.cron =  '* * * * *';
  timers.follow.jitter = 1;
}

function TaskManager(twitter, state){
  this.twitter = twitter;
  this.state = state;
  this.cronTasks = [];
  this.jitterTasks = [];
}

TaskManager.prototype.start = function(){
  var self = this;
  // "ADD FOLLOWERS" TASK
  self.cronTasks.push(nodeSchedule.scheduleJob(timers.follow.cron, function(){

    // Get the next follow in the queue that is eligible to be followed.
    var nextFollow = self.state.db('shouldFollows').chain().sortBy('friends_count').reverse().find(function(v){
      return logic.canFollow(v, self.state);
    }).value();

    if(nextFollow){
      logger.info('Next follow:', nextFollow);
      self.state.db('shouldFollows').remove({id_str: nextFollow.id_str});
      // We use a random interval anywhere within 5 minutes to add a user.
      // This helps simulate a real user and not a bot.
      logger.info('Running follow task for user', nextFollow.screen_name);
      var interval = jitterTime(timers.follow.jitter, 0.5);
      self.jitterTasks.push(setTimeout(self.followUser.bind(self, nextFollow), interval));
    }
  }));

  logger.info('Task manager started.');
};

TaskManager.prototype.stop = function(){
  this.cronTasks.forEach(function(v){v.cancel();});
  this.jitterTasks.forEach(function(v){clearTimeout(v);});
  this.cronTasks = [];
  this.jitterTasks = [];
  logger.info('Task manager stopped.');
};

TaskManager.prototype.followUser = function(user){
  var self = this;

  var finished = function(){
    logger.info('Follow task complete for user', user.screen_name);
    user.followedOn = new Date().toISOString();
    self.state.db('followedUsers').push(user);
  };

  // Check and hold function until Twitter rate limit is OK.
  limits.follow.removeTokens(1, function() {
    // Just simulate a follow in dev mode.
    if(conf.env === 'development') return finished();

    self.twitter.post('friendships/create', {user_id: user.id_str})
    .then(finished).catch(logger.error);
  });
};

module.exports = TaskManager;
