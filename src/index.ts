/**
 * Created by kizer on 19/07/2017.
 */
import * as nconf from 'nconf';
import {socket, SocketClient} from "./socket";
import {pump} from "./pump";

nconf.file({file: __dirname + '/config.json'});
const localConfig = nconf.get('local');
const remoteConfig = nconf.get('remote');
const authInfo = nconf.get('auth');
const deviceId = nconf.get('deviceId');

const localUrl = `http://${localConfig.host}:${localConfig.port}`;
const remoteUrl = `http://${remoteConfig.host}:${remoteConfig.port}`;

let remoteSocket: SocketClient;
let localSocket: SocketClient;
let switchDate: Date;

// Connect to both local and remote at the same time
socket.connect(localUrl)
    .then(socket => localSocket = socket)
    .then(commonSetup)
    .then(localSetup);

socket.connect(remoteUrl)
    .then(socket => remoteSocket = socket)
    .then(commonSetup)
    .then(remoteSetup);

// When pump is switched, update the date
pump.on('switch', status => switchDate = status.date);

function commonSetup(socket: SocketClient) {
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

console.log('PUMP', pump);

function statusListener(status) {
    const newDate = new Date(status.date);

    if (!switchDate || newDate > switchDate) {
        // New date, switch the pump
        pump.switchPump(status.status, newDate);
    }
}

function localSetup(socket: SocketClient) {
    // Disconnect the remote server
    remoteSocket && remoteSocket.disconnect();
    socket.subscribe(deviceId, statusListener);
    const pushButtonListerner = status => console.log('PUSH BUTTON', status) || socket.setStatus(deviceId, status);

    const onReconnect = () => {
        // Set up the socket again
        commonSetup(socket)
            .then(() => {
                // When the physical button is pushed, update servers
                pump.on('pushButton', pushButtonListerner);
            })
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
        pump.off('pushButton', pushButtonListerner);
    };

    socket.onDisconnect = onDisconnect;
    socket.onReconnect = onReconnect;
}

function remoteSetup(socket: SocketClient) {
    socket.subscribe(deviceId, statusListener);
    const pushButtonListerner = status => socket.setStatus(deviceId, status);

    const onReconnect = () => {
        // Set up the socket again
        commonSetup(socket)
            .then(() => {
                // When the physical button is pushed, update servers
                pump.on('pushButton', pushButtonListerner);
            })
            .then(() => {
                socket.subscribe(deviceId, statusListener);
            });
    };

    const onDisconnect = () => {
        // Unsibscribe
        socket.unsubscribe(deviceId, statusListener);
        pump.off('pushButton', pushButtonListerner);
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
