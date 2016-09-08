var gulp = require( 'gulp' );
var compass = require( 'gulp-compass' );
var path = require( 'path' );

//gulp.task( 'compass', function () {
//    gulp.src( './src/scss/*.scss' )
//        .pipe( compass( {
//            project: __dirname,
//            css: './client/css'
//        } ) )
//        .pipe( gulp.dest( 'tmp' ) );
//} );

gulp.task( 'compass', function () {
    gulp.src( './src/scss/*.scss' )
        .pipe( compass( {
            config_file: './config.rb',
            css: './client/css/',
            sass: './src/scss'
        } ) )
        .pipe( gulp.dest( './tmp' ) );
} );