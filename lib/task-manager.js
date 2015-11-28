'use-strict';

var conf = require('../config'),
    logic = require('./logic'),
    logger = require('./logger'),
    moment = require('moment'),
    _ = require('lodash'),
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
    cron: '*/5 * * * *', // 5 minutes
    jitter: 3 // 5 minutes
  },
  unfollow: {
    cron: '*/3 * * * *', // 3 minutes
    jitter: 2 // 3 minutes
  }
};

var QUEUED_ITEMS = [];

// Set quick times for development.
if(conf.env === 'development'){
  timers.follow.cron =  '* * * * *';
  timers.follow.jitter = 0;
  timers.unfollow.cron =  '* * * * *';
  timers.unfollow.jitter = 0;
}

function TaskManager(twitter, state){
  this.twitter = twitter;
  this.state = state;
  this.cronTasks = [];
  this.jitterTasks = [];
}

TaskManager.prototype.start = function(){
  var self = this;

  // "FOLLOW" TASK
  self.cronTasks.push(nodeSchedule.scheduleJob(timers.follow.cron, function(){

    // Get the next follow in the queue that is eligible to be followed.
    var nextFollow = self.state.db('shouldFollows').chain().sortBy('friends_count').reverse().find(function(v){
      if(_.includes(QUEUED_ITEMS, v.id_str)) return false;
      return logic.canFollow(v, self.state);
    }).value();

    if(nextFollow){
      self.state.db('shouldFollows').remove({id_str: nextFollow.id_str});
      // We use a random interval anywhere within 5 minutes to add a user.
      // This helps simulate a real user and not a bot.
      logger.info('Running follow task for user', nextFollow.screen_name);
      var interval = jitterTime(timers.follow.jitter, 0.5);
      self.jitterTasks.push(setTimeout(self.followUser.bind(self, nextFollow), interval));
      QUEUED_ITEMS.push(nextFollow.id_str);
    }
  }));

  // "UNFOLLOW" TASK
  self.cronTasks.push(nodeSchedule.scheduleJob(timers.unfollow.cron, function(){
    var cutoffDate = moment().subtract(24, 'hours');
    // Finds users that we've followed but haven't followed back and removes them.
    var noFollowBacks = self.state.db('followedUsers').chain().filter(function(v){
      if(moment(new Date(v.followedOn)).isBefore(cutoffDate)){
        var doesFollow = self.state.db('followers').find({id_str: v.id_str});
        return doesFollow ? false : !_.includes(QUEUED_ITEMS, v.id_str);
      }else{
        return false;
      }
    }).sortBy('followedOn').value();

    var nextUnfollow = noFollowBacks.length ? noFollowBacks[0] : null;
    if(nextUnfollow){
      logger.info('Running un-follow task for user', nextUnfollow.screen_name);
      var interval = jitterTime(timers.unfollow.jitter, 0.5);
      self.jitterTasks.push(setTimeout(self.unfollowUser.bind(self, nextUnfollow), interval));
      QUEUED_ITEMS.push(nextUnfollow.id_str);
    }
  }));

  // "FOLLOW BACK" TASK
  self.cronTasks.push(nodeSchedule.scheduleJob(timers.follow.cron, function(){

    // Get the next user that has followed us that we haven't followed back yet.
    // This skips the logic.canFollow method - all users are followed back.
    var newFollowers = self.state.db('followers').chain().filter(function(v){
      var doesFollow = self.state.db('followedUsers').find({id_str: v.id_str});
      return doesFollow ? false : !_.includes(QUEUED_ITEMS, v.id_str);
    }).value();

    var nextFollow = newFollowers.length ? newFollowers[0] : null;
    if(nextFollow){
      logger.info('Running follow-back task for user id', nextFollow.id_str);
      var interval = jitterTime(timers.follow.jitter, 0.5);
      self.jitterTasks.push(setTimeout(self.followUser.bind(self, nextFollow), interval));
      QUEUED_ITEMS.push(nextFollow.id_str);
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
    self.state.db('shouldFollows').remove({id_str: user.id_str});
    _.remove(QUEUED_ITEMS, user.id_str);
  };

  // Check and hold function until Twitter rate limit is OK.
  limits.follow.removeTokens(1, function() {
    // Just simulate a follow in dev mode.
    if(conf.env === 'development') return finished();

    self.twitter.post('friendships/create', {user_id: user.id_str})
    .then(finished).catch(logger.error);
  });
};

TaskManager.prototype.unfollowUser = function(user){
  var self = this;

  var finished = function(){
    logger.info('Unfollow task complete for user', user.screen_name);
    user.unfollowedOn = new Date().toISOString();
    self.state.db('unfollowedUsers').push(user);
    self.state.db('shouldFollows').remove({id_str: user.id_str});
    self.state.db('followedUsers').remove({id_str: user.id_str});
    _.remove(QUEUED_ITEMS, user.id_str);
  };

  // Check and hold function until Twitter rate limit is OK.
  limits.unfollow.removeTokens(1, function() {
    // Just simulate a follow in dev mode.
    if(conf.env === 'development') return finished();

    self.twitter.post('friendships/destroy', {user_id: user.id_str})
    .then(finished).catch(logger.error);
  });
};

module.exports = TaskManager;
