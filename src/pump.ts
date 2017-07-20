/**
 * Created by kizer on 20/07/2017.
 */
import {Gpio} from "onoff";
const throttle = require('lodash/throttle');
const EventEmitter = require('events');
const emitter = new EventEmitter();
let currentState = 0;

export const pump = {

    switchPump(status: boolean, date?: Date) {
        console.log('SWITCHING', status);
        currentState = status ? 1 : 0;
        relay.writeSync(currentState);

        if (!date) {
            date = new Date();
        } else {
            date = new Date(date);
        }

        emitter.emit('switch', {status: status, date: date});
    },

    on(...args) {
        emitter.addListener(...args);
    },

};

// Listen for when the pump is switched on
const button = new Gpio(12, 'in', 'rising');
const relay = new Gpio(19, 'out', 'none');

const buttonCb = (_err, value) => {
    console.log('BUTTON EVENT', value);
    if (+value === 1) {
        // Switch state
        pump.switchPump(!currentState);
    }
};

const buttonCcb = throttle(buttonCb, 900, {trailing: false});
button.watch(buttonCcb);

process.on('beforeExit', () => {
    // Open the relay on crash
    relay.writeSync(0);
});