var restify = require('restify');
var builder = require('botbuilder');
var FS = require("q-io/fs");
var HTTP = require('q-io/http');

var googleCalHandler = require( './googleCal/calfunction' );

var intents = new builder.IntentDialog();

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
        googleCalHandler.init(session);
        
        
    }
]);