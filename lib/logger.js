'use-strict';

var pkg = require('../package.json');
var winston = require('winston');

module.exports = {
  info: function(){
    var newarr = [].slice.call(arguments);
    winston.info.apply(winston, [pkg.name + ':'].concat(newarr));
  },
  error: function(){
    var newarr = [].slice.call(arguments);
    winston.error.apply(winston, [pkg.name + ':'].concat(newarr));
  }
}
