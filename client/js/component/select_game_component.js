"use strict";

define( [
    "knockout",
    "lib/knockout_util",
    "lib/asset",
    "component/input_component",
    "helper/game_helper"
], function ( knockout, KnockoutUtil, Asset, InputComponent, GameHelper ) {

    /**
     * @param {Object} options
     * @param {observable|boolean} [options.disabled]
     * @param {observable|String} [options.error]
     * @constructor
     */
    function SelectGameComponent( options ) {

        var self = this;
        var disabled = KnockoutUtil.observable( options.disabled, false );
        var games_;

        this.games = knockout.observableArray();
        this.checked = knockout.observable( null );
        this.hasFocus = knockout.observable( false );
        this.error = KnockoutUtil.observable( options.error, "" );
        this.otherInput = new InputComponent( {
            placeholder: "Specify game",
            disabled: disabled,
            tip: "Specify which game to play",
            hidden: true
        } );

        this.warningIcon = Asset.svg.warning;

        this.showError = knockout.computed( function () {
            return !!self.error();
        } );

        this.doBuild = function ( $wrapper ) {
            self.$wrapper = $wrapper;
            self.otherInput.doBuild( self.$wrapper.find( "input" ) );
        };

        function onGameChanged( gameId ) {
            var game = GameHelper.getGameFromId( gameId, games_ );

            self.error( "" );

            if ( game && game.other ) {
                self.otherInput.hidden( false );
                self.otherInput.hasFocus( true );
            }
            else {
                self.otherInput.hidden( true );
            }
        }

        this.doShow = function ( value, games ) {
            games_ = games;
            self.checked( value || "" );
            self.otherInput.doShow( "" );

            self.games( games.map( function ( game ) {
                var game_ = game;
                return {
                    checked: self.checked,
                    hasFocus: self.hasFocus,
                    disabled: disabled,
                    onClick: function () {
                        self.checked( game_.id );
                    },
                    icon: game.src,
                    text: game.title,
                    value: game.id
                };
            } ) );
        };

        this.doScroll = function () {
            self.$wrapper[0].scrollIntoView( true );
        };

        //

        self.checked.subscribe( onGameChanged );

    }

    return SelectGameComponent;

} );