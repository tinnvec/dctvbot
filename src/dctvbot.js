import irc from 'irc';
import request from 'request';
import config from '../config/config';

// IRC Client
let client = new irc.Client(config.server.address, config.bot.nick, {
    userName: config.bot.userName,
    realName: config.bot.realName,
    port: config.server.port,
    debug: true,
    channels: config.server.channels
});

// Listen for messages
client.addListener('message', function(nick, to, text, message) {
    if (text.startsWith('!') || to === client.nick) {
        processCommand(text, nick, to);
    } else {
        console.log('not a command');
    }
});

/**
 * Processes incomming commands
 *
 * @param {string} text - message text
 * @param {string} nick - nick of the sender
 * @param {string} to - message recipient
 */
function processCommand(text, nick, to) {
    let cmd = text;

    let replyTo = to;
    if (to === client.nick) {
        replyTo = nick;
    } else {
        cmd = cmd.slice(1).trim();
    }

    switch (cmd) {
        case 'now':
            getDctvLiveChannels(function(channels) {
                let replyMsg = 'Nothing is live';
                if (channels.length > 0) {
                    replyMsg = '';
                    for (var i = 0; i < channels.length; i++) {
                        let ch = channels[i];
                        replyMsg += `\nChannel ${ch.channel}: ${ch.friendlyalias}`;
                    }
                }
                client.notice(replyTo, replyMsg);
            });
            break;
        case 'next':
            getGoogleCalendar(config.google.calendarId, function(events) {
                let replyMsg = `Next Scheduled Show: ${events[0].summary} - ${events[0].start.dateTime}`;
                client.notice(replyTo, replyMsg);
            });
            break;
        case 'schedule':
            getGoogleCalendar(config.google.calendarId, function(events) {
                let replyMsg = 'Scheduled Shows for the Next 48 hours:';
                for (let i = 0; i < events.length; i++) {
                    replyMsg += `\n${events[i].summary} - ${events[i].start.dateTime}`;
                }
                client.notice(replyTo, replyMsg);
            });
            break;
        default:
            console.log('default');
    }
}

/**
 * Responds to commands
 * @param {string} replyTo - message target
 * @param {string} replyMsg - message to send
 */
/**
 * Gets DCTV live channels
 * @param {dctvLiveChannels} callback - callback to run
 */
function getDctvLiveChannels(callback) {
    let channelsUrl = 'http://diamondclub.tv/api/channelsv2.php';
    getUrlContents(channelsUrl, function(response) {
        callback(JSON.parse(response).assignedchannels);
    });
}

/**
 * Gets contents of a URL
 * @param {string} url - url to getDate
 * @param {urlContents} callback - callback to run
 */
function getUrlContents(url, callback) {
    request(url, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            if (body === null) {
                console.error(`Error: ${response}`);
            } else {
                callback(body);
            }
        } else {
            console.error(`Error: ${error}`);
        }
    });
}

/**
 * Gets google calendar items
 * @param {string} id - google calendar id
 * @param {calendarEvents} callback - callback to run
 */
function getGoogleCalendar(id, callback) {
    let now = new Date();
    let later = new Date();
    later.setDate(later.getDate() + 2);

    let url = `https://www.googleapis.com/calendar/v3/calendars/${id}/events` +
        `?key=${config.google.apiKey}&singleEvents=true&orderBy=startTime` +
        `&timeMin=${now.toISOString()}&timeMax=${later.toISOString()}`;
    getUrlContents(url, function(response) {
        let result = JSON.parse(response);
        callback(result.items);
    });
}

// Additional documentation

/**
 * Callback for handling url response
 * @callback urlContents
 * @param {string} body
 */

/**
 * Callback for handling google calendar items result
 * @callback calendarEvents
 * @param {Object[]} entities
 */

/**
 * Callback for handling DCTV live channels
 * @callback dctvLiveChannels
 * @param {Object[]} channels
 */