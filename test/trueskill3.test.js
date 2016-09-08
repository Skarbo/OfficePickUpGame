"use strict";

var
//Create TrueSkill instance with default parameters
    trueSkill = require( 'com.izaakschroeder.trueskill' ).create(),
//Create some players
    players = [{
        name: 'Justin',
        rating: trueSkill.createRating()
    }, {
        name: 'James',
        rating: trueSkill.createRating()
    }, {
        name: 'Karnal',
        rating: trueSkill.createRating()
    }, {
        name: 'Arbab',
        rating: trueSkill.createRating()
    }, {
        name: 'Max',
        rating: trueSkill.createRating()
    }, {
        name: 'Mannan',
        rating: trueSkill.createRating()
    }, {
        name: 'Justin2',
        rating: trueSkill.createRating()
    }, {
        name: 'James2',
        rating: trueSkill.createRating()
    }, {
        name: 'Karnal2',
        rating: trueSkill.createRating()
    }, {
        name: 'Arbab2',
        rating: trueSkill.createRating()
    }];

//Play a single match and update the player ratings
function playMatch( results ) {
    //Create the teams
    var teams = [
        [players[0].rating, players[1].rating, players[2].rating, players[3].rating, players[4].rating],
        [players[5].rating, players[6].rating, players[7].rating]
    ];
    //Get the new ratings using the results
    var newRatings = trueSkill.update( teams, results );
    console.log( "new ratings", newRatings );
    ////Update the player's rating
    //for ( var i = 0; i < teams.length; i++ ) {
    //    players[i * 5].rating = newRatings[i][0];
    //    players[(i * 5) + 1].rating = newRatings[i][1];
    //    players[(i * 5) + 2].rating = newRatings[i][2];
    //    players[(i * 5) + 3].rating = newRatings[i][3];
    //    players[(i * 5) + 4].rating = newRatings[i][4];
    //}
    //console.log( "players", players );
}

//Show initial ratings
console.log( 'Initial ratings: ' + players.map( function ( p ) {
        return p.name + ' = ' + p.rating.mu;
    } ).join( ', ' ) );

//Play some games
playMatch( [0, 1] );
//playMatch( [1, 0] );
//playMatch( [0, 0] );

//Show final ratings
console.log( 'After ratings: ' + players.map( function ( p ) {
        return p.name + ' = ' + Math.round( p.rating.mu );
    } ).join( ', ' ) );

