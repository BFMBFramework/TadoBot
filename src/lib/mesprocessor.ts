import * as util from "util";

import {logger} from "./logger";
import {config} from "./config";

import {Client} from "./client";

export class MessageProcessor {

	processMessage(message: any): void {
		console.log(util.inspect(message, false, null, true));
		if (this.isAValidCommand(message)) {
			if (!this.isAuthorizedUser(message.from.username)) {
				this.sendAuthDenegationMessage(message);
				return
			}
			this.doCommand(message);
		}
	}

	private isAuthorizedUser(username: string): boolean {
		return config.authorizedUsernames.includes(username);
	}

	private isAValidCommand(message: any): boolean {
		logger.info("Message text: " + message.text);
		let commands: [string] = message.text.split(" ");
		return config.availableCommands.includes(commands[0]);
	}

	private getMessageOptionsForResponse(message: any, text: string): any {
		return {
			chat_id: message.chat.id,
			text: text
		}
	}

	private doCommand(message: any): void {
		const self = Client.sharedInstance.getMessageProcessor();
		let commandArgs: [string] = message.text.split(" ")
		switch (commandArgs[0]) {
			case "/start":
			case "/help":
				self.sendHelpCommandMessage(message);
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

	private sendHelpCommandMessage(message: any): void {
		const clientClass = Client.sharedInstance;
		const self = Client.sharedInstance.getMessageProcessor();
		logger.info("Sending help command response...");
		let helpMessage = "This is the help command message.";
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