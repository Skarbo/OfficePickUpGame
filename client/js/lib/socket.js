define( ["socketio"], function ( io ) {

    //var socket = io.connect( location.protocol + "//" + location.host, {
    //    secure: /https/.test( location.protocol )
    //} );
    var socket = io.connect( "http://kristoffers-mbp:8200", {
        secure: false
    } );

    return socket;

} );