"use strict";

define( [], function () {

    var PlayerHelper = {};

    /**
     * @param {number} userId
     * @param {PugVm} pugVm
     * @returns {boolean} True if Pug contains user id as player
     */
    PlayerHelper.isUserInPug = function ( userId, pugVm ) {
        var players = pugVm.players();
        for ( var i in  players ) {
            if ( players[i].userId == userId ) {
                return true;
            }
        }
        return false;
    };

    /**
     * @param {PugPlayerForm} playerForm
     * @returns {{result, type}}
     */
    PlayerHelper.createPlayerFormResultAndType = function ( playerForm ) {
        var result = (function () {
            if ( playerForm.standing[0] == 0 ) {
                return "D";
            }
            if ( playerForm.standing[1] == 2 ) {
                if ( playerForm.standing[0] == 1 ) {
                    return "W";
                }
                if ( playerForm.standing[0] == 2 ) {
                    return "L";
                }
            }
            return playerForm.standing[0] + "/" + playerForm.standing[1];
        })();

        var type = (function () {
            if ( playerForm.standing[0] == 0 ) {
                return 1;
            }

            var bla = [];
            switch ( playerForm.standing[1] ) {
                case 2:
                    bla = [1, 2, 0.5];
                    break;
                case 3:
                    bla = [1, 0.6, 0.3];
                    break;
            }

            var res = playerForm.standing[0] / playerForm.standing[1];

            for ( var i = 0; i < bla.length; i++ ) {
                if ( res >= bla[i] ) {
                    return i;
                }
            }

            return 1;
        })();

        return {
            pugId: playerForm.pugId,
            form: playerForm,
            result: result,
            type: type
        };
    };

    return PlayerHelper;

} );