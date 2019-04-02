"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("util");
const logger_1 = require("./logger");
const config_1 = require("./config");
const client_1 = require("./client");
class MessageProcessor {
    processMessage(message) {
        console.log(util.inspect(message, false, null, true));
        if (this.isAValidCommand(message)) {
            if (!this.isAuthorizedUser(message.from.username) && this.isAPrivateCommand(message)) {
                this.sendAuthDenegationMessage(message);
                return;
            }
            this.doCommand(message);
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
    }
}
exports.MessageProcessor = MessageProcessor;
