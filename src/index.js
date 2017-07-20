"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Created by kizer on 19/07/2017.
 */
const nconf = require("nconf");
const socket_1 = require("./socket");
const pump_1 = require("./pump");
nconf.file({ file: __dirname + '/config.json' });
const localConfig = nconf.get('local');
const remoteConfig = nconf.get('remote');
const authInfo = nconf.get('auth');
const deviceId = nconf.get('deviceId');
const localUrl = `http://${localConfig.host}:${localConfig.port}`;
const remoteUrl = `http://${remoteConfig.host}:${remoteConfig.port}`;
let remoteSocket;
let localSocket;
let switchDate;
// Connect to both local and remote at the same time
socket_1.socket.connect(localUrl)
    .then(socket => localSocket = socket)
    .then(commonSetup)
    .then(localSetup);
socket_1.socket.connect(remoteUrl)
    .then(socket => remoteSocket = socket)
    .then(commonSetup)
    .then(remoteSetup);
function commonSetup(socket) {
    // Login first
    return socket.login(authInfo.user, authInfo.password)
        .then(() => getInitialStatus(socket))
        .then(() => socket) // Return the socket for chaining
        .catch((e) => {
        // Unable to authenticate, abort
        console.error(e);
        process.abort();
        throw new Error(e);
    });
}
console.log('PUMP', pump_1.pump);
function statusListener(status) {
    const newDate = new Date(status.date);
    if (!switchDate || newDate > switchDate) {
        // New date, switch the pump
        pump_1.pump.switchPump(status.status, newDate);
    }
}
// When pump is switched, update the date
pump_1.pump.on('switch', status => switchDate = status.date);
function localSetup(socket) {
    // Disconnect the remote server
    remoteSocket && remoteSocket.disconnect();
    socket.subscribe(deviceId, statusListener);
    const onReconnect = () => {
        // Set up the socket again
        commonSetup(socket)
            .then(() => {
            // When we reconnect, disable remote
            remoteSocket && remoteSocket.disconnect();
            socket.subscribe(deviceId, statusListener);
        });
    };
    const onDisconnect = () => {
        // When we disconnect, try to reconnect the remote
        remoteSocket && remoteSocket.reconnect();
        socket.unsubscribe(deviceId, statusListener);
    };
    socket.onDisconnect = onDisconnect;
    socket.onReconnect = onReconnect;
}
function remoteSetup(socket) {
    socket.subscribe(deviceId, statusListener);
    const onReconnect = () => {
        // Set up the socket again
        commonSetup(socket)
            .then(() => {
            socket.subscribe(deviceId, statusListener);
        });
    };
    const onDisconnect = () => {
        // Unsibscribe
        socket.unsubscribe(deviceId, statusListener);
    };
    socket.onDisconnect = onDisconnect;
    socket.onReconnect = onReconnect;
}
function getInitialStatus(socket) {
    console.log('GETTING INTIAL STATUS');
    // Get the current status of the pump
    return socket.getStatus(deviceId)
        .then(statusListener);
}
//# sourceMappingURL=index.js.map