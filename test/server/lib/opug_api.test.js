"use strict";

var Promise = require( "promise" ),
    DatabaseHelper = require( "../../../server/helper/database_helper" ),
    OPUGApi = require( "../../../server/lib/opug_api" );

function OpugApiTest() {

    /**
     * @type {OPUGApi}
     */
    var opugApi;

    var GAME_ID = "game";

    /**
     * @type {OPUGApi}
     */
    var opugApi;

    this.setUp = function ( callback ) {
        opugApi = new OPUGApi( {
            dbDatabase: "opug_test"
        } );

        function addPugGamePromise() {
            return new Promise( function ( fulfill, reject ) {
                var addPugGameSql = squel.insert()
                    .into( DatabaseHelper.PUG_GAMES_TABLE )
                    .set( DatabaseHelper.PUG_GAMES_FIELDS.PUG_GAME_ID, GAME_ID )
                    .set( DatabaseHelper.PUG_GAMES_FIELDS.PUG_GAME_TITLE, "Game" )
                    .toParam();

                opugApi.dbConnection.query( addPugGameSql.text, addPugGameSql.values, function ( err ) {
                    if ( err ) {
                        reject( err );
                    }
                    else {
                        fulfill();
                    }
                } );
            } );
        }

        Promise.denodeify( opugApi.doInit )()
            .then( addPugGamePromise )
            .done( function () {
                opugApi.pugHandler.pugGames.push( {
                    id: GAME_ID,
                    title: "Game"
                } );

                callback();
            }, function ( err ) {
                console.error( "Error while init OPUG", err, err.stack );
                callback();
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

    this.shouldCreateDatabase = function ( test ) {
        test.notEqual( opugApi.dbConnection, null );
        test.done();
    };
}

module.exports = new OpugApiTest();