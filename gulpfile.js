/**
 * starter-vanilla
 * gulpfile.js
 */

var browserify = require('browserify'),
      watchify = require('watchify'),
      babelify = require("babelify"),
          gulp = require('gulp'),
        source = require('vinyl-source-stream'),
        buffer = require('vinyl-buffer'),
    sourcemaps = require('gulp-sourcemaps'),
         gutil = require('gulp-util'),
        uglify = require('gulp-uglify'),
           del = require('del'),
          sass = require('gulp-sass'),
  autoprefixer = require('gulp-autoprefixer'),
        concat = require('gulp-concat'),
   browserSync = require('browser-sync');


/**
 * Task - Default (Watch)
 */
gulp.task('default', ['watch']);


/**
 * Task - Build
 */
gulp.task('build', [
    'clean',
    'browserify',
    'index',
    'sass',
    'assets'
]);


/**
 * Task - Watch
 */
gulp.task('watch', [
    'clean',
    'watchTask',
    'watchify',
    'index',
    'sass',
    'assets'
], function () {
    gulp.start(['browserSync']);
});


/**
 * Task - Browserify
 */
gulp.task('browserify', function () {

    var bundler = browserify('./src/app.js', {debug:true});

    // Transforms go here
    // e.g. bundler.transform(reactify);
    bundler.transform(babelify);

    return bundler.bundle()
        .pipe( source('bundle.js') )
        .pipe( buffer() )
        .pipe( sourcemaps.init({loadMaps: true}) )
            .pipe( uglify() )
            .on('error', gutil.log)
        .pipe( sourcemaps.write('./') )
        .pipe( gulp.dest('./dist') );
});


/**
 * Task - Watchify
 */
gulp.task('watchify', function () {

    var options = watchify.args;
    options.debug = true;

    var bundler = watchify( browserify('./src/app.js', options) );

    // Transforms go here
    // e.g. bundler.transform(reactify);
    bundler.transform(babelify);

    function rebundle () {
        return bundler.bundle()
            .on('error', gutil.log)
            .pipe( source('bundle.js') )
            .pipe( buffer() )
            .pipe( sourcemaps.init({loadMaps: true}) )
            .pipe( sourcemaps.write('./') )
            .pipe( gulp.dest('./dist') )
            .pipe( browserSync.stream() );
    }

    bundler.on('update', rebundle);
    return rebundle();
});


/**
 * Task - BrowserSync
 */
gulp.task('browserSync', function () {

    browserSync({
        browser: 'google chrome canary',
        online: false,
        logSnippet: false,
        notify: false,
        ghostMode: false,
        server: {
            baseDir: './dist'
        }
    });
});


/**
 * Task - WatchTask
 */
gulp.task('watchTask', function () {

    gulp.watch('./src/index.html', ['index']);
    gulp.watch('./src/assets/**/*.*', ['assets']);
    gulp.watch('./src/sass/**/*.scss', ['sass']);
});


/**
 * Task - Index
 */
gulp.task('index', function () {

    return gulp.src('./src/index.html')
        .pipe( gulp.dest('./dist') )
        .pipe( browserSync.stream() );
});


/**
 * Task - Sass
 */
gulp.task('sass', function () {

    return gulp.src('./src/sass/*.scss')
        .pipe( sourcemaps.init() )
            .pipe( sass({
                outputStyle: 'compressed',
                errLogToConsole: true
            }) )
            .on('error', function(err) {
                  console.error(err.toString());
                  this.emit('end');
            })
            .pipe( autoprefixer() )
            .pipe( concat('app.css') )
        .pipe( sourcemaps.write('./') )
        .pipe( gulp.dest('./dist') )
        .pipe( browserSync.stream({match: '**/*.css'}) );
});


/**
 * Task - Assets
 */
gulp.task('assets', function () {

    return gulp.src('./src/assets/**/*.*')
        .pipe( gulp.dest('./dist/assets') )
        .pipe( browserSync.stream() );
});


/**
 * Task - Clean
 */
gulp.task('clean', function (cb) {

    del.sync(['dist']);
    cb(null);
});