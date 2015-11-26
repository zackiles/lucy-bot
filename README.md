Lucy Bot
=========

A smart Twitter bot that builds followers for Node.js. Uses only a filesystem database with lowdb to do all it's work. Can be used with multiple accounts/configurations. Has a configurable logic in order to set the aggressiveness to your liking. Uses a few tricks in order to hide the fact it's a bot.

## How To Use
- Git clone the repository and run npm install.
- Edit config.example.js with your preferred settings, then rename it to config.js.
- Set NODE_ENV to 'production' and Run index.js.

## Notes
- Depending on your settings it may need to run an average of an hour or more to make the most impact each day.
- You can leave it on 24/7 or you can run it as a daily cron script and set autoShutdown in the bot configuration to kill it after some time.
- No matter how long you run Lucy Bot, it will respect common Twitter API and secret limits.
- You can run it with NODE_ENV as 'development' (default) and it will simulate the bots functions and print it's results to console for testing. It will not add followers, tweet or make any other interactions in development.

#### Helpful Links
- [A Machine Learning Approach to Twitter User Classification](http://www.cs.wm.edu/~hnw/paper/tdsc12b.pdf)
- [Twitter Secret Limits](http://iag.me/socialmedia/guides/do-you-know-the-twitter-limits/)
- [A Python Bot](https://github.com/rhiever/TwitterFollowBot)
- [Twitter Automation Rules and Best Practices](https://support.twitter.com/articles/76915?lang=en)
