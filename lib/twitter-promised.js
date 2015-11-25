'use-strict';

var twitterError = require('./twitter-error'),
    twit = require('twitter'),
    Promise = require('bluebird'),
    PromiseThrottle = require('promise-throttle');

var throttleOptions = {
  requestsPerSecond: 0.2,
  promiseImplementation: Promise
};

var throttle = new PromiseThrottle(throttleOptions);


function Twitter(options) {
  this.client = new twit(options);
}

var promisedGet = function(url, params) {
  var self = this;
  return new Promise(function(resolve, reject) {
    params = params || {};
    self.client.get(url, params, function(error, data, response) {
      if (error) {
        return reject(twitterError.process.call(self, error));
      } else {
        return resolve(data, response);
      }
    });
  });
};

Twitter.prototype.get = function(url, params) {
  return throttle.add(promisedGet.bind(this, url, params));
};

Twitter.prototype.post = function(url, params) {
  var self = this;
  return new Promise(function(resolve, reject) {
    params = params || {};
    self.client.post(url, params, function(error, data, response) {
      if (error) {
        return reject(error);
      } else {
        return resolve(data, response);
      }
    });
  });
};

Twitter.prototype.stream = function(url, params) {
  var self = this;
  return new Promise(function(resolve, reject) {
    params = params || {};
    self.client.stream(url, params, function(stream) {
      resolve(stream);
    });
  });
};

module.exports = Twitter;
