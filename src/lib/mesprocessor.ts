import * as util from "util";
import * as async from "async";

import {logger} from "./logger";
import {config} from "./config";

import {Client} from "./client";
import {TadoData, TadoHome, TadoZone} from "./tadodata";

export class MessageProcessor {
	private tadoData: TadoData;

	constructor() {
		this.tadoData = new TadoData();
	}

	loadTadoData(callback: Function): void {
		const clientClass = Client.sharedInstance;
		const self = clientClass.getMessageProcessor();
		logger.info("Requesting Tado data...");
		clientClass.getJaysonClient().request('getMe', {token: clientClass.getToken(), network: 'Tado', options: {}}, function(err: Error, response: any) {
			logger.debug(util.inspect(response, false, null, true));
			if (err) {
				callback(err);
				return
			}
			self.tadoData.setTadoMeData(response.result.homes);
			for (let tadoHomeIndex in self.tadoData.me.homes) {
				clientClass.getJaysonClient().request('receiveMessage', {token: clientClass.getToken(), network: 'Tado',
				 options: {api_method: 'getZones', home_id: self.tadoData.me.homes[tadoHomeIndex].id}}, function(err: Error, response: any) {
						logger.debug(util.inspect(response, false, null, true));
						self.tadoData.me.homes[tadoHomeIndex].setZonesData(response.result);
						callback(null, true);
				});
			}
		});
	}

	processMessage(message: any): void {
		console.log(util.inspect(message, false, null, true));
		if (this.isAValidCommand(message)) {
			if (!this.isAuthorizedUser(message.from.username) && this.isAPrivateCommand(message)) {
				this.sendAuthDenegationMessage(message);
				return
			}
			this.doCommand(message);
		} else {
			this.sendNoCommandMessage(message);
		}
	}

	private isAuthorizedUser(username: string): boolean {
		return config.authorizedUsernames.includes(username);
	}

	private isAValidCommand(message: any): boolean {
		logger.debug("Message text: " + message.text);
		let commands: [string] = message.text.split(" ");
		return (config.publicCommands.includes(commands[0]) || config.privateCommands.includes(commands[0]));
	}

	private isAPrivateCommand(message: any): boolean {
		logger.debug("Message text: " + message.text);
		let commands: [string] = message.text.split(" ");
		return (config.publicCommands.includes(commands[0]) || config.privateCommands.includes(commands[0]));
	}

	private getMessageOptionsForResponse(message: any, text: string): any {
		return {
			chat_id: message.chat.id,
			text: text
		}
	}

