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
        session.beginDialog('/google');
    }
]);

intents.onDefault([
    function (session, args, next) {
        console.log('dialog default');
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
        console.log('dialog profile');
        builder.Prompts.text(session, 'Hi! What is your name?');
    },
    function (session, results) {
        session.userData.name = results.response;
        session.endDialog();
    }
]);


bot.dialog('/google',[
    function (session, args, next) {
        console.log('dialog google');
        session.send('Je demande à Google !');
        
        fs.readFile('client_secret.json', function processClientSecrets(err, content) {
            if (err) {
                console.log('Error loading client secret file: ' + err);
                session.send('Sorry !! Error loading client secret file:  %s', err);
                return;
            }
            console.log('authorize');
            var credentials = JSON.parse(content);

            var clientSecret = credentials.installed.client_secret;
            var clientId = credentials.installed.client_id;
            var redirectUrl = credentials.installed.redirect_uris[0];
            var auth = new googleAuth();
            var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
            // Check if we have previously stored a token.
            console.log('fs.readFile : '+TOKEN_PATH);

            fs.readFile(TOKEN_PATH, function(err, token) {
                if (err) {
                    console.log('New token needed');
                    session.beginDialog('/getToken');
                } else {
                    console.log('Authorize ok');  
                    oauth2Client.credentials = JSON.parse(token);
                    session.userData.oauth2Client = oauth2Client;
                    console.log('Authorize ok - 2');  
                    next();
                }
            });
        });    
    },
    function (session, results) {
        listEvents(session.userData.oauth2Client, session);
    }
]);


bot.dialog('/getToken', [
    function (session) {
        console.log('getToken');  

        fs.readFile('client_secret.json', function processClientSecrets(err, content) {
            if (err) {
                console.log('Error loading client secret file: ' + err);
                session.send('Sorry !! Error loading client secret file:  %s', err);
                return;
            }
            console.log('authorize');
            var credentials = JSON.parse(content);
            var clientSecret = credentials.installed.client_secret;
            var clientId = credentials.installed.client_id;
            var redirectUrl = credentials.installed.redirect_uris[0];
            var auth = new googleAuth();
            var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
            var authUrl = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: SCOPES
            });
            session.send('Authorize this app by visiting this url: %s', authUrl);
            builder.Prompts.text(session, 'Enter the code from that page here: ');
        
        });


        
    },
    function (session, results) {
        session.userData.code = results.response;
        console.log('getToken Part 2');
        fs.readFile('client_secret.json', function processClientSecrets(err, content) {
            if (err) {
                console.log('Error loading client secret file: ' + err);
                session.send('Sorry !! Error loading client secret file:  %s', err);
                return;
            }
            console.log('authorize');
            var credentials = JSON.parse(content);
            var clientSecret = credentials.installed.client_secret;
            var clientId = credentials.installed.client_id;
            var redirectUrl = credentials.installed.redirect_uris[0];
            var auth = new googleAuth();
            var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
            oauth2Client.getToken(session.userData.code, function(err, token) {
                if (err) {
                    console.log('Error while trying to retrieve access token', err);
                    return;
                }
                oauth2Client.credentials = token;
                console.log('storeToken');
                session.userData.oauth2Client = oauth2Client;
                console.log('storeToken - 3');
                storeToken(token);
                console.log('storeToken - 2');
                
                session.endDialog();
            });
        
        });
       
    }    
]);


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
 * Lists the next 10 events on the user's primary calendar.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
*/

function listEvents(auth, session) {
  console.log('list Events start');
  var calendar = google.calendar('v3');
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
      console.log('Upcoming 5 events:');
      session.send('Upcoming 5 events:');
      for (var i = 0; i < events.length; i++) {
        var event = events[i];
        var start = event.start.dateTime || event.start.date;
        console.log('%s - %s', start, event.summary);
        session.send('%s - %s', start, event.summary);
      }
    }    
  });
}