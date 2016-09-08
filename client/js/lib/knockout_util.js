"use strict";

/**
 * Knockout observable
 * @typedef {Function|Array} observable
 * @see {@link http://knockoutjs.com/documentation/observables.html|Knockout observable}
 */

/**
 * Knockout computed
 * @typedef {Function} computed
 * @see {@link http://knockoutjs.com/documentation/computedObservables.html|Knockout computed}
 */

define( ["knockout"], function ( knockout ) {

    var KnockoutUtil = {};

    /**
     * @param {observable|*} value
     * @param {*} [def]
     * @returns {observable}
     */
    KnockoutUtil.observable = function ( value, def ) {
        return typeof value === "function" ? value : knockout.observable( typeof value !== "undefined" ? value : def );
    };

    /**
     * @param {observable|*} array
     * @param {*} [def]
     * @returns {observable}
     */
    KnockoutUtil.observableArray = function ( array, def ) {
        def = def || [];
        return typeof array === "function" ? array : knockout.observableArray( typeof array !== "undefined" ? array : def );
    };

    /**
     * @param {observable|*} par
     * @returns {*}
     */
    KnockoutUtil.toValue = function ( par ) {
        return typeof par === "function" ? par() : par;
    };

    /**
     * @param {observable}
     * @returns {observable}
     */
    KnockoutUtil.not = function ( observable ) {
        return knockout.computed( function () {
            return !observable();
        } );
    };

    return KnockoutUtil;

} );