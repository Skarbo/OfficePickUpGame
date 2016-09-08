"use strict";

var Promise = require( "promise" ),
    OPUGApi = require( "../../../server/lib/opug_api" ),
    Util = require( "../../../server/util/util" ),
    ErrorCodes = require( "../../../server/lib/error_codes" );

function UserHandlerTest() {

    /**
     * @type {OPUGApi}
     */
    var opugApi;

    this.setUp = function ( callback ) {
        opugApi = new OPUGApi( {
            dbHost: "localhost",
            dbUser: "root",
            dbPassword: "",
            dbDatabase: "opug_test"
        } );

        opugApi.doInit().then( function () {
            callback();
        }, function ( err ) {
            console.error( "Could not init OPUG", err.stack );
        } );
    };

    this.tearDown = function ( callback ) {
        opugApi.doRemoveAll( function ( err ) {
            if ( err ) {
                console.error( "Could not remove all", err, err.stack );
            }

            opugApi.doEndDatabaseConnection();
            callback();
        } );
    };

    // USER

    this.shouldAddUser = function ( test ) {
        var userEmail = "user@email.com",
            userName = "User Name",
            userImage = "http://image.jpg";

        opugApi.userHandler.doAddUser( userEmail, userName, userImage )
            .done( function ( user ) {
                test.ok( user );
                test.equal( user.email, userEmail );
                test.equal( user.name, userName );
                test.equal( user.image, userImage );
                test.done();
            }, function ( err ) {
                console.error( "shouldAddUser", err, err.stack || err.error && err.error.stack );
                test.equals( err, null );
                test.done();
            } );

    };

    // /USER

    // LOGIN

    this.shouldLoginUser = function ( test ) {
        var email = "kris.skarbo@gmail.com";

        opugApi.userHandler.loginUser( email )
            .done( function ( user ) {
                test.ok( user );
                test.equal( user.email, email );
                test.done();
            }, function ( err ) {
                console.error( "shouldLoginUser", err, err.stack || err.error && err.error.stack );
                test.equals( err, null );
                test.done();
            } );

    };

    this.shouldNotLoginUnknownUser = function ( test ) {
        var email = "unknown@knowit.no";

        opugApi.userHandler.loginUser( email )
            .done( function ( user ) {
                test.equal( user, undefined );
                test.done();
            }, function ( err ) {
                test.equals( err.code, ErrorCodes.CANDIDATE_DOES_NOT_EXIST );
                test.done();
            } );
    };

    // /LOGIN

    // REGISTER ID

    this.shouldAddUserRegisterId = function ( test ) {
        var userName = "User Name",
            userEmail = "user@email.com",
            registerId = "123-456-789",
            registerName = "testing";

        opugApi.userHandler.doAddUser( userEmail, userName )
            .then( function ( addedUser ) {
                test.ok( addedUser );

                return opugApi.userHandler.doAddOrRemoveUserDevice( addedUser.id, registerId, false, {
                    name: registerName
                } );
            } )
            .done( function ( updatedUser ) {
                test.ok( updatedUser );
                test.equal( Util.getProperty( updatedUser.devices, registerId, "name" ), registerName );
                test.done();
            }, function ( err ) {
                console.error( "shouldAddUserRegisterId", err, err.stack || err.error && err.error.stack );
                test.equals( err, undefined );
                test.done();
            } );
    };

    this.shouldRemoveUserRegisterId = function ( test ) {
        var userName = "User Name",
            userEmail = "user@email.com",
            registerId = "123-456-789",
            userRegisterIds = {};

        userRegisterIds[registerId] = {
            registerName: "testing"
        };

        opugApi.userHandler.doAddUser( userName, userEmail )
            .then( function ( user ) {
                test.ok( user );

                return opugApi.userHandler.doUpdateUser( user.id, {
                    registerIds: userRegisterIds
                } );
            } )
            .then( function ( addedUser ) {
                test.ok( addedUser );
                test.notEqual( Util.getProperty( addedUser.devices, registerId ), null );

                return opugApi.userHandler.doAddOrRemoveUserDevice( addedUser.id, registerId, true, null );
            } )
            .done( function ( updatedUser ) {
                test.ok( updatedUser );
                test.equal( Util.getProperty( updatedUser.devices, registerId ), null );
                test.done();
            }, function ( err ) {
                console.error( "shouldRemoveUserRegisterId", err, err.stack || err.error && err.error.stack );
                test.equals( err, null );
                test.done();
            } );
    };

    // /REGISTER ID

    // GROUPS

    this.shouldSetUserGroups = function ( test ) {
        var userName = "User Name",
            userEmail = "user@email.com",
            userGroups = ["Group1"];

        opugApi.userHandler.doAddUser( userName, userEmail )
            .then( function ( user ) {
                test.ok( user );

                return opugApi.userHandler.doUpdateUser( user.id, {
                    groups: userGroups
                } );
            } )
            .then( function ( user ) {
                test.ok( user );

                return opugApi.userHandler.doSetUserGroups( user.id, user.groups.concat( "Group2" ) );
            } )
            .done( function ( updatedUser ) {
                test.ok( updatedUser );
                test.equal( updatedUser.groups.join( "," ), "Group1,Group2" );
                test.done();
            }, function ( err ) {
                console.error( "shouldSetUserGroups", err, err.stack || err.error && err.error.stack );
                test.equals( err, null );
                test.done();
            } );
    };

    // /GROUPS

}

module.exports = new UserHandlerTest();