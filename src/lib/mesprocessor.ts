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
		if (message.text) {
			logger.debug("Message text: " + message.text);
			let commands: [string] = message.text.split(" ");
			return (config.publicCommands.includes(commands[0]) || config.privateCommands.includes(commands[0]));
		}
	}

	private isAPrivateCommand(message: any): boolean {
		if (message.text) {
			logger.debug("Message text: " + message.text);
			let commands: [string] = message.text.split(" ");
			return (config.publicCommands.includes(commands[0]) || config.privateCommands.includes(commands[0]));
		}
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
			case "/getZoneOverlay":
				self.getZoneOverlayCommand(message);
				break;
			case "/setZoneOverlay":
				self.setZoneOverlayCommand(message);
				break;
			case "/clearZoneOverlay":
				self.clearZoneOverlayCommand(message);
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
					let stateString = `State in ${homeZone}:\nHeating: ${response.result.setting.power}.\n` 
					if (response.result.setting.temperature) {
						stateString += `Target temperature: ${response.result.setting.temperature.celsius} ºC / ${response.result.setting.temperature.fahrenheit} ºF\n`
					} 
					stateString += `Actual temperature: ${response.result.sensorDataPoints.insideTemperature.celsius} ºC / ${response.result.sensorDataPoints.insideTemperature.fahrenheit} ºF
Humidity: ${response.result.sensorDataPoints.humidity.percentage} %`;
					let options = self.getMessageOptionsForResponse(message, stateString);
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

	private getZoneOverlayCommand(message: any) {
		const clientClass = Client.sharedInstance;
		const self = Client.sharedInstance.getMessageProcessor();
		let helpMessage = `/getZoneOverlay <Name of home>-<Name of zone>
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
					{token: clientClass.getToken(), network: 'Tado', options: {api_method: 'getZoneOverlay', home_id: homeId, zone_id: zoneId}}, function(err: Error, response: any) {
						let overlayString = `Overlay in ${homeZone}:\n`
						if (err || !response.result) {
							overlayString += `No overlay set.`
						} else {
							overlayString += `Heating: ${response.result.setting.power}.\n` 
							if (response.result.setting.temperature) {
								overlayString += `Target temperature: ${response.result.setting.temperature.celsius} ºC / ${response.result.setting.temperature.fahrenheit} ºF\n`
							}
							overlayString += `Termination: ${response.result.termination.type}\n`
							if (response.result.termination.projectedExpiry) {
								overlayString += `Termination projected: ${response.result.termination.projectedExpiry}`
							}
						}
						let options = self.getMessageOptionsForResponse(message, overlayString);
						clientClass.getJaysonClient().request('sendMessage', {token: clientClass.getToken(), network: 'Telegram', options: options}, function(err: Error, response: any) {
							if (err) {
								logger.error(err.message);
							} else {
								logger.info("Zone overlay result sent.");
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

	private setZoneOverlayCommand(message: any) {
		const clientClass = Client.sharedInstance;
		const self = Client.sharedInstance.getMessageProcessor();
		let helpMessage = `/setZoneOverlay <Name of home>-<Name of zone>-<Heating on / off>-<Temperature to set>-<Time until end / auto>
Your homes are: ${self.getHomeNameList().join(", ")}`;
		let commandArgs: string[] = message.text.split(" ");
		if (commandArgs.length > 1) {
			commandArgs.shift();
			let homeZone = commandArgs.join(" ");
			let homeZoneArray = homeZone.split("-");
			if (homeZoneArray.length > 4) {
				let homeId = self.getHomeIdBy(homeZoneArray[0]);
				let zoneId = self.getZoneIdBy(homeId, homeZoneArray[1]);
				let power = homeZoneArray[2];
				let temperature = Number(homeZoneArray[3]) || 0;
				let termination = (homeZoneArray[4] == "auto") ? "auto" : (Number(homeZoneArray[4]) || 0)
				clientClass.getJaysonClient().request('sendMessage', {
					token: clientClass.getToken(), network: 'Tado', 
					options: {api_method: 'setZoneOverlay', home_id: homeId, zone_id: zoneId, power: power, temperature: temperature, termination: termination}}, 
					function(err: Error, response: any) {
						let setOverlayString = `Set overlay command sent to Tado.`;
						let options = self.getMessageOptionsForResponse(message, setOverlayString);
						clientClass.getJaysonClient().request('sendMessage', {token: clientClass.getToken(), network: 'Telegram', options: options}, function(err: Error, response: any) {
							if (err) {
								logger.error(err.message);
							} else {
								logger.info("Set overlay result sent.");
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

	private clearZoneOverlayCommand(message: any) {
		const clientClass = Client.sharedInstance;
		const self = Client.sharedInstance.getMessageProcessor();
		let helpMessage = `/clearZoneOverlay <Name of home>-<Name of zone>
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
					{token: clientClass.getToken(), network: 'Tado', options: {api_method: 'clearZoneOverlay', home_id: homeId, zone_id: zoneId}}, function(err: Error, response: any) {
						let clearOverlayString = `Clear overlay command sent to Tado.`
						let options = self.getMessageOptionsForResponse(message, clearOverlayString);
						clientClass.getJaysonClient().request('sendMessage', {token: clientClass.getToken(), network: 'Telegram', options: options}, function(err: Error, response: any) {
							if (err) {
								logger.error(err.message);
							} else {
								logger.info("Clear overlay result sent.");
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
}
