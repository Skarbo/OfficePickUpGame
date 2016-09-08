define( function () {

    "use strict";

    var eventHandlers = {},
        tokenLast = -1;

    return {
        /**
         * Attach an event handler function for given event.
         * @public
         * @method
         * @param event {String} Event type.
         * @param handler {Function} A function to execute when the event is fired. (function(event [,arguments])
         * @param [options] {Object}
         * @param [options.priority] {Number} Priority for given event handler. Highest priority are fired first. Default 0.
         * @param [options.once] {Boolean} Only fire once
         * @returns {string} An unique token for given event handler.
         */
        on: function on( event, handler, options ) {
            options = options || {};
            var priority = options.priority || 0;
            if ( !eventHandlers[event] ) {
                eventHandlers[event] = {};
            }
            if ( !eventHandlers[event][priority] ) {
                eventHandlers[event][priority] = {};
            }
            var token = (++tokenLast).toString();

            eventHandlers[event][priority][token] = {
                token: token,
                handler: handler,
                event: event,
                priority: priority,
                once: options.once
            };
            return token;
        },

        /**
         * Remove and event handler.
         * @public
         * @method
         * @param token {String} Unique event handler token.
         * @returns {boolean} True if event handler exists and is removed.
         */
        off: function off( token ) {
            for ( var event in eventHandlers ) {
                if ( eventHandlers.hasOwnProperty( event ) ) {
                    for ( var priority in eventHandlers[event] ) {
                        if ( eventHandlers[event].hasOwnProperty( priority ) && eventHandlers[event][priority].hasOwnProperty( token ) ) {
                            delete eventHandlers[event][priority][token];
                            return true;
                        }
                    }
                }
            }
            return false;
        },

        /**
         * Execute all handlers for given event type with all given arguments,
         * except the first (event).
         * @public
         * @method
         * @param event {String} Event type.
         * @returns {boolean} True if one or more event handler is executed.
         * @example
         * event_handler.on( "myEvent", function( data1, data2 ){
             *     // Do cool stuff
             *     // data1.foo == "bar" <-- true
             * })
         *
         * event_handler.fire( "myEvent", { foo : "bar" }, { bar : "baz" } );
         */
        fire: function fire( event ) {
            var args = Array.prototype.slice.call( arguments, 1 );

            if ( !eventHandlers[event] ) {
                return false;
            }

            var keys = Object.keys( eventHandlers[event] );
            keys.sort( function ( a, b ) {
                return b - a;
            } );

            for ( var i in keys ) {
                if ( keys.hasOwnProperty( i ) && eventHandlers[event].hasOwnProperty( keys[i] ) ) {
                    for ( var token in eventHandlers[event][keys[i]] ) {
                        if ( eventHandlers[event][keys[i]].hasOwnProperty( token ) ) {
                            var eventHandlerObject = eventHandlers[event][keys[i]][token];

                            if ( eventHandlerObject.handler ) {
                                var eventObject = {
                                    token: eventHandlerObject.token,
                                    event: eventHandlerObject.event,
                                    priority: eventHandlerObject.priority
                                };

                                if ( eventHandlerObject.once ) {
                                    this.off( eventHandlerObject.token );
                                }

                                eventHandlerObject.handler.apply( eventObject, args );
                            }
                        }
                    }
                }
            }

            return true;
        },
        eventHandlers: eventHandlers
    };

} );