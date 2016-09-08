"use strict";

/**
 * @typedef {Object} PugCommentVm
 * @property {Number} id
 * @property {Number} pugId
 * @property {Number} userId
 * @property {String} message
 * @property {String} messageHtml
 * @property {Date} created
 */

define( [
    "lib/markdown",
    "lib/global",
    "helper/user_helper",
    "helper/pug_helper"
], function ( markdown, Global, UserHelper, PugHelper ) {

    /**
     * @param {PugComment} comment
     * @constructor
     */
    function PugCommentVm( comment ) {

        var self = this;

        this.id = comment.id;
        this.pugId = comment.pugId;
        this.userId = comment.userId;
        this.message = comment.message;
        this.created = new Date( comment.created );
        this.messageHtml = markdown.toHTML( self.message );

        /**
         * @type {UserShortVm}
         */
        this.user = UserHelper.createUserShort( comment.userId, comment.userName, comment.userImage );

        /**
         * @returns {PugVm}
         */
        this.getPug = function () {
            return PugHelper.getPugFromId( self.pugId, Global.pugs() );
        };

    }

    return PugCommentVm;

} );