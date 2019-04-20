import * as util from "util";

import {logger} from "./logger";
import {config} from "./config";

import {Client} from "./client";

export class MessageHandler {

	startLoop(): void {
		if (config.requestPolling) {
			setInterval(this.receptionLoop, config.requestPolling);
		} else {
			throw new Error("Polling not defined in configuration.");
		}
	}

	private receptionLoop(): void {
		const clientClass = Client.sharedInstance;
		const self = Client.sharedInstance.getMessageHandler();
		logger.debug("Executing reception loop.");
		clientClass.getJaysonClient().request('receiveMessage', {token: clientClass.getToken(), network: 'Telegram', options: {}}, function(err: Error, response: any) {
			self.receptionResponse(err, response);
		});
	}

	private receptionResponse(err: Error, response: any): void {
		const messageProcessor = Client.sharedInstance.getMessageProcessor();
		logger.debug("Received response.");
		if (err) {
			logger.error(err.message);
			return
		}
		if (response.result.length == 0) {
			logger.debug("No results in response.");
			return
		}
		let messages: [any] = response.result
		for (let message of messages) {
			if (message.message) {
				messageProcessor.processMessage(message.message);
			}
		}
	}
}