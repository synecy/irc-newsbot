### IRC-Newsbot

IRC-Newsbot is a IRC bot for streaming realtime news from twitter.
In addition, it includes some basic must-have features such as YouTube and Twitter url resolving.

IRC-Newsbot uses twitter streaming API to live stream the content of your twitter timeline to the IRC channel of 
your choice. Just follow the twitter users you want to stream and unfollow the ones you dont.

Additional twitch.tv user status feature provides status updates when a live streamer you are following goes online.
To get twitch.tv updates, add twitchOauthKey to options and follow the twitch users you wish to receive updates for. Use !twitch channel command for listing all currently online twitch users.

YouTube API Key: https://developers.google.com/youtube/registering_an_application
Twitch oauth key: http://www.twitchapps.com/tmi/
Twitter API keys: https://dev.twitter.com/

https://www.npmjs.com/package/irc-newsbot

## Install
npm install irc-newsbot

## Usage

Simple example for setting up the bot and connecting to a channel.

```js
var newsbot = require('irc-newsbot');

// Set options for the bot.
// Leaving youtube, twitch or twitter key fields empty will simply disable those features of the bot.
// Highlights and Blacklists can also be left empty []
var options = {
  ircServer: 'irc.freenode.net',
  ircChannel: '#channel',
  ircNick: 'NewsBot',
  youtubeApiKey: 'abcdefghij_klmn_1234abcdefghij',
  twitchOauthKey: 'abc123456789',
  twitterConsumerKey: 'abc123456789',
  twitterConsumerSecret: 'abc123456789',
  twitterAccessTokenKey: 'abc123456789',
  twitterAccessTokenSecret: 'abc123456789',
  twitterWordBlacklist: ["hollywood", "celeb"], // Filter out tweets containing blacklisted words
  twitterUserHighlight: ["verge", "arstechnica"] // Highlight tweets from these users
}

newsbot(options);
```

