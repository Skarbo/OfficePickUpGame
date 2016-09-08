"use strict";

/**
 * @typedef {Object} UserShortVm
 * @property {Number} id
 * @property {String} name
 * @property {String} image
 */

/**
 * @typedef {Object} UserVm
 * @extends {User}
 * @property {Number} id
 * @property {Function} name Observable(String)
 * @property {Function} image Observable(String)
 * @property {Function} groups ObservableArray(String)
 * @property {Function} devices ObservableArray(Object(id, name, date))
 * @property {Function} settings Observable(Object)
 * @property {Function} placing Observable(Object)
 */

/**
 * @typedef {Object} UserGroup
 * @property {String} title
 * @property {number} count
 */

define( [
    "dom",
    "knockout",
    "lib/asset"
], function ( $, knockout, Asset ) {

    /**
     * @param {User} user
     * @constructor
     */
    function UserVm( user ) {

        // VARIABLES

        var self = this;

        $.extend( self, user );

        this._raw = user;
        this._updated = knockout.observable( 0 );

        this.userId = user.id;
        this.name = knockout.observable( null );
        this.image = knockout.observable( null );
        this.groups = knockout.observableArray( [] );
        this.devices = knockout.observableArray( [] );
        this.settings = knockout.observable( [] );
        this.placing = knockout.observableArray( [] );

        // OBSERVABLES

        this.firstName = knockout.pureComputed( function () {
            return self.name().match( /(.+)\s/ )[1] || "";
        }, true );

        this.shortName = knockout.pureComputed( function () {
            return self.name().split( " " ).map( function ( partName, i, array ) {
                return i === array.length - 1 ? partName : partName.substr( 0, 1 ) + ".";
            } ).join( " " );
        }, true );

        // FUNCTIONS

        function doInit( user ) {
            self.name( user.name );
            self.image( user.image || Asset.img.PROFILE_PNG );
            self.groups( user.groups || [] );
            self.devices( user.devices || [] );
            self.settings( user.settings || [] );
            self.placing( user.placing || [] );
        }

        this.doMerge = function ( user ) {
            doInit( user );
            self._updated( self._updated() + 1 );
        };

        this.getSearch = function () {
            return [
                self.name,
                self.email
            ].join( " " );
        };

        // READY

        doInit( user );

    }

    return UserVm;

} );