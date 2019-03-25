"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("./lib/client");
function main() {
    const client = client_1.Client.sharedInstance;
    client.startClient();
}
main();
