"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Created by kizer on 20/07/2017.
 */
const onoff_1 = require("onoff");
const debounce = require('lodash/debounce');
const EventEmitter = require('events');
const emitter = new EventEmitter();
let currentState = 0;
exports.pump = {
    switchPump(status, date) {
        console.log('SWITCHING', status);
        currentState = status ? 1 : 0;
        relay.writeSync(currentState);
        if (!date) {
            date = new Date();
        }
        else {
            date = new Date(date);
        }
        emitter.emit('switch', { status: status, date: date });
    },
    on(...args) {
        emitter.addListener(...args);
    },
};
// Listen for when the pump is switched on
const button = new onoff_1.Gpio(12, 'in', 'rising');
const relay = new onoff_1.Gpio(19, 'out', 'none');
const buttonCb = (_err, value) => {
    if (+value === 1) {
        // Switch state
        exports.pump.switchPump(!currentState);
    }
};
const buttonCcb = debounce(buttonCb, 300, { trailing: false });
button.watch(buttonCcb);
//# sourceMappingURL=pump.js.map