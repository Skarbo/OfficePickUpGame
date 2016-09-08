"use strict";

define( [
    "dom",
    "knockout",
    "interact",
    "lib/constant",
    "lib/global",
    "util/dom_util"
], function ( $, knockout, interact, Constant, Global, DomUtil ) {

    var pugCommentHelper = {};

    /**
     * @param {jQuery} $toastWrapper
     * @param {Array<PugCommentVm>} pugCommentVms
     */
    pugCommentHelper.doNotifyPugComments = function ( $toastWrapper, pugCommentVms ) {
        var pugCommentVmsToShow = [], u = {};
        pugCommentVms.forEach( function ( pugCommentVm ) {
            if ( !u.hasOwnProperty( pugCommentVm.pugId ) ) {
                pugCommentVmsToShow.push( pugCommentVm );
                u[pugCommentVm.pug_id] = 1;
            }
            else {
                u[pugCommentVm.pug_id]++;
            }
        } );

        for ( var i = 0; i < pugCommentVmsToShow.length; i++ ) {
            pugCommentHelper.doShowPugCommentToast( $toastWrapper, pugCommentVmsToShow[i], u[pugCommentVmsToShow[i].pug_id] );
        }
    };

    /**
     * @param {jQuery} $toastWrapper
     * @param {PugCommentVm} pugCommentVm
     * @param {number} [notifyCount]
     */
    pugCommentHelper.doShowPugCommentToast = function ( $toastWrapper, pugCommentVm, notifyCount ) {
        var $toast = $( "<pug-comment-toast />", {
            'tab-index': 0,
            'data-bind': "template: { name: 'pug-comment-toast' }"
        } );

        knockout.applyBindings( {
            pugComment: pugCommentVm,
            count: notifyCount && notifyCount > 1 ? notifyCount : null
        }, $toast[0] );

        $toastWrapper.append( $toast );

        setTimeout( function () {
            DomUtil.transition( $toast, "show", "show", Constant.TRANSITION.TOAST );
        }, 1 );

        setTimeout( doRemovePugCommentToast.bind( null, $toast ), Constant.TOAST.PUG );

        setTimeout( function () {
            $toast.one( "click", onToastClick.bind( null, pugCommentVm, $toast ) );
        }, 10 );
    };

    /**
     * @param {jQuery} $toast
     */
    function doRemovePugCommentToast( $toast ) {
        if ( !$.contains( document, $toast[0] ) ) {
            return;
        }

        if ( $toast ) {
            DomUtil.transition( $toast, "remove", null, Constant.TRANSITION.TOAST, function () {
                $toast.remove();
            } );
        }
    }

    /**
     * @param {PugCommentVm} pugCommentVm
     * @param {jQuery} $toast
     */
    function onToastClick( pugCommentVm, $toast ) {
        doRemovePugCommentToast( $toast );
        Global.pageHandler.doRedirectToPage( "pug/" + pugCommentVm.pug_id );
    }

    return pugCommentHelper;

} );