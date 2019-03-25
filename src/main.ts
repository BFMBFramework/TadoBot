import { Client } from "./lib/client";

function main(): void {
	const client = Client.sharedInstance;
	client.startClient();
}

main();