import * as jayson from "jayson";
import * as util from "util";

import {logger} from "./logger";
import {config} from "./config";
import {packageData} from "./package";

import {MessageHandler} from "./messages";
import {MessageProcessor} from "./mesprocessor";
import {TadoData} from "./tadodata";

export class Client {
	private static _instance: Client;

	private jayson: any;
	private bfmbToken: string;
	private messageHandler: MessageHandler;
	private messageProcessor: MessageProcessor;

	constructor() {
		this.bfmbToken = "";
		this.messageHandler = new MessageHandler();
		this.messageProcessor = new MessageProcessor();
	}

	static get sharedInstance(): Client {
		return this._instance || (this._instance = new Client());
	}

	startClient(): void {
		this.welcomeMessage();
		this.createJaysonClient();
	}

	getJaysonClient(): any {
		return this.jayson;
	}

	getMessageHandler(): MessageHandler {
		return this.messageHandler;
	}

	getMessageProcessor(): MessageProcessor {
		return this.messageProcessor;
	}

	getToken(): string {
		return this.bfmbToken;
	}

	private welcomeMessage(): void {
		logger.info("TadoBot " + packageData.version);
	}

	private createJaysonClient(): void {
		logger.info("Starting Jayson client...");
		switch (config.connection.protocol) {
			case "tcp":
				this.jayson = jayson.client.tcp({
					host: config.connection.host,
					port: config.connection.port
				});
				break;
			case "http":
				this.jayson = jayson.client.http({
					host: config.connection.host,
					port: config.connection.port
				});
				break;
			default:
				logger.error("Protocol " + config.connection.protocol + " not supported.");
				break;
		}
		this.connectToBFMB(this.connectionResponseBFMB);
		this.messageHandler.startLoop();
	}

	private connectionResponseBFMB(err: Error, response: any): void {
		if (err) {
			logger.error(err.message);
			logger.debug("Error stack: \n" + util.inspect(err.stack, false, null, true));
			process.exit(1);
		} else if (response.result) {
			logger.info("Response received, adding token...");
			logger.debug("Response received: \n" + util.inspect(response, false, null, true));
			Client.sharedInstance.bfmbToken = response.result;
			Client.sharedInstance.getMessageProcessor().loadTadoData(function(err: Error, success: boolean) {
				if (success) {
					logger.info("Tado data loaded.");
				} else {
					logger.error(err.message);
				}
			});
		} else {
			logger.error("Error in response: \n" + util.inspect(response, false, null, true));
			process.exit(1);
		}
	}

	private connectToBFMB(callback: Function): void {
		this.jayson.request('authenticate', { username: config.bfmbAuth.username, password: config.bfmbAuth.password }, function(err: Error, response: any) {
			if (err) { 
				callback(err);
			} else {
				callback(null, response);
			}

		});
	}
}