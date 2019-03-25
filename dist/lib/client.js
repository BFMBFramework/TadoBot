"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jayson = require("jayson");
const util = require("util");
const logger_1 = require("./logger");
const config_1 = require("./config");
const package_1 = require("./package");
const messages_1 = require("./messages");
class Client {
    constructor() {
        this.bfmbToken = "";
        this.messageHandler = new messages_1.MessageHandler();
    }
    static get sharedInstance() {
        return this._instance || (this._instance = new Client());
    }
    startClient() {
        this.welcomeMessage();
        this.createJaysonClient();
    }
    welcomeMessage() {
        logger_1.logger.info("TadoBot " + package_1.packageData.version);
    }
    createJaysonClient() {
        logger_1.logger.info("Starting Jayson client...");
        switch (config_1.config.connection.protocol) {
            case "tcp":
                this.jayson = jayson.client.tcp({
                    host: config_1.config.connection.host,
                    port: config_1.config.connection.port
                });
                break;
            case "http":
                this.jayson = jayson.client.http({
                    host: config_1.config.connection.host,
                    port: config_1.config.connection.port
                });
                break;
            default:
                logger_1.logger.error("Protocol " + config_1.config.connection.protocol + " not supported.");
                break;
        }
        this.connectToBFMB(this.connectionResponseBFMB);
        this.messageHandler.startLoop();
    }
    connectionResponseBFMB(err, response) {
        if (err) {
            logger_1.logger.error(err.message);
            logger_1.logger.debug("Error stack: \n" + util.inspect(err.stack, false, null, true));
            process.exit(1);
        }
        else if (response.result) {
            logger_1.logger.info("Response received, adding token...");
            logger_1.logger.debug("Response received: \n" + util.inspect(response, false, null, true));
            Client.sharedInstance.bfmbToken = response.result;
        }
        else {
            logger_1.logger.error("Error in response: \n" + util.inspect(response, false, null, true));
            process.exit(1);
        }
    }
    connectToBFMB(callback) {
        this.jayson.request('authenticate', { username: config_1.config.bfmbAuth.username, password: config_1.config.bfmbAuth.password }, function (err, response) {
            if (err) {
                callback(err);
            }
            else {
                callback(null, response);
            }
        });
    }
}
exports.Client = Client;
