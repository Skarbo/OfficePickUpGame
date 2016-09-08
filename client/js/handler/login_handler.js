"use strict";

define( [
    "lib/promise",
    "lib/global",
    "util/util",
    "vm/user_vm",
    "helper/user_helper"
], function ( Promise, Global, Util, UserVm, UserHelper ) {

    function LoginHandler() {

        var REGEX_EMAIL_VALID = /[^\s@]+@[^\s@]+\.[^\s@]+/;
        var API_ERROR_USER_NOT_EXIST = "USER_DOES_NOT_EXIST",
            API_ERROR_NOT_LOGGED_IN = "USER_NOT_LOGGED_IN";
        var KEY_STORE_USERID = "id",
            KEY_STORE_EMAIL = "email";

        var self = this;

        /**
         * @returns {Promise}
         */
        this.isLoggedIn = function () {
            function checkForUserIdAndEmailPromise() {
                return new Promise( function ( fulfill, reject ) {
                    var userStore = Global.userStore();

                    if ( !userStore ) {
                        reject( {
                            error: "No user stored"
                        } );
                        return;
                    }

                    var userStoreObject = JSON.parse( userStore ),
                        userId = userStoreObject[KEY_STORE_USERID],
                        userEmail = userStoreObject[KEY_STORE_EMAIL];

                    if ( !userId || !userEmail ) {
                        reject( {
                            error: "User id or user email not stored"
                        } );
                        return;
                    }

                    fulfill( {userId: userId, userEmail: userEmail} );
                } );
            }

            return new Promise( function ( fulfill, reject ) {
                checkForUserIdAndEmailPromise()
                    .then( function ( result ) {
                        return Global.kpugApi.isUserLoggedIn( result.userId, result.userEmail );
                    } )
                    .then( function ( user ) {
                        var userVm = new UserVm( user );
                        self.doSetLoggedInUser( userVm );
                        return userVm;
                    } )
                    .done( function ( userVm ) {
                        fulfill( userVm );
                    }, function ( err ) {
                        self.doLogout();

                        reject( $.extend( err, {
                            message: "Not logged in",
                            code: LoginHandler.ERROR_NOT_LOGGED_IN,
                            error: err
                        } ) );
                    } );
            } );
        };

        /**
         * @param {UserVm} userVm
         */
        this.doSetLoggedInUser = function ( userVm ) {
            Global.userId = userVm.id;
        };

        /**
         * @param {String} email
         * @param {Function} callback
         */
        this.doLogin = function ( email, callback ) {
            if ( !REGEX_EMAIL_VALID.test( email ) ) {
                callback( {
                    message: "Email is invalid",
                    code: LoginHandler.ERROR_EMAIL_INVALID
                } );
                return;
            }

            Global.kpugApi.doLoginUser( email )
                .then( function ( user ) {
                    // user must exist
                    if ( !user ) {
                        return Promise.reject( {
                            code: LoginHandler.ERROR_USER_NOT_EXIST
                        } );
                    }

                    // store User
                    if ( !doStoreUser( user.id, user.email ) ) {
                        return Promise.reject( {
                            error: "Could not store user"
                        } );
                    }

                    return user;
                } )
                .done( function ( user ) {
                    callback( null, user );
                }, function ( err ) {
                    callback( $.extend( {}, {
                        message: "Could not login",
                        code: LoginHandler.ERROR_LOGIN,
                        error: err
                    }, err ) );
                } );
        };

        this.doLogout = function () {
            Global.userId = null;
            doUnStoreUser();
        };

        /**
         * @param {String} userId
         * @param {String} userEmail
         * @returns {boolean} True if user is stored
         */
        function doStoreUser( userId, userEmail ) {
            var userStore = JSON.stringify( {
                id: userId,
                email: userEmail
            } );

            Global.userStore( userStore );

            return true;
        }

        function doUnStoreUser() {
            Global.userStore( null );
        }

    }

    LoginHandler.ERROR_LOGIN = "error_login";
    LoginHandler.ERROR_EMAIL_INVALID = "error_email_invalid";
    LoginHandler.ERROR_USER_NOT_EXIST = "error_user_not_exist";
    LoginHandler.ERROR_NOT_LOGGED_IN = "error_not_logged_in";
    LoginHandler.ERROR_IS_LOGGED_IN = "error_is_logged_in";

    return LoginHandler;

} )
;