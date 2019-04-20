"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./logger");
const config_1 = require("./config");
const client_1 = require("./client");
class MessageHandler {
    startLoop() {
        if (config_1.config.requestPolling) {
            setInterval(this.receptionLoop, config_1.config.requestPolling);
        }
        else {
            throw new Error("Polling not defined in configuration.");
        }
    }
    receptionLoop() {
        const clientClass = client_1.Client.sharedInstance;
        const self = client_1.Client.sharedInstance.getMessageHandler();
        logger_1.logger.debug("Executing reception loop.");
        clientClass.getJaysonClient().request('receiveMessage', { token: clientClass.getToken(), network: 'Telegram', options: {} }, function (err, response) {
            self.receptionResponse(err, response);
        });
    }
    receptionResponse(err, response) {
        const messageProcessor = client_1.Client.sharedInstance.getMessageProcessor();
        logger_1.logger.debug("Received response.");
        if (err) {
            logger_1.logger.error(err.message);
            return;
        }
        if (response.result.length == 0) {
            logger_1.logger.debug("No results in response.");
            return;
        }
        let messages = response.result;
        for (let message of messages) {
            if (message.message) {
                messageProcessor.processMessage(message.message);
            }
        }
    }
}
exports.MessageHandler = MessageHandler;
