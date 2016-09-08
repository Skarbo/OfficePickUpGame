"use strict";

var Promise = require( "promise" ),
    OPUGApi = require( "../../../server/lib/opug_api" ),
    Util = require( "../../../server/util/util" );

function CandidateHandlerTest() {

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

        opugApi.doInit( function ( err ) {
            if ( err ) {
                console.error( "Could not init OPUG", err.stack || err.error && err.error.stack );
            }

            callback();
        } );
    };

    this.tearDown = function ( callback ) {
        opugApi.doRemoveAll( function ( err ) {
            if ( err ) {
                console.error( "Could not remove all", err, err.stack || err.error && err.error.stack );
            }

            opugApi.doEndDatabaseConnection();
            callback();
        } );
    };

    this.shouldRetrieveKnowitCandidates = function ( test ) {
        Promise.denodeify( opugApi.candidateHandler.retrieveKnowitCandidates )()
            .done( function ( candidates ) {
                test.equal( candidates.length > 0, true );
                test.equal( !!Util.getProperty( candidates, 0, "email" ), true );
                test.equal( !!Util.getProperty( candidates, 0, "name" ), true );
                test.equal( !!Util.getProperty( candidates, 0, "image" ), true );
                test.done();
            }, function ( err ) {
                console.error( "shouldRetrieveKnowitCandidates", err, err.stack || err.error && err.error.stack );
                test.equals( err, null );
                test.done();
            } );
    };

    this.shouldGetKnowitCandidateFromEmail = function ( test ) {
        var knowitEmail = "alexander.arnesen@knowit.no";

        Promise.denodeify( opugApi.candidateHandler.doGetCandidateFromKnowitEmail )( knowitEmail )
            .done( function ( candidate ) {
                test.ok( candidate );
                test.equal( Util.getProperty( candidate, "email" ), knowitEmail );
                test.done();
            }, function ( err ) {
                console.error( "shouldGetKnowitCandidateFromEmail", err, err.stack || err.error && err.error.stack );
                test.equals( err, null );
                test.done();
            } );
    };

    this.shouldNotGetKnowitCandidateFromUnknownEmail = function ( test ) {
        var knowitEmail = "test@email.no";

        Promise.denodeify( opugApi.candidateHandler.doGetCandidateFromKnowitEmail )( knowitEmail )
            .done( function ( candidate ) {
                test.equal( null, candidate );
                test.done();
            }, function ( err ) {
                console.error( "shouldNotGetKnowitCandidateFromUnknownEmail", err, err.stack || err.error && err.error.stack );
                test.equals( err, null );
                test.done();
            } );
    };

    this.shouldGetGravatarCandidateFromEmail = function ( test ) {
        var gravatarEmail = "kris.skarbo@gmail.com";

        Promise.denodeify( opugApi.candidateHandler.doGetCandidateFromGravatarEmail )( gravatarEmail )
            .done( function ( candidate ) {
                test.ok( candidate );
                test.equal( Util.getProperty( candidate, "email" ), gravatarEmail );
                test.done();
            }, function ( err ) {
                console.error( "shouldGetGravatarCandidateFromEmail", err, err.stack || err.error && err.error.stack );
                test.equals( err, null );
                test.done();
            } );
    };

    this.shouldGetCandidateFromEmail = function ( test ) {
        var email = "kris.skarbo@gmail.com";

        Promise.denodeify( opugApi.candidateHandler.doGetCandidateFromEmail )( email )
            .done( function ( candidate ) {
                test.ok( candidate );
                test.equal( Util.getProperty( candidate, "email" ), email );
                test.done();
            }, function ( err ) {
                console.error( "shouldGetCandidateFromEmail", err, err.stack || err.error && err.error.stack );
                test.equals( err, null );
                test.done();
            } );
    };
}

module.exports = new CandidateHandlerTest();