type EventCallback = (...args: any[]) => void;

class SimpleEventEmitter {
    private events: { [key: string]: EventCallback[] } = {};

    on(event: string, callback: EventCallback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    off(event: string, callback: EventCallback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }

    emit(event: string, ...args: any[]) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(...args));
        }
    }

    removeAllListeners(event?: string) {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
    }
}

export const shakeEventEmitter = new SimpleEventEmitter();
