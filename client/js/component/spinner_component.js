"use strict";

define( [
    "knockout"
], function ( knockout ) {

    /**
     * @param {Object} options
     * @param {String} [options.type]
     * @constructor
     */
    function SpinnerComponent( options ) {

        var self = this;
        this.type = knockout.observable( options.type || SpinnerComponent.TYPE_1 );
        this.visible = knockout.observable( false );

    }

    SpinnerComponent.TYPE_1 = "1";
    SpinnerComponent.TYPE_2 = "2";

    return SpinnerComponent;

} );