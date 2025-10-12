
/**
 * A simple event emitter class for internal communication.
 */
export default class EventEmitter {
    constructor() {
        this.events = new Map();
    }

    /**
     * Subscribes to an event.
     * @param {string} event The event name.
     * @param {Function} listener The callback function.
     */
    on(event, listener) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(listener);
    }

    /**
     * Emits an event.
     * @param {string} event The event name.
     * @param  {...any} args Arguments to pass to the listeners.
     */
    emit(event, ...args) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(listener => listener(...args));
        }
    }
}
