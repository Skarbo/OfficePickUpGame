"use strict";

define( [
    "dom",
    "lib/global",
    "util/util",
    "helper/user_helper",
    "helper/error_helper",
    "vm/user_vm"
], function ( $, Global, Util, UserHelper, ErrorHelper, UserVm ) {

    return UserHandler;

    function UserHandler() {

        /**
         * @param {Object} user
         * @returns {Promise}
         */
        this.doSaveUser = function ( user ) {
            console.log("Do save user", user);
            return new Promise( function ( fulfill, reject ) {
                Global.kpugApi.saveUser( user )
                    .then( function ( user ) {
                        var userVm = UserHelper.doInjectUser( user, Global.users() );
                        fulfill( userVm );
                    }, function ( err ) {
                        reject( ErrorHelper.createError( err, "Could save user", ErrorCodes.USER_SAVE_ERROR, {
                            user: user
                        } ) );
                    } )
            } );
        };

        /**
         * @param {Array<String>} userGroups
         * @returns {Promise}
         */
        this.setUserGroups = function ( userGroups ) {
            userGroups = Util.uniqueArray( userGroups.filter( function ( userGroup ) {
                return !!userGroup && /[a-z]/i.test( userGroup );
            } ) );

            return new Promise( function ( fulfill, reject ) {
                Global.kpugApi.saveUser( {
                    groups: userGroups
                } )
                    .then( function ( user ) {
                        return fulfill( new UserVm( user ) );
                    }, function ( err ) {
                        reject( ErrorHelper.createError( err, "Could not update groups", ErrorCodes.USER_SAVE_ERROR, {
                            userGroups: userGroups
                        } ) );
                    } );
            } );
        };

        /**
         * @param {String} deviceId
         * @param {boolean} isRemove
         * @param {Object} options
         * @param {String} [options.name]
         * @returns {Promise}
         */
        this.doAddOrRemoveUserDevice = function ( deviceId, isRemove, options ) {
            return new Promise( function ( fulfill, reject ) {
                Global.kpugApi.doAddOrRemoveUserDevice( deviceId, isRemove, options )
                    .then( function ( user ) {
                        var userVm = UserHelper.doInjectUser( user, Global.users() );
                        fulfill( userVm );
                    }, function ( err ) {
                        reject( ErrorHelper.createError( err, "Could not add/remove user device", ErrorCodes.USER_DEVICE_ERROR, {
                            deviceId: deviceId,
                            isRemove: isRemove,
                            options: options
                        } ) );
                    } )
            } );
        };

        /**
         * @param {User} user
         */
        this.onNewUser = function ( user ) {
            Global.pugs.push( new UserVm( user ) );
        };

        /**
         * @param {User} user
         */
        this.onUpdateUser = function ( user ) {
            UserHelper.doInjectUser( user, Global.users() );
        };

    }

} );