"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("util");
const logger_1 = require("./logger");
const config_1 = require("./config");
const client_1 = require("./client");
const tadodata_1 = require("./tadodata");
class MessageProcessor {
    constructor() {
        this.tadoData = new tadodata_1.TadoData();
    }
    loadTadoData(callback) {
        const clientClass = client_1.Client.sharedInstance;
        const self = clientClass.getMessageProcessor();
        logger_1.logger.info("Requesting Tado data...");
        clientClass.getJaysonClient().request('getMe', { token: clientClass.getToken(), network: 'Tado', options: {} }, function (err, response) {
            logger_1.logger.debug(util.inspect(response, false, null, true));
            if (err) {
                callback(err);
                return;
            }
            self.tadoData.setTadoMeData(response.result.homes);
            for (let tadoHomeIndex in self.tadoData.me.homes) {
                clientClass.getJaysonClient().request('receiveMessage', { token: clientClass.getToken(), network: 'Tado',
                    options: { api_method: 'getZones', home_id: self.tadoData.me.homes[tadoHomeIndex].id } }, function (err, response) {
                    logger_1.logger.info(util.inspect(response, false, null, true));
                    self.tadoData.me.homes[tadoHomeIndex].setZonesData(response.result);
                    callback(null, true);
                });
            }
        });
    }
    processMessage(message) {
        console.log(util.inspect(message, false, null, true));
        if (this.isAValidCommand(message)) {
            if (!this.isAuthorizedUser(message.from.username) && this.isAPrivateCommand(message)) {
                this.sendAuthDenegationMessage(message);
                return;
            }
            this.doCommand(message);
        }
        else {
            this.sendNoCommandMessage(message);
        }
    }
    isAuthorizedUser(username) {
        return config_1.config.authorizedUsernames.includes(username);
    }
    isAValidCommand(message) {
        logger_1.logger.info("Message text: " + message.text);
        let commands = message.text.split(" ");
        return (config_1.config.publicCommands.includes(commands[0]) || config_1.config.privateCommands.includes(commands[0]));
    }
    isAPrivateCommand(message) {
        logger_1.logger.info("Message text: " + message.text);
        let commands = message.text.split(" ");
        return (config_1.config.publicCommands.includes(commands[0]) || config_1.config.privateCommands.includes(commands[0]));
    }
    getMessageOptionsForResponse(message, text) {
        return {
            chat_id: message.chat.id,
            text: text
        };
    }
    doCommand(message) {
        const self = client_1.Client.sharedInstance.getMessageProcessor();
        let commandArgs = message.text.split(" ");
        switch (commandArgs[0]) {
            case "/start":
            case "/help":
                self.sendHelpCommandMessage(message);
                break;
            case "/getWeather":
                self.getWeatherCommand(message);
                break;
        }
    }
    sendAuthDenegationMessage(message) {
        const clientClass = client_1.Client.sharedInstance;
        const self = client_1.Client.sharedInstance.getMessageProcessor();
        logger_1.logger.info(message.from.username + " is not an authorized user.");
        let options = self.getMessageOptionsForResponse(message, "Not authorized. You can't use the commands of this bot.");
        clientClass.getJaysonClient().request('sendMessage', { token: clientClass.getToken(), network: 'Telegram', options: options }, function (err, response) {
            if (err) {
                logger_1.logger.error(err.message);
            }
            else {
                logger_1.logger.info("Auth denied message sent.");
            }
        });
    }
    sendNoCommandMessage(message) {
        const clientClass = client_1.Client.sharedInstance;
        const self = client_1.Client.sharedInstance.getMessageProcessor();
        logger_1.logger.info(message.from.username + " requested a no recognized command.");
        let options = self.getMessageOptionsForResponse(message, "No command found. Check configuration.");
        clientClass.getJaysonClient().request('sendMessage', { token: clientClass.getToken(), network: 'Telegram', options: options }, function (err, response) {
            if (err) {
                logger_1.logger.error(err.message);
            }
            else {
                logger_1.logger.info("No command message sent.");
            }
        });
    }
    sendHelpCommandMessage(message) {
        const clientClass = client_1.Client.sharedInstance;
        const self = client_1.Client.sharedInstance.getMessageProcessor();
        const genericHelp = `Welcome to Tadobot.
This bot can check the temperatures of your house and set them.
To see the public commands: /help public
The rest of them are private commands where the user must be on whitelist.
To see the private commands: /help private`;
        const publicMethodHelp = `Public commands: 
${config_1.config.publicCommands.join('\n')}`;
        let commandArgs = message.text.split(" ");
        let helpMessage = genericHelp;
        if (commandArgs.length > 1) {
            switch (commandArgs[1]) {
                case "public":
                    helpMessage = publicMethodHelp;
                    break;
                case "private":
                    helpMessage = publicMethodHelp;
                    break;
            }
        }
        logger_1.logger.info("Sending help command response...");
        let options = self.getMessageOptionsForResponse(message, helpMessage);
        clientClass.getJaysonClient().request('sendMessage', { token: clientClass.getToken(), network: 'Telegram', options: options }, function (err, response) {
            if (err) {
                logger_1.logger.error(err.message);
            }
            else {
                logger_1.logger.info("Help message sent.");
            }
        });
    }
    getWeatherCommand(message) {
        const clientClass = client_1.Client.sharedInstance;
        const self = client_1.Client.sharedInstance.getMessageProcessor();
        const genericHelp = `/getWeather <Name of home>
Your homes are: `;
        let commandArgs = message.text.split(" ");
        let helpMessage = genericHelp + self.getHomeNameList().join(", ");
        if (commandArgs.length > 1) {
        }
        logger_1.logger.info("Sending help command response...");
        let options = self.getMessageOptionsForResponse(message, helpMessage);
        clientClass.getJaysonClient().request('sendMessage', { token: clientClass.getToken(), network: 'Telegram', options: options }, function (err, response) {
            if (err) {
                logger_1.logger.error(err.message);
            }
            else {
                logger_1.logger.info("Help message sent.");
            }
        });
    }
    getHomeNameList() {
        const self = client_1.Client.sharedInstance.getMessageProcessor();
        return self.tadoData.me.homes.map(function (value, index, array) {
            return value.name;
        });
    }
}
exports.MessageProcessor = MessageProcessor;