	private doCommand(message: any): void {
		const self = Client.sharedInstance.getMessageProcessor();
		let commandArgs: [string] = message.text.split(" ");
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

	private sendAuthDenegationMessage(message: any): void {
		const clientClass = Client.sharedInstance;
		const self = Client.sharedInstance.getMessageProcessor();
		logger.info(message.from.username + " is not an authorized user.");
		let options = self.getMessageOptionsForResponse(message, "Not authorized. You can't use the commands of this bot.");
		clientClass.getJaysonClient().request('sendMessage', {token: clientClass.getToken(), network: 'Telegram', options: options}, function(err: Error, response: any) {
			if (err) {
				logger.error(err.message);
			} else {
				logger.info("Auth denied message sent.");
			}
		});
	}

	private sendNoCommandMessage(message: any): void {
		const clientClass = Client.sharedInstance;
		const self = Client.sharedInstance.getMessageProcessor();
		logger.info(message.from.username + " requested a no recognized command.");
		let options = self.getMessageOptionsForResponse(message, "No command found. Check configuration.");
		clientClass.getJaysonClient().request('sendMessage', {token: clientClass.getToken(), network: 'Telegram', options: options}, function(err: Error, response: any) {
			if (err) {
				logger.error(err.message);
			} else {
				logger.info("No command message sent.");
			}
		});
	}

	private sendHelpCommandMessage(message: any): void {
		const clientClass = Client.sharedInstance;
		const self = Client.sharedInstance.getMessageProcessor();
		const genericHelp = `Welcome to Tadobot.
This bot can check the temperatures of your house and set them.
To see the public commands: /help public
The rest of them are private commands where the user must be on whitelist.
To see the private commands: /help private`;
		const publicMethodHelp = `Public commands: 
${config.publicCommands.join('\n')}`;
		const privateMethodHelp = `Private commands:
${config.privateCommands.join('\n')}`;
		let commandArgs: string[] = message.text.split(" ");
		let helpMessage: string = genericHelp;
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
		logger.info("Sending help command response...");
		let options = self.getMessageOptionsForResponse(message, helpMessage);
		clientClass.getJaysonClient().request('sendMessage', {token: clientClass.getToken(), network: 'Telegram', options: options}, function(err: Error, response: any) {
			if (err) {
				logger.error(err.message);
			} else {
				logger.info("Help message sent.");
			}
		});
	}

	private getWeatherCommand(message: any): void {
		const clientClass = Client.sharedInstance;
		const self = Client.sharedInstance.getMessageProcessor();
		const genericHelp = `/getWeather <Name of home>
Your homes are: `;

		let commandArgs: string[] = message.text.split(" ");
		let helpMessage: string = genericHelp + self.getHomeNameList().join(", ");
		if (commandArgs.length > 1) {
			commandArgs.shift();
			let homeName = commandArgs.join(" ");
			let homeId = self.getHomeIdBy(homeName);
			clientClass.getJaysonClient().request('receiveMessage',
				{token: clientClass.getToken(), network: 'Tado', options: {api_method: 'getWeather', home_id: homeId}}, function(err: Error, response: any) {
					let weatherString = `Weather around of ${homeName}: 
${response.result.weatherState.value}, ${response.result.outsideTemperature.celsius} ºC, ${response.result.outsideTemperature.fahrenheit} ºF.`;
					let options = self.getMessageOptionsForResponse(message, weatherString);
					clientClass.getJaysonClient().request('sendMessage', {token: clientClass.getToken(), network: 'Telegram', options: options}, function(err: Error, response: any) {
						if (err) {
							logger.error(err.message);
						} else {
							logger.info("Weather result sent.");
						}
					});
			});
			return;
		}
		logger.info("Sending help command response...");
		let options = self.getMessageOptionsForResponse(message, helpMessage);
		clientClass.getJaysonClient().request('sendMessage', {token: clientClass.getToken(), network: 'Telegram', options: options}, function(err: Error, response: any) {
			if (err) {
				logger.error(err.message);
			} else {
				logger.info("Help message sent.");
			}
		});
	}

	private getZoneStateCommand(message: any): void {
		const clientClass = Client.sharedInstance;
		const self = Client.sharedInstance.getMessageProcessor();
		let helpMessage = `/getZoneState <Name of home>-<Name of zone>
Your homes are: ${self.getHomeNameList().join(", ")}`;
		let commandArgs: string[] = message.text.split(" ");
		if (commandArgs.length > 1) {
			commandArgs.shift();
			let homeZone = commandArgs.join(" ");
			let homeZoneArray = homeZone.split("-");
			if (homeZoneArray.length > 1) {
				let homeId = self.getHomeIdBy(homeZoneArray[0]);
				let zoneId = self.getZoneIdBy(homeId, homeZoneArray[1]);
				clientClass.getJaysonClient().request('receiveMessage',
					{token: clientClass.getToken(), network: 'Tado', options: {api_method: 'getZoneState', home_id: homeId, zone_id: zoneId}}, function(err: Error, response: any) {
					let weatherString = `State in ${homeZone}:
Heating: ${response.result.setting.power}. Target temperature: ${response.result.setting.temperature.celsius} ºC / ${response.result.setting.temperature.fahrenheit} ºF
Actual temperature: ${response.result.sensorDataPoints.insideTemperature.celsius} ºC / ${response.result.sensorDataPoints.insideTemperature.fahrenheit} ºF
Humidity: ${response.result.sensorDataPoints.humidity.percentage} %`;
					let options = self.getMessageOptionsForResponse(message, weatherString);
					clientClass.getJaysonClient().request('sendMessage', {token: clientClass.getToken(), network: 'Telegram', options: options}, function(err: Error, response: any) {
						if (err) {
							logger.error(err.message);
						} else {
							logger.info("Zone state result sent.");
						}
					});
				});
				return;
			}
			helpMessage += `\nYour zones for ${homeZoneArray[0]} are: ${self.getZoneNameListBy(homeZoneArray[0]).join(", ")}`;
		}
		logger.info("Sending help command response...");
		let options = self.getMessageOptionsForResponse(message, helpMessage);
		clientClass.getJaysonClient().request('sendMessage', {token: clientClass.getToken(), network: 'Telegram', options: options}, function(err: Error, response: any) {
			if (err) {
				logger.error(err.message);
			} else {
				logger.info("Help message sent.");
			}
		});
	}

	private getHomeNameList(): string[] {
		const self = Client.sharedInstance.getMessageProcessor();
		return self.tadoData.me.homes.map(function(value: TadoHome, index: number, array: TadoHome[]): string {
			return value.name;
		});
	}

	private getHomeIdBy(name: string): string {
		const self = Client.sharedInstance.getMessageProcessor();
		let home = self.tadoData.me.homes.find(i => i.name == name);
		return home.id;
	}

	private getZoneIdBy(homeId: string, name: string): string {
		const self = Client.sharedInstance.getMessageProcessor();
		let home = self.tadoData.me.homes.find(i => i.id == homeId);
		let zone = home.zones.find(i => i.name == name);
		return zone.id;
	}

	private getZoneNameListBy(homeName: string): string[] {
		const self = Client.sharedInstance.getMessageProcessor();
		let home = self.tadoData.me.homes.find(i => i.name == homeName);
		return home.zones.map(function(value: TadoZone, index: number, array: TadoZone[]): string {
			return value.name;
		});
	}
}