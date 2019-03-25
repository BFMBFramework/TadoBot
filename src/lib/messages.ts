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
		logger.debug("Executing reception loop.");
	}
}