"use strict";

// The output of this program should match the output of the TrueSkill
// calculator at:
//
//   http://atom.research.microsoft.com/trueskill/rankcalculator.aspx
//
// (Select game mode "custom", create 4 players each on their own team,
// check the second "Draw?" box to indicate a tie for second place,
// then click "Recalculate Skill Level Distribution".  The mu and sigma
// values in the "after game" section should match what this program
// prints.

// The objects we pass to AdjustPlayers can be anything with skill and
// rank attributes.

// Create four players.  Assign each of them the default skill.  The
// player ranking (their "level") is mu-3*sigma, so the default skill
// value corresponds to a level of 0.

var sigma = (25.0 / 3.0);
var user1 = {skill: [20.0, sigma], rank: 1, userId: 1},
    user2 = {skill: [23.0, sigma], rank: 1, userId: 2},
    user3 = {skill: [27.0, sigma], rank: 1, userId: 3},
    user4 = {skill: [30.0, sigma], rank: 1, userId: 4},
    user5 = {skill: [25, sigma], rank: 2, userId: 5},
    user6 = {skill: [25, sigma], rank: 2, userId: 6},
    user7 = {skill: [25, sigma], rank: 2, userId: 7},
    user8 = {skill: [25, sigma], rank: 2, userId: 8};

// Do the computation to find each player's new skill estimate.

var trueskill = require( "trueskill" );
trueskill.AdjustPlayers( [user1, user2, user3, user4, user5, user6, user7, user8] );

// Print the results.

console.log( "user1", user1 );
console.log( "user2", user2 );
console.log( "user3", user3 );
console.log( "user4", user4 );
console.log( "user5", user5 );
console.log( "user6", user6 );
console.log( "user7", user7 );
console.log( "user8", user8 );