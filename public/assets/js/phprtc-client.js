"use strict";
var RTC_EventEmitter = /** @class */ (function () {
    function RTC_EventEmitter() {
        this.listeners = {
            'on': {},
            'once': {}
        };
    }
    RTC_EventEmitter.prototype.on = function (name, listener) {
        if (!this.listeners['on'][name]) {
            this.listeners['on'][name] = [];
        }
        this.listeners['on'][name].push(listener);
    };
    RTC_EventEmitter.prototype.once = function (name, listener) {
        if (!this.listeners['once'][name]) {
            this.listeners['once'][name] = [];
        }
        this.listeners['once'][name].push(listener);
    };
    RTC_EventEmitter.prototype.dispatch = function (name, data) {
        if (data === void 0) { data = []; }
        var regularEvent = this.listeners['on'];
        if (regularEvent.hasOwnProperty(name)) {
            regularEvent[name].forEach(function (listener) {
                listener.apply(void 0, data);
            });
        }
        var onceEvent = this.listeners['once'];
        if (onceEvent.hasOwnProperty(name)) {
            onceEvent[name].forEach(function (listener) {
                listener(data);
            });
            delete onceEvent[name];
        }
    };
    return RTC_EventEmitter;
}());
var RTC_Room = /** @class */ (function () {
    function RTC_Room(name, connection, eventEmitter) {
        if (eventEmitter === void 0) { eventEmitter = new RTC_EventEmitter(); }
        var _this = this;
        this.name = name;
        this.connection = connection;
        this.eventEmitter = eventEmitter;
        var joinRoom = function () { return _this.connection.send('join', name, {
            type: 'room',
            id: _this.name,
        }); };
        if (this.connection.isOpened()) {
            joinRoom();
        }
        else {
            this.connection.onOpen(joinRoom);
        }
    }
    RTC_Room.prototype.onMessage = function (listener) {
        this.eventEmitter.on('message', listener);
        return this;
    };
    RTC_Room.prototype.on = function (name, listener) {
        this.eventEmitter.on(name, listener);
        return this;
    };
    RTC_Room.prototype.once = function (name, listener) {
        this.eventEmitter.once(name, listener);
        return this;
    };
    RTC_Room.prototype.onAllEvents = function (listener) {
        this.on('all_events', listener);
        return this;
    };
    RTC_Room.prototype.send = function (event, data) {
        return this.connection.send(event, data, {
            type: 'room',
            id: this.name,
        });
    };
    RTC_Room.prototype.leave = function () {
        return this.connection.send('leave', null, {
            type: 'room',
            id: this.name,
        });
    };
    RTC_Room.prototype.getConnection = function () {
        return this.connection;
    };
    RTC_Room.prototype.emitEvent = function (name, event) {
        this.eventEmitter.dispatch(name, [event]);
    };
    return RTC_Room;
}());
var RTC_Websocket = /** @class */ (function () {
    function RTC_Websocket(wsUri, options, user_info) {
        if (options === void 0) { options = []; }
        var _this = this;
        this.wsUri = wsUri;
        this.options = options;
        this.user_info = user_info;
        this.reconnectionInterval = 5000;
        this.connectionState = 'standby';
        this.willReconnect = true;
        this.canReconnect = true;
        this.defaultAuthToken = null;
        this.rooms = [];
        this.pingPongInterval = 20000;
        this.eventEmitter = new RTC_EventEmitter();
        // HANDLE MESSAGE/EVENT DISPATCH WHEN DOM FINISHED LOADING
        // Inspect messages and dispatch event
        this.onMessage(function (event) {
            if (event.event) {
                // Dispatch unfiltered event events
                _this.eventEmitter.dispatch('event', [event]);
                // Dispatch filtered event event
                _this.eventEmitter.dispatch('event.' + event.event, [event]);
                // Handle server intentional disconnection
                if (event.event === 'conn.rejected') {
                    _this.stopPingPong();
                    _this.stopReconnectionTimeout();
                    _this.canReconnect = false;
                    _this.log("Server rejected connection: ".concat(_this.wsUri, ".\nReason: ").concat(event.data.reason));
                }
                // Handle Room Events
                if (event.receiver.type === 'room') {
                    for (var i = 0; i < _this.rooms.length; i++) {
                        var room = _this.rooms[i];
                        if (room.name === event.receiver.id) {
                            room.emitEvent('all_events', event);
                            room.emitEvent(event.event, event);
                            break;
                        }
                    }
                }
            }
        });
    }
    RTC_Websocket.create = function (uri, options, user_info) {
        if (options === void 0) { options = []; }
        var ws = (new RTC_Websocket(uri, options, user_info)).connect();
        if (user_info) {
            ws.onOpen(function () { return ws.attachInfo(user_info); });
        }
        return ws;
    };
    /**
     * Check if connection is opened
     * @returns {boolean}
     */
    RTC_Websocket.prototype.isOpened = function () {
        return 'open' === this.connectionState;
    };
    ;
    /**
     * Gets server connection state
     * @returns {string}
     */
    RTC_Websocket.prototype.getState = function () {
        return this.connectionState;
    };
    ;
    /**
     * Get browser implementation of WebSocket object
     * @return {WebSocket}
     */
    RTC_Websocket.prototype.getWebSocket = function () {
        return this.websocket;
    };
    ;
    /**
     * This event fires when a connection is opened/created
     * @param listener
     */
    RTC_Websocket.prototype.onOpen = function (listener) {
        this.eventEmitter.on('open', listener);
        return this;
    };
    ;
    RTC_Websocket.prototype.attachInfo = function (info) {
        this.send('attach_info', info, {
            type: 'server',
            id: 'server'
        });
        return this;
    };
    ;
    RTC_Websocket.prototype.joinRoom = function (name) {
        var room = new RTC_Room(name, this);
        this.rooms.push(room);
        return room;
    };
    ;
    RTC_Websocket.prototype.leaveRoom = function (name) {
        var _this = this;
        var _loop_1 = function (i) {
            var room = this_1.rooms[i];
            if (room.name === name) {
                room.leave().then(function () { return _this.rooms.splice(i, 1); });
                return "break";
            }
        };
        var this_1 = this;
        for (var i = 0; i < this.rooms.length; i++) {
            var state_1 = _loop_1(i);
            if (state_1 === "break")
                break;
        }
    };
    RTC_Websocket.prototype.getRoom = function (name) {
        for (var i = 0; i < this.rooms.length; i++) {
            var room = this.rooms[i];
            if (room.name === name) {
                return room;
            }
        }
        return null;
    };
    RTC_Websocket.prototype.setPingPongInterval = function (ms) {
        this.pingPongInterval = ms;
        this.stopPingPong();
        if (this.isOpened()) {
            this.startPingPong();
        }
        return this;
    };
    /**
     * This event fires when message is received
     * @param listener
     */
    RTC_Websocket.prototype.onMessage = function (listener) {
        this.eventEmitter.on('message', listener);
        return this;
    };
    ;
    /**
     * Listens to filtered websocket event message
     *
     * @param event {string}
     * @param listener {callback}
     */
    RTC_Websocket.prototype.onEvent = function (event, listener) {
        this.eventEmitter.on('event.' + event, listener);
        return this;
    };
    ;
    /**
     * Listens to RTC socket event
     *
     * @param listener
     */
    RTC_Websocket.prototype.onAnyEvent = function (listener) {
        this.eventEmitter.on('event', listener);
        return this;
    };
    ;
    /**
     * This event fires when this connection is closed
     *
     * @param listener
     */
    RTC_Websocket.prototype.onClose = function (listener) {
        this.eventEmitter.on('close', listener);
        return this;
    };
    ;
    /**
     * This event fires when client is disconnecting this connection
     *
     * @param listener
     */
    RTC_Websocket.prototype.onDisconnect = function (listener) {
        this.eventEmitter.on('custom.disconnect', listener);
        return this;
    };
    ;
    /**
     * This event fires when an error occurred
     * @param listener
     */
    RTC_Websocket.prototype.onError = function (listener) {
        this.eventEmitter.on('error', listener);
        return this;
    };
    ;
    /**
     * This event fires when this connection is in connecting state
     * @param listener
     */
    RTC_Websocket.prototype.onConnecting = function (listener) {
        this.eventEmitter.on('connecting', listener);
        return this;
    };
    ;
    /**
     * This event fires when this reconnection is in connecting state
     * @param listener
     */
    RTC_Websocket.prototype.onReconnecting = function (listener) {
        this.eventEmitter.on('reconnecting', listener);
        return this;
    };
    ;
    /**
     * This event fires when this reconnection has been reconnected
     * @param listener
     */
    RTC_Websocket.prototype.onReconnect = function (listener) {
        this.eventEmitter.on('reconnect', listener);
        return this;
    };
    ;
    RTC_Websocket.prototype.onReady = function (listener) {
        window.addEventListener('DOMContentLoaded', listener);
    };
    ;
    /**
     * Set reconnection interval
     * @param interval
     */
    RTC_Websocket.prototype.setReconnectionInterval = function (interval) {
        this.reconnectionInterval = interval;
        return this;
    };
    ;
    /**
     * Set an authentication token that will be included in each outgoing message
     *
     * @param token {string} authentication token
     */
    RTC_Websocket.prototype.setAuthToken = function (token) {
        this.defaultAuthToken = token;
        return this;
    };
    ;
    /**
     * Manually reconnect this connection
     */
    RTC_Websocket.prototype.reconnect = function () {
        var _this = this;
        if (this.canReconnect) {
            this.closeConnection(true);
            if (this.reconnectionInterval) {
                this.reconnectionTimeout = setTimeout(function () { return _this.createSocket(true); }, this.reconnectionInterval);
            }
        }
    };
    ;
    /**
     * Connect to websocket server
     *
     * @returns {RTC_Websocket}
     */
    RTC_Websocket.prototype.connect = function () {
        // Create websocket connection
        this.createSocket();
        return this;
    };
    ;
    /**
     * Close this connection, the connection will not be reconnected.
     */
    RTC_Websocket.prototype.close = function () {
        this.willReconnect = false;
        this.stopPingPong();
        this.stopReconnectionTimeout();
        this.closeConnection(false);
        this.eventEmitter.dispatch('custom.disconnect');
    };
    ;
    /**
     * Send message to websocket server
     * @param event {any} event name
     * @param data {array|object|int|float|string} message
     * @param receiver {LooseObject}
     * @return Promise
     */
    RTC_Websocket.prototype.send = function (event, data, receiver) {
        var _this = this;
        if (receiver === void 0) { receiver = {}; }
        event = JSON.stringify({
            event: event,
            data: data,
            receiver: receiver,
            time: new Date().getTime(),
        });
        //Send message
        return new Promise(function (resolve, reject) {
            //Only send message when client is connected
            if (_this.isOpened()) {
                try {
                    _this.websocket.send(event);
                    resolve(_this);
                }
                catch (error) {
                    reject(error);
                }
                //Send message when connection is recovered
            }
            else {
                _this.log("Your message will be sent when server connection is recovered, server:".concat(_this.wsUri));
                _this.eventEmitter.once('open', function () {
                    try {
                        _this.websocket.send(event);
                        resolve(_this);
                    }
                    catch (error) {
                        reject(error);
                    }
                });
            }
        });
    };
    ;
    RTC_Websocket.prototype.log = function (message) {
        console.log(message);
    };
    ;
    RTC_Websocket.prototype.startPingPong = function () {
        var _this = this;
        this.pingPongIntervalTimer = setInterval(function () {
            _this.send('ping', { message: 'ping' }, {
                type: 'system',
                id: 'system'
            });
        }, this.pingPongInterval);
    };
    RTC_Websocket.prototype.stopPingPong = function () {
        clearInterval(this.pingPongIntervalTimer);
    };
    RTC_Websocket.prototype.stopReconnectionTimeout = function () {
        clearTimeout(this.reconnectionTimeout);
    };
    RTC_Websocket.prototype.changeState = function (stateName, event) {
        this.connectionState = stateName;
        if ('close' === stateName && this.willReconnect) {
            this.reconnect();
        }
        this.eventEmitter.dispatch(stateName, [event]);
    };
    ;
    RTC_Websocket.prototype.closeConnection = function (reconnect) {
        if (reconnect === void 0) { reconnect = false; }
        if (reconnect) {
            this.willReconnect = true;
            this.connectionState = 'internal_reconnection';
        }
        this.websocket.close();
    };
    ;
    RTC_Websocket.prototype.closeNativeWebsocketConnection = function () {
        var _this = this;
        if (this.websocket) {
            if (this.websocket.readyState === WebSocket.OPEN) {
                this.websocket.close();
            }
            if (this.websocket.readyState === WebSocket.CONNECTING) {
                var interval_1 = setInterval(function () {
                    if (_this.websocket.readyState === WebSocket.OPEN) {
                        _this.websocket.close();
                        clearInterval(interval_1);
                    }
                }, 250);
            }
        }
    };
    RTC_Websocket.prototype.createSocket = function (isReconnecting) {
        var _this = this;
        if (isReconnecting === void 0) { isReconnecting = false; }
        if (isReconnecting) {
            this.connectionState = 'reconnecting';
            this.eventEmitter.dispatch('reconnecting');
        }
        else {
            this.connectionState = 'connecting';
            this.eventEmitter.dispatch('connecting');
        }
        if (this.wsUri.indexOf('ws://') === -1 && this.wsUri.indexOf('wss://') === -1) {
            this.wsUri = 'ws://' + window.location.host + this.wsUri;
        }
        this.closeNativeWebsocketConnection();
        this.websocket = new WebSocket(this.wsUri, []);
        this.websocket.addEventListener('open', function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            if (_this.defaultAuthToken) {
                _this.send('auth.token', _this.defaultAuthToken);
            }
            if ('reconnecting' === _this.connectionState) {
                _this.eventEmitter.dispatch('reconnect');
            }
            // Ping pong
            _this.startPingPong();
            _this.changeState('open', args);
        });
        this.websocket.addEventListener('message', function (e) {
            var event = JSON.parse(e.data);
            if (event.event === 'pong') {
                return;
            }
            // User Info needs double parsing
            if (event.sender.info) {
                event.sender.info = JSON.parse(event.sender.info);
            }
            // User Info needs double parsing
            if (event.meta && event.meta.user_info) {
                event.meta.user_info = JSON.parse(event.meta.user_info);
            }
            _this.eventEmitter.dispatch('message', [event]);
        });
        this.websocket.addEventListener('close', function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            _this.stopPingPong();
            _this.changeState('close', args);
        });
        this.websocket.addEventListener('error', function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            _this.changeState('error', args);
        });
    };
    return RTC_Websocket;
}());
