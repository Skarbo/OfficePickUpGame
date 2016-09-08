"use strict";

/**
 * @typedef {Object} Error
 * @property {string} message
 * @property {string} [code]
 * @property {Object} [error]
 * @property {Object} [params]
 * @property {*} [stack]
 */

var ErrorHelper = {};

/**
 * @param {Error|*} err
 * @param {String} message
 * @param {String} [code]
 * @param {Object} [params]
 * @returns {Error}
 */
ErrorHelper.createError = function ( err, message, code, params ) {
    if ( typeof err === "object" ) {
        err.message = err.message || message;
        err.code = err.code || code;
        err.params = params || err.params;
        return err;
    }
    else {
        return {
            message: message,
            code: code || null,
            params: params || {},
            error: err || null,
            stack: err.stack || null
        }
    }
};

module.exports = ErrorHelper;