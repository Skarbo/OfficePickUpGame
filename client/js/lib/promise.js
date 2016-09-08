"use strict";

define( function () {

    if ( typeof Promise.prototype.done !== 'function' ) {
        Promise.prototype.done = function ( onFulfilled, onRejected ) {
            var self = arguments.length ? this.then.apply( this, arguments ) : this
            self.then( null, function ( err ) {
                setTimeout( function () {
                    throw err
                }, 0 )
            } )
        }
    }

    if ( typeof Promise.prototype.finally !== 'function' ) {
        Promise.prototype.finally = function finallyPolyfill( callback ) {
            var constructor = this.constructor;

            return this.then( function ( value ) {
                return constructor.resolve( callback() ).then( function () {
                    return value;
                } );
            }, function ( reason ) {
                return constructor.resolve( callback() ).then( function () {
                    throw reason;
                } );
            } );
        };
    }

    return Promise;

} );