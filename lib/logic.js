'use-strict';

var conf = require('../config'),
    logger = require('./logger'),
    _ = require('lodash'),
    percent = require('percent'),
    moment = require('moment');

function shouldHandleTweet(tweet, state){
  var meetsConstraints = true;
  _.forOwn(conf.tweetConstraints, function(values, constraint){
    if(values && (constraint || constraint===false)){
      // If empty array skip.
      if(_.isArray(constraint) && !constraint.length) return true;
      // Get all the possible matches and check the tweet object to see if it exists.
      values = _.isArray(values) ? values : [values];
      if(tweet[constraint]){
        meetsConstraints = _.includes(values, tweet[constraint]) ? true : false;
        if(!meetsConstraints){
          logger.error('Rejected handlingtweet', tweet.id_str, 'Tweet does not meet constraint', constraint, 'value', tweet[constraint]);
          return false;
        }
      }
    }
  });
  if(!meetsConstraints) return false;

  return true;
}

function canFollow(user, state){
  if((state.user.friends_count > 2000) &&(state.user.followers_count < 1819)){
    logger.error('Rejected following user', user.screen_name, 'Reached Twitter total following limit of 2000. Need more followers first.');
    return false;
  }

  if(user.following === true){
    logger.info('Rejected following user', user.screen_name, 'Already following this user.');
    return false;
  }

  // Generally won't want to re-add a person after it's failed to gain a follow-back before.
  // The bot tracks people it's unfollowed.
  var removedFollowers = state.db('unfollowedUsers').cloneDeep();
  if(_.where(removedFollowers, {id_str: user.id_str}).length > 0) {
    logger.info('Rejected following user', user.screen_name, 'Already have followed (and removed) this user.');
    return false;
  }

  // Make sure we haven't gone over Twitters daily follow limits.
  var dayAgo = moment().subtract(24, 'hours');
  var followedUsers = state.db('followedUsers').cloneDeep();

  var lastDayFollows = _.filter(followedUsers.concat(removedFollowers), function(v){
    return moment(new Date(v.followedOn || v.removedOn)).isAfter(dayAgo);
  });

  if(lastDayFollows.length > conf.dailyLimits.follows) {
    logger.error('Rejected following user', user.screen_name, 'Reached Twitter daily limit for following of', conf.dailyLimits.follows);
    return false;
  }

  return true;
}

function shouldFollow(user, state){
  var followingPercent = percent.calc(user.friends_count, user.followers_count, 0, false);
  // Make sure they are a person that follows a decent amount of people as follows them.
  // We make a small exception for users following less than 50 people, as they likely
  // are new, but have a high percent chance of following back imo.
  if((percent.gt(70, followingPercent)) && (user.friends_count > 50)) return false;

  if(user.friends_count <= 20){
    // Best not to handle anyone this inactive.
    logger.error('Rejected following user', user.screen_name, 'User is following less than 20 people.');
    return false;
  }

  // Make sure they've been active in the last week.
  if(user.status){
    var monthAgo = moment().subtract(1, 'weeks');
    if(moment(new Date(user.status.created_at)).isBefore(monthAgo)) return false;
  }

  var meetsConstraints = true;
  _.forOwn(conf.userConstraints, function(values, constraint){
    if(values && (constraint || constraint===false)){
      // If empty array skip.
      if(_.isArray(constraint) && !constraint.length) return true;
      // Get all the possible matches and check the user object to see if it exists.
      values = _.isArray(values) ? values : [values];
      if(user[constraint]){
        meetsConstraints = _.includes(values, user[constraint]) ? true : false;
        if(!meetsConstraints){
          logger.error('Rejected following user', user.screen_name, 'User does not meet constraint', constraint, 'value', user[constraint]);
          return false;
        }
      }
    }
  });
  if(!meetsConstraints) return false;

  return true;
}

module.exports = {
  shouldHandleTweet: shouldHandleTweet,
  canFollow: canFollow,
  shouldFollow: shouldFollow
};
