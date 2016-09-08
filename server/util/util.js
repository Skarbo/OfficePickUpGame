"use strict";

var extend = require( "extend" );

/**
 * @typedef Error
 * @property {String} message
 * @property {Object} [error]
 * @property {Array<Object>} [errors]
 */

var Util = {

    extend: extend,

    parseObject: function ( object ) {
        var newObject = {};

        for ( var key in object ) {
            if ( object.hasOwnProperty( key ) ) {
                newObject[key] = Util.parseProperty( object[key] );
            }
        }

        return newObject;
    },

    parseProperty: function ( property ) {
        if ( property === "null" ) {
            return null;
        }
        else if ( property === "true" ) {
            return true;
        }
        else if ( property === "false" ) {
            return false;
        }
        return property;
    },

    isArray: function ( par ) {
        return par ? typeof par === "object" && par.length !== undefined : false;
    },

    objectToArray: function ( object ) {
        var array = [];
        for ( var key in object ) {
            if ( object.hasOwnProperty( key ) ) {
                array.push( object[key] );
            }
        }
        return array;
    },

    getProperty: function ( def, obj, args ) {
        var hasDefault = typeof obj === "object";
        var def_ = hasDefault ? def : null;
        obj = hasDefault ? obj : def;
        var args = this.objectToArray( arguments ).slice( hasDefault ? 2 : 1 );
        var length = args.length;
        var result = obj;

        if ( !result ) {
            return def_;
        }

        for ( var i = 0; i < length; i++ ) {
            if ( result[args[i]] !== undefined ) {
                result = result[args[i]];
            } else {
                return def_;
            }
        }

        return result;
    },

    parseNumber: function ( val, def ) {
        def = def === undefined ? null : def;
        return isNaN( parseInt( val ) ) ? def : parseInt( val );
    },

    /**
     * @param {Number} length
     * @returns {Array<Number>}
     */
    createRangeArray: function ( length ) {
        return Array.apply( null, {length: length} ).map( Number.call, Number );
    },

    /**
     * @param {Array} array
     * @returns {Array}
     */
    shuffleArray: function shuffle( array ) {
        var currentIndex = array.length, temporaryValue, randomIndex;

        // While there remain elements to shuffle...
        while ( 0 !== currentIndex ) {

            // Pick a remaining element...
            randomIndex = Math.floor( Math.random() * currentIndex );
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    },

    /**
     * @param {Array} array
     * @returns {Array}
     */
    uniqueArray: function ( array ) {
        return array.reverse().filter( function ( e, i, arr ) {
            return arr.indexOf( e, i + 1 ) === -1;
        } ).reverse();
    },

    /**
     * @param {Array} array
     * @returns {Array}
     */
    parseNumbersInArray: function ( array ) {
        return Util.isArray( array ) ? array.map( function ( par ) {
            return /^\d+$/.test( par ) ? parseInt( par ) : par;
        } ) : array;
    },

    /**
     * @param {Array} array
     * @returns {*}
     */
    getRandomItem: function ( array ) {
        return array.length > 0 ? array[Math.floor( Math.random() * array.length )] : null;
    },

    /**
     * @param {Array} array
     * @returns {Array}
     */
    filterArray: function ( array ) {
        return array.filter( function ( item ) {
            return !!item;
        } );
    }

};

module.exports = Util;