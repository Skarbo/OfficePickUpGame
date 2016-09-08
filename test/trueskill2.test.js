"use strict";

var trueskill = require( 'trueskill' );

var sigma = 25 / 3;
var env = new trueskill.TrueSkill( {
    mu: 25,
    sigma: sigma,
    beta: 25 / 6,
    tau: 25 / 300,
    draw: 0.1
} );

var r1 = new trueskill.Rating( 25, sigma ),
    r2 = new trueskill.Rating( 25, sigma ),
    r3 = new trueskill.Rating( 25, sigma ),
    r4 = new trueskill.Rating( 25, sigma );

var newRatings = env.transformRatings(
    [
        {'p1': r1, 'p2': r2},
        {'p3': r3, 'p4': r4}
    ],
    [2, 1] );

console.log( "NewRatings", newRatings );

var quality = env.matchQuality(
    [
        {'p1': r1, 'p2': r2},
        {'p3': r3, 'p4': r4}
    ] );

console.log( "Quality", quality );