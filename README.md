Lucy Bot
=========

A smart Twitter bot that builds followers for Node.js. Uses only a filesystem database with lowdb to do all it's work. Can be used with multiple accounts/configurations. Has a configurable logic in order to set the aggressiveness to your liking. Uses a few tricks in order to hide the fact it's a bot.

## How To Use
- Git clone the repository and run npm install.
- Edit config.example.js with your preferred settings, then rename it to config.js.
- Set NODE_ENV to 'production' and Run index.js. You can leave it on 24/7 or you can run it as a cron script and kill it after a few hours everyday. It will respect common Twitter API and secret limits.

You can run it with NODE_ENV as 'development' (default) and it will simulate the bots functions and print it's results to console for testing.

#### Helpful Links
- [A Machine Learning Approach to Twitter User Classification](http://www.cs.wm.edu/~hnw/paper/tdsc12b.pdf)
- [Twitter Secret Limits](http://iag.me/socialmedia/guides/do-you-know-the-twitter-limits/)
- [A Python Bot](https://github.com/rhiever/TwitterFollowBot)
- [Twitter Automation Rules and Best Practices](https://support.twitter.com/articles/76915?lang=en)
