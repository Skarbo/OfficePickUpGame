"use strict";

var ASSETS_CANDIDATES = __dirname + "/../../assets/candidates.json";

var nett = require( "nett" ),
    Promise = require( "promise" ),
    fs = require( "fs" ),
    md5 = require( "blueimp-md5" ).md5,
    PHPUnserialize = require( 'php-unserialize' ),
    Util = require( '../util/util' );

/**
 * @typedef {Object} Candidate
 * @property {String} email
 * @property {String} name
 * @property {String} image
 */

/**
 * @constructor
 */
function CandidateHandler() {

    var URL_CANDIDATES_KNOWIT = "http://www.knowit.no/KnowitServices/ContactsService.svc/GetAllContacts?&langCode=no";

    var self = this;

    /**
     * @param {String} email
     * @param {Function} callback
     */
    this.doGetCandidateFromEmail = function ( email, callback ) {
        self.doGetCandidateFromAssetEmail( email )
            .then( function ( candidate ) {
                if ( candidate ) {
                    callback( null, candidate );
                }
                else {
                    return self.doGetCandidateFromKnowitEmail( email );
                }
            } )
            .then( function ( candidate ) {
                if ( candidate ) {
                    callback( null, candidate );
                }
                else {
                    return self.doGetCandidateFromKnowitEmail( email );
                }
            } )
            .then( function ( candidate ) {
                if ( candidate ) {
                    callback( null, candidate );
                }
                else {
                    return self.doGetCandidateFromGravatarEmail( email );
                }
            } )
            .done( function ( candidate ) {
                callback( null, candidate || null );
            }, function ( err ) {
                callback( err );
            } );
    };

    /**
     * @param {String} email
     * @returns {Promise}
     */
    this.doGetCandidateFromGravatarEmail = function ( email ) {
        email = email || "";
        email = email.toLowerCase().trim();

        var emailHashed = md5( email ),
            gravatarUrl = "https://www.gravatar.com/" + emailHashed + ".php";

        var createGravatarCandidateFunc = function ( gravatarProfile ) {
            if ( !Util.getProperty( gravatarProfile, "entry", 0 ) ) {
                return null;
            }

            return {
                name: Util.getProperty( gravatarProfile, "entry", 0, "displayName" )
                || Util.getProperty( gravatarProfile, "entry", 0, "name", "formatted" )
                || Util.getProperty( gravatarProfile, "entry", 0, "name", "givenName" ) + " " + Util.getProperty( gravatarProfile, "entry", 0, "name", "familyName" ),
                image: Util.getProperty( gravatarProfile, "entry", 0, "thumbnailUrl" ),
                email: email
            };
        };

        return new Promise( function ( fulfill, reject ) {
            nett.get( gravatarUrl )
                .then( function ( response ) {
                    return createGravatarCandidateFunc( PHPUnserialize.unserialize( response ) );
                } ).done( function ( candidate ) {
                    fulfill( candidate );
                }, function ( err ) {
                    reject( {
                        message: "Error while getting candidate from Gravatar email '" + email + "'",
                        error: err
                    } );
                } );
        } );
    };

    /**
     * @param {String} email
     * @returns {Promise}
     */
    this.doGetCandidateFromKnowitEmail = function ( email ) {
        email = email || "";
        email = email.toLowerCase().trim();

        return new Promise( function ( fulfill, reject ) {
            Promise.denodeify( self.retrieveKnowitCandidates )()
                .then( function ( candidates ) {
                    return candidates.filter( function ( candidate ) {
                            return candidate.email === email;
                        } )[0] || null;
                } )
                .done( function ( candidate ) {
                    fulfill( candidate );
                }, function ( err ) {
                    reject( {
                        message: "Could not get Knowit candidate from email '" + email + "'",
                        error: err
                    } );
                } );
        } );
    };

    /**
     * @param {String} email
     * @returns {Promise}
     */
    this.doGetCandidateFromAssetEmail = function ( email ) {
        email = email || "";
        email = email.toLowerCase().trim();

        return new Promise( function ( fulfill, reject ) {
            Promise.denodeify( fs.readFile )( ASSETS_CANDIDATES, "UTF-8" )
                .then( function ( result ) {
                    return JSON.parse( result );
                } )
                .then( function ( candidates ) {
                    return candidates.filter( function ( candidate ) {
                            return candidate.email === email;
                        } )[0] || null;
                } )
                .done( function ( candidate ) {
                    fulfill( candidate );
                }, function ( err ) {
                    reject( {
                        message: "Could not get Asset candidate from email '" + email + "'",
                        error: err
                    } );
                } );
        } );
    };

    this.retrieveKnowitCandidates = function ( callback ) {
        var createCandidateFunc = function ( knowitCandidate ) {
            return {
                email: knowitCandidate["Email"] ? knowitCandidate["Email"].toLowerCase().trim() : null,
                name: knowitCandidate["Name"],
                image: "http://www.knowit.no/" + knowitCandidate["Image"]
            };
        };

        nett.get( URL_CANDIDATES_KNOWIT )
            .then( function ( response ) {
                return (response["Items"] || [])
                    .map( createCandidateFunc )
                    .filter( function ( candidate ) {
                        return !!candidate.email;
                    } );
            } )
            .done( function ( candidates ) {
                callback( null, candidates );
            }, function ( err ) {
                callback( {
                    message: "Error while retrieving Knowit candidates",
                    error: err
                } );
            } );
    };

}

module.exports = CandidateHandler;