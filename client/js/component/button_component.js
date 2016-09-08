"use strict";

define( [
    "knockout",
    "lib/constant",
    "util/dom_util",
    "lib/asset",
    "lib/knockout_util"
], function ( knockout, Constant, DomUtil, Asset, KnockoutUtil ) {

    /**
     * @param {Object} [options]
     * @param {String|observable} options.text
     * @param {String|observable} [options.title]
     * @param {String} [options.type]
     * @param {Function} options.onClick
     * @param {boolean|observable} [options.disabled]
     * @constructor
     */
    function ButtonComponent( options ) {
        var self = this;

        this.text = KnockoutUtil.observable( options.text, "" );
        this.disabled = KnockoutUtil.observable( options.disabled, false );
        this.onClick = options.onClick;
        this.title = options.title || "";
        this.type = options.type || "button";
        this.hasFocus = KnockoutUtil.observable( options.disabled, false );
    }

    return ButtonComponent;

} );