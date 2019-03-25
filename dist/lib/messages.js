"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./logger");
const config_1 = require("./config");
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
        logger_1.logger.debug("Executing reception loop.");
    }
}
exports.MessageHandler = MessageHandler;
