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
                    logger_1.logger.debug(util.inspect(response, false, null, true));
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
        logger_1.logger.debug("Message text: " + message.text);
        let commands = message.text.split(" ");
        return (config_1.config.publicCommands.includes(commands[0]) || config_1.config.privateCommands.includes(commands[0]));
    }
    isAPrivateCommand(message) {
        logger_1.logger.debug("Message text: " + message.text);
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
            case "/getZoneState":
                self.getZoneStateCommand(message);
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
        const privateMethodHelp = `Private commands:
${config_1.config.privateCommands.join('\n')}`;
        let commandArgs = message.text.split(" ");
        let helpMessage = genericHelp;
        if (commandArgs.length > 1) {
            switch (commandArgs[1]) {
                case "public":
                    helpMessage = publicMethodHelp;
                    break;
                case "private":
                    helpMessage = privateMethodHelp;
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
            commandArgs.shift();
            let homeName = commandArgs.join(" ");
            let homeId = self.getHomeIdBy(homeName);
            clientClass.getJaysonClient().request('receiveMessage', { token: clientClass.getToken(), network: 'Tado', options: { api_method: 'getWeather', home_id: homeId } }, function (err, response) {
                let weatherString = `Weather around of ${homeName}: 
${response.result.weatherState.value}, ${response.result.outsideTemperature.celsius} ºC, ${response.result.outsideTemperature.fahrenheit} ºF.`;
                let options = self.getMessageOptionsForResponse(message, weatherString);
                clientClass.getJaysonClient().request('sendMessage', { token: clientClass.getToken(), network: 'Telegram', options: options }, function (err, response) {
                    if (err) {
                        logger_1.logger.error(err.message);
                    }
                    else {
                        logger_1.logger.info("Weather result sent.");
                    }
                });
            });
            return;
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
    getZoneStateCommand(message) {
        const clientClass = client_1.Client.sharedInstance;
        const self = client_1.Client.sharedInstance.getMessageProcessor();
        let helpMessage = `/getZoneState <Name of home>-<Name of zone>
Your homes are: ${self.getHomeNameList().join(", ")}`;
        let commandArgs = message.text.split(" ");
        if (commandArgs.length > 1) {
            commandArgs.shift();
            let homeZone = commandArgs.join(" ");
            let homeZoneArray = homeZone.split("-");
            if (homeZoneArray.length > 1) {
                let homeId = self.getHomeIdBy(homeZoneArray[0]);
                let zoneId = self.getZoneIdBy(homeId, homeZoneArray[1]);
                clientClass.getJaysonClient().request('receiveMessage', { token: clientClass.getToken(), network: 'Tado', options: { api_method: 'getZoneState', home_id: homeId, zone_id: zoneId } }, function (err, response) {
                    let weatherString = `State in ${homeZone}:
Heating: ${response.result.setting.power}. Target temperature: ${response.result.setting.temperature.celsius} ºC / ${response.result.setting.temperature.fahrenheit} ºF
Actual temperature: ${response.result.sensorDataPoints.insideTemperature.celsius} ºC / ${response.result.sensorDataPoints.insideTemperature.fahrenheit} ºF
Humidity: ${response.result.sensorDataPoints.humidity.percentage} %`;
                    let options = self.getMessageOptionsForResponse(message, weatherString);
                    clientClass.getJaysonClient().request('sendMessage', { token: clientClass.getToken(), network: 'Telegram', options: options }, function (err, response) {
                        if (err) {
                            logger_1.logger.error(err.message);
                        }
                        else {
                            logger_1.logger.info("Zone state result sent.");
                        }
                    });
                });
                return;
            }
            helpMessage += `\nYour zones for ${homeZoneArray[0]} are: ${self.getZoneNameListBy(homeZoneArray[0]).join(", ")}`;
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
    getHomeIdBy(name) {
        const self = client_1.Client.sharedInstance.getMessageProcessor();
        let home = self.tadoData.me.homes.find(i => i.name == name);
        return home.id;
    }
    getZoneIdBy(homeId, name) {
        const self = client_1.Client.sharedInstance.getMessageProcessor();
        let home = self.tadoData.me.homes.find(i => i.id == homeId);
        let zone = home.zones.find(i => i.name == name);
        return zone.id;
    }
    getZoneNameListBy(homeName) {
        const self = client_1.Client.sharedInstance.getMessageProcessor();
        let home = self.tadoData.me.homes.find(i => i.name == homeName);
        return home.zones.map(function (value, index, array) {
            return value.name;
        });
    }
}
exports.MessageProcessor = MessageProcessor;
