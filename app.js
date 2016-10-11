var restify = require('restify');
var builder = require('botbuilder');
//var FS = require("q-io/fs");
//var HTTP = require('q-io/http');

var googleCalHandler = require( './googleCal/calfunction' );

var intents = new builder.IntentDialog();


//=========================================================
// Google Cal Api var
//=========================================================
var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/calendar-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';


//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

// Serve a static web page
server.get(/.*/, restify.serveStatic({
	'directory': '.',
	'default': 'index.html'
}));


//=========================================================
// Bots Dialogs
//=========================================================


bot.dialog('/', intents);

intents.matches(/^change profile/i, [
    function (session) {
        session.beginDialog('/profile');
    },
    function (session, results) {
        session.send('Ok... Changed your name to %s', session.userData.name);
    }
]);

intents.matches(/^cal/i, [
    function (session) {
        session.beginDialog('/google');
    }
]);

intents.matches(/^google/i, [
    function (session) {
        session.beginDialog('/googleUpdated');
    }
]);

intents.onDefault([
    function (session, args, next) {
        if (!session.userData.name) {
            session.beginDialog('/profile');
        } else {
            next();
        }
    },
    function (session, results) {
        session.send('Hello %s!', session.userData.name);
    }
]);

bot.dialog('/profile', [
    function (session) {
        builder.Prompts.text(session, 'Hi! What is your name?');
    },
    function (session, results) {
        session.userData.name = results.response;
        session.endDialog();
    }
]);

bot.dialog('/google', [
    function (session) {
        session.send('Laisse moi 5 secondes');
        session.send('Je demande à Google !');
        googleCalHandler.init(session, builder);      
    },
    function (session, results) {
        session.userData.name = results.response;
        session.endDialog();
    }
]);


bot.dialog('/', [
    function (session, args, next) {
        if (!session.userData.name) {
            session.beginDialog('/profile');
        } else {
            next();
        }
    },
    function (session, results) {
        session.send('Hello %s!', session.userData.name);
    }
]);

bot.dialog('/profile', [
    function (session) {
        builder.Prompts.text(session, 'Hi! What is your name?');
    },
    function (session, results) {
        session.userData.name = results.response;
        session.endDialog();
    }
]);

bot.dialog('/googleUpdated',[
    function (session) {
        //session.send('Laisse moi 5 secondes');
        session.send('Je demande à Google !');
        
        fs.readFile('client_secret.json', function processClientSecrets(err, content) {
        if (err) {
            console.log('Error loading client secret file: ' + err);
            session.send('Sorry !! Error loading client secret file:  %s', err);
            return;
        }
        console.log('Before authorize');
        //authorize(JSON.parse(content), session, builder, listEvents);

        console.log('authorize');
        var clientSecret = credentials.installed.client_secret;
        var clientId = credentials.installed.client_id;
        var redirectUrl = credentials.installed.redirect_uris[0];
        var auth = new googleAuth();
        var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
        // Check if we have previously stored a token.
        fs.readFile(TOKEN_PATH, function(err, token) {
            if (err) {
                console.log('New token needed');
                session.beginDialog('/getToken');
            } else {
                console.log('Authorize ok');  
                oauth2Client.credentials = JSON.parse(token);
                session.userData.oauth2Client = oauth2Client;
                next();
            }
        });


        });
        //googleCalHandler.initDialog(session, builder);      
    },
    function (session, results) {
        session.send('Sorry ');
        listEvents(session.userData.oauth2Client, session);
    }
]);


bot.dialog('/getToken', [
    function (session) {
        var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
        //getNewTokenPrompt(oauth2Client, session);
        var authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES
        });
        session.send('Authorize this app by visiting this url: %s', authUrl);
        builder.Prompts.text(session, 'Enter the code from that page here: ');
    },
    function (session, results) {
        session.userData.code = results.response;

        oauth2Client.getToken(session.userData.code, function(err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            session.userData.oauth2Client = oauth2Client;
        });
        session.endDialog();
    }    
]);



module.exports = {
  init : function(session, builder){
    // Load client secrets from a local file.
        fs.readFile('client_secret.json', function processClientSecrets(err, content) {
        if (err) {
            console.log('Error loading client secret file: ' + err);
            return;
        }
        // Authorize a client with the loaded credentials, then call the
        // Google Calendar API.
        console.log('Before authorize');
        authorize(JSON.parse(content), session, builder, listEvents);
        });
  }

};


 /**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, session, builder, callback) {
        var authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES
        });
        console.log('Authorize this app by visiting this url: ', authUrl);
        session.send('Authorize this app by visiting this url: %s', authUrl);
        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.question('Enter the code from that page here: ', function(code) {
            rl.close();
            oauth2Client.getToken(code, function(err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            callback(oauth2Client, session);
            });
        });
    }

    /**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
        try {
            fs.mkdirSync(TOKEN_DIR);
        } catch (err) {
            if (err.code != 'EEXIST') {
            throw err;
            }
        }
        fs.writeFile(TOKEN_PATH, JSON.stringify(token));
        console.log('Token stored to ' + TOKEN_PATH);
    }

  /**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
 function authorize(credentials, session, builder, callback) {
  console.log('authorize');
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      console.log('New token needed');
      getNewToken(oauth2Client, session, callback);
    } else {
      console.log('Authorize ok');  
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client, session);
    }
  });
}

/**
 * Lists the next 10 events on the user's primary calendar.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth, session) {
  console.log('list Events start');
  console.log('session : ');
  console.log(session);
  var calendar = google.calendar('v3');
  console.log('list Events suite');
  calendar.events.list({
    auth: auth,
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 5,
    singleEvents: true,
    orderBy: 'startTime'
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var events = response.items;
    if (events.length == 0) {
      console.log('No upcoming events found.');
    } else {
      console.log('Upcoming 10 events:');
      session.send('Upcoming 10 events:');
      for (var i = 0; i < events.length; i++) {
        var event = events[i];
        var start = event.start.dateTime || event.start.date;
        console.log('%s - %s', start, event.summary);
        session.send('%s - %s', start, event.summary);
      }
    }
    console.log('callback(events)');
    
  });
}