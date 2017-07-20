/**
 * Created by kizer on 19/07/2017.
 */
import * as io from 'socket.io-client';

export const socket = {
    connect(url: string): Promise<SocketClient> {
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

export class SocketClient {

    public user: string;

    public onDisconnect: () => any;

    public onReconnect: () => any;

    constructor(public socket: SocketIOClient.Socket) {
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

    public login(user: string, password: string): Promise<boolean> {
        return new Promise((res, rej) => {
            if (this.user) {
                // Already logged in...
                res(true);
            }

            this.socket.emit('auth', { user, password }, e => {
                if (e) {
                    res(true);
                    this.user = user;
                } else {
                    rej();
                }
            });
        });
    }

    public subscribe(deviceId: string, callback: (status) => any): Promise<boolean> {
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

    public unsubscribe(deviceId: string, callback) {
        if (this.socket.connected) {
            this.socket.emit('unsubscribe', deviceId);
        }

        this.socket.off('status', callback);
    }

    public setStatus(deviceId: string, status: boolean): Promise<boolean> {
        return new Promise(res => {
            this.requireLogin();
            this.socket.emit('setStatus', {deviceId, status}, r => res(r));
        });
    }

    public getStatus(deviceId: string): Promise<boolean> {
        return new Promise(res => {
            this.requireLogin();
            this.socket.emit('getStatusAndDate', deviceId, r => res(r));
        });
    }

    public disconnect() {
        this.socket.disconnect();
    }

    public reconnect() {
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

    private requireLogin() {
        if (!this.user) {
            throw new Error('Not logged in');
        }
    }

}
