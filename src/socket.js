"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Created by kizer on 19/07/2017.
 */
const io = require("socket.io-client");
exports.socket = {
    connect(url) {
        return new Promise((res, rej) => {
            // Attempt connection
            const client = io(url);
            client.once('connect', () => {
                res(new SocketClient(client));
            });
            client.on('connect_error', e => {
                rej(e);
            });
        });
    }
};
class SocketClient {
    constructor(socket) {
        this.socket = socket;
        this.socket.on('disconnect', () => {
            // After disconnect, we are no longer logged in
            this.user = null;
            if (this.onDisconnect) {
                this.onDisconnect();
            }
        });
        this.socket.on('reconnect', () => {
            if (this.onReconnect) {
                this.onReconnect();
            }
        });
    }
    login(user, password) {
        return new Promise((res, rej) => {
            if (this.user) {
                // Already logged in...
                res(true);
            }
            this.socket.emit('auth', { user, password }, e => {
                if (e) {
                    res(true);
                    this.user = user;
                }
                else {
                    rej();
                }
            });
        });
    }
    subscribe(deviceId, callback) {
        return new Promise(res => {
            this.requireLogin();
            this.socket.emit('subscribe', deviceId, e => res(e));
            this.socket.on('status', status => {
                if (status.deviceId === deviceId) {
                    callback(status);
                }
            });
        });
    }
    unsubscribe(deviceId, callback) {
        if (this.socket.connected) {
            this.socket.emit('unsubscribe', deviceId);
        }
        this.socket.off('status', callback);
    }
    setStatus(deviceId, status) {
        return new Promise(res => {
            this.requireLogin();
            this.socket.emit('setStatus', { deviceId, status }, r => res(r));
        });
    }
    getStatus(deviceId) {
        return new Promise(res => {
            this.requireLogin();
            this.socket.emit('getStatusAndDate', deviceId, r => res(r));
        });
    }
    disconnect() {
        this.socket.disconnect();
    }
    reconnect() {
        if (this.socket.connected) {
            // Socket already connected
            return;
        }
        this.socket.once('connect', () => {
            if (this.onReconnect) {
                this.onReconnect();
            }
        });
    }
    requireLogin() {
        if (!this.user) {
            throw new Error('Not logged in');
        }
    }
}
exports.SocketClient = SocketClient;
//# sourceMappingURL=socket.js.map