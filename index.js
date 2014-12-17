// Realtime News Bot

var irc = require('irc');
var request = require('request');
var Stream = require('user-stream');
var youtube = require('youtube-feeds');
var twitterclient = require("twitter-js-client");


module.exports = function(options) { 

	var twitterKeysSet = false;
	if ( (options.twitterConsumerKey.length > 0) && (options.twitterConsumerSecret.length > 0) ) {
		if ( (options.twitterAccessTokenKey.length > 0) && (options.twitterAccessTokenSecret.length > 0) ) {
			twitterKeysSet = true;
		}
	}

  var tweetBlacklistedWords = options.twitterWordBlacklist;
  var highlightedTwitterUsers = options.twitterUserHighlight;
  var twitchOauthKey = options.twitchOauthKey;
  var stream = new Stream({
      consumer_key: options.twitterConsumerKey,
      consumer_secret: options.twitterConsumerSecret,
      access_token_key: options.twitterAccessTokenKey,
      access_token_secret: options.twitterAccessTokenSecret
  });
	var twitterConfig = {
  	  "consumerKey": options.twitterConsumerKey,
			"consumerSecret": options.twitterConsumerSecret,
  	  "accessToken": options.twitterAccessTokenKey,
			"accessTokenSecret": options.twitterAccessTokenSecret
	}


 	var client = new irc.Client(options.ircServer, options.ircNick, {
 	   channels: [options.ircChannel],
 	   userName: options.ircNick,
 	   realName: options.ircNick,
	});
	console.log("> Application IRC connected.");


	// Check if twitter key is set and decide whether to enable to disable twitter feed.	
	if ( twitterKeysSet ) {
  	var connectTwitter = function() {
    	stream.stream();
  	}
		connectTwitter();
	} else {
		console.log("> Twitter keys are not properly set, skipping twitter streaming feed.");
	}


  var containsFilteredWord = function( strPost ) {
    for ( var i = 0; i < tweetBlacklistedWords.length; i++ ) {
      if ( (strPost.indexOf(tweetBlacklistedWords[i]) !== -1) || (strPost.indexOf(tweetBlacklistedWords[i][0].toUpperCase() + tweetBlacklistedWords[i].slice(1)) !== -1) ) {
        return true
      }
    }
    return false
  }


  var isHighlightedUser = function( screenName ) {
    for ( var i = 0; i < highlightedTwitterUsers.length; i++ ) {
      if ( highlightedTwitterUsers[i] == screenName ) {
        return true
      }
    }
    return false
  }


  stream.on('connected', function(json) {
    console.log("> Application twitter stream connected.");
  });


  stream.on('data', function(json) {
    if (json.text != undefined) {
      if ( !containsFilteredWord( json.text.toString().replace(/\r?\n|\r/g,"") ) ) {
        if ( isHighlightedUser( json.user.screen_name ) ) {
          console.log(json.user.name + ': ' + json.text);
          client.say(options.ircChannel, irc.colors.wrap('light_cyan', json.user.name) + ': ' + json.text.toString().replace(/\r?\n|\r/g,"") );
        } else {
          console.log(json.user.name + ': ' + json.text);
          client.say(options.ircChannel, json.user.name + ': ' + json.text.toString().replace(/\r?\n|\r/g,"") );
        }
      }
    }
  });


  stream.on('error', function(json) {
    console.log("> Twitter stream error: ");
    console.log(json);
  });


  stream.on('close', function(json) {
    console.log("> Twitter stream closed: ");
    console.log(json);
    console.log("> Reconnecting in 120 seconds..");
    stream.destroy();
    setTimeout(this.connectTwitter, 120000);
  });


  client.addListener('error', function(message) {
      console.log('> IRC Error: ', message);
  });


	// YouTube URL to Title resolver

  var sendYoutubeDataToIRC = function( err, data ) {
    if( err instanceof Error ) {
      console.log( err );
    } else {
      if ( data.title != undefined ) {
        client.say(options.ircChannel, "YouTube: " + data.title + " - Uploader: " + data.uploader + " - Views: " + data.viewCount);
      }
    }
  }


  var parseVideoID = function( url ) {
    var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    var match = url.match(regExp);
    if ( match && match[2].length == 11 ) {
      youtube.video( match[2] ).details( sendYoutubeDataToIRC );
    }
  }


  client.addListener('message'+options.ircChannel, function (from, message) {
    var messageParts = message.split(/[ ]+/);
    for ( i = 0; i < messageParts.length; i++ ) {
      parseVideoID( messageParts[i] );
    }
  });


	// Twitch user online status following

  var currentlyOnline = [];
  var isFirstExecution = true;

  var twitchCallback = function(error, response, body ) {
    if (!error && response.statusCode == 200) {
      var json = JSON.parse(body);
      var currentlyInJson = [];

      for ( var i = 0; i < json.streams.length; i++ ) {
        currentlyInJson.push(json.streams[i].channel.display_name);
        var index = currentlyOnline.indexOf(json.streams[i].channel.display_name);
        if ( index == -1 ) {
          currentlyOnline.push(json.streams[i].channel.display_name);
          if ( !isFirstExecution ) {
            console.log("[Twitch] User " + json.streams[i].channel.display_name + " started streaming " + json.streams[i].channel.game);
            client.say(options.ircChannel, irc.colors.wrap('light_cyan', '[Twitch]') + " User " + json.streams[i].channel.display_name + " started streaming " + json.streams[i].channel.game);
          }
        }
      }

      for ( var i = 0; i < currentlyOnline.length; i++ ) {
        var index = currentlyInJson.indexOf(currentlyOnline[i]);
        if ( index == -1 ) {
          console.log("[Twitch] User " + currentlyOnline[i] + " stopped streaming.");
          client.say(options.ircChannel, irc.colors.wrap('light_cyan', '[Twitch]') + " User " + currentlyOnline[i] + " stopped streaming.");
          currentlyOnline.splice(i, 1);
        }
      }
      isFirstExecution = false;
      if ( json.streams.length == 0 ) {
        currentlyInJson = [];
      }
    } else {
      console.log("[Twitch] Error! Failed to update.");
    }
  }


  var updateTwitchFollowed = function() {
    var options = {
      url: 'https://api.twitch.tv/kraken/streams/followed',
      headers: {
        'Accept': 'application/vnd.twitchtv.v2+json',
        'Authorization': 'OAuth ' + twitchOauthKey,
      }
    };
    request.get(options, twitchCallback);
  }

	
 	if ( twitchOauthKey.length > 0 ) {
   	console.log("> Application Twitch updates started.");
   	setInterval(updateTwitchFollowed, 240000);
 	} else {
		console.log("> Twitch oauth key not set, skipping twitch updates..");
	}


	// Tweet link to content resolver

	// Enable and distable Tweet resolving depending on whether twitter keys are properly set.
	if ( twitterKeysSet ) {
		var twitter = new twitterclient.Twitter(twitterConfig);
  } else {
    console.log("> Twitter keys are not properly set, skipping tweet url to content resolver.");
  }

	var twitterError = function(err, response, body) {
		console.log("> TwitterClient error: ");
    console.log(err);
	};


  var getTweetSuccess = function(data) {
    json = JSON.parse(data);
    if ( json.text != undefined && json.user.name != undefined ) {
      console.log("[Twitter] " + json.user.name + ": " + json.text);
      client.say(options.ircChannel, irc.colors.wrap('light_cyan', '[Twitter] ') + json.user.name + ": " + json.text);
    }
  }


  var parseTweetID = function(url) {
    var regExp = /(twitter.com\/([^\/]*)\/status\/(\d+))/;
    var match = url.match(regExp);
    if ( match && match[3].length > 10 ) {
			if ( twitter ) {
      	twitter.getTweet({ id: match[3]}, twitterError, getTweetSuccess);
			}
    }
  }


  client.addListener('message'+options.ircChannel, function (from, message) {
    var messageParts = message.split(/[ ]+/);
    for ( var i = 0; i < messageParts.length; i++ ) {
      parseTweetID( messageParts[i] );
    }
  });
	
}


