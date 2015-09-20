/**
 * starter-vanilla
 * gulpfile.js
 */

import gulp from 'gulp';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import del from 'del';
import {argv} from 'yargs';
import browserify from 'browserify';
import watchify from 'watchify';
import babelify from 'babelify';
import browserSync from 'browser-sync';

const $ = require('gulp-load-plugins')();

/**
 * Config
 *
 * @type {Object}
 */
const config = {
    dev: !argv.production,
    bsBrowser: 'google chrome canary',
    bsProxyServer: null
};

/**
 * Default Task
 * Alias for "watch" task.
 */
gulp.task('default', ['watch']);

/**
 * Build Task
 * Build app.
 */
gulp.task('build', ['clean', 'browserify', 'sass', 'assets', 'index']);

/**
 * Watch Task
 * Build app, open browser with browser-sync, watch for changes
 * to source files and reload browser.
 */
gulp.task('watch', ['clean', 'watch:task', 'watchify', 'sass', 'assets', 'index'], browserSyncTask);

/**
 * Browserify Task
 * Run browserify to compile javascript.
 */
gulp.task('browserify', () => {
    let bundler = browserify('./src/app.js', { debug: config.dev });

    // Transforms
    bundler.transform(babelify);

    return bundler.bundle()
        .pipe($.plumber({ errorHandler: onError }))
        .pipe(source('bundle.js'))
        .pipe(buffer())
        .pipe($.if(config.dev, $.sourcemaps.init({ loadMaps: true })))
            .pipe($.uglify())
        .pipe($.if(config.dev, $.sourcemaps.write('./')))
        .pipe(gulp.dest('./dist'));
});

/**
 * Watchify Task
 * Run browserify to compile javascriptand watch for
 * changes using watchify to reduce compile time.
 */
gulp.task('watchify', () => {
    let options = watchify.args;
    options.debug = true;

    var bundler = watchify(browserify('./src/app.js', options));

    // Transforms
    bundler.transform(babelify);

    function rebundle () {
        return bundler.bundle()
            .on('error', onError)
            .pipe(source('bundle.js'))
            .pipe(buffer())
            .pipe($.sourcemaps.init({ loadMaps: true }))
            .pipe($.sourcemaps.write('./'))
            .pipe(gulp.dest('./dist'))
            .pipe(browserSync.stream());
    }

    bundler.on('update', rebundle);
    return rebundle();
});


/**
 * Watch Task
 * Start watching for changesto relevant files.
 */
gulp.task('watch:task', () => {
    gulp.watch('./src/index.html', ['index']);
    gulp.watch('./src/assets/**/*.*', ['assets']);
    gulp.watch('./src/sass/**/*.scss', ['sass']);
});

/**
 * Sass Task
 * Process sass und inject changes into browser via  browser-sync.
 */
gulp.task('sass', () => {
    return gulp.src('src/sass/*.scss', {})
        .pipe($.if(config.dev, $.sourcemaps.init()))
            .pipe($.plumber({ errorHandler: onError }))
            .pipe($.sass({ outputStyle: 'compressed' }))
            .pipe($.autoprefixer())
            .pipe($.concat('app.css'))
        .pipe($.if(config.dev, $.sourcemaps.write('./')))
        .pipe(gulp.dest('./dist'))
        .pipe(browserSync.stream({ match: '**/*.css' }));
});

/**
 * Assets Task
 * Optimize assets and copy them to the "dist" directory.
 */
gulp.task('assets', () => {
    return gulp.src('./src/assets/**/*.*')
        .pipe($.plumber({ errorHandler: onError }))
        .pipe($.imagemin({ optimizationLevel: 4, progressive: true }))
        .pipe(gulp.dest('./dist/assets'))
        .pipe(browserSync.stream());
});

/**
 * Index Task
 * Copy the index.html file to the "dist" directory.
 */
gulp.task('index', () => {
    return gulp.src('src/index.html')
        .pipe(gulp.dest('dist'))
        .pipe(browserSync.stream());
});

/**
 * Prepare Revision Task
 * Create versioned versions of js / css files in "dist" directory
 * and create a "rev-manifest.json" file.
 */
gulp.task('revision:prepare', () => {
    return gulp.src(['dist/*.css', 'dist/*.js'])
        .pipe($.rev())
        .pipe(gulp.dest('dist'))
        .pipe($.rev.manifest())
        .pipe(gulp.dest('dist'));
});

/**
 * Revision Task
 * Replace mentions of static assets that are present in the
 * "rev-manifest.json" file.
 */
gulp.task('revision', ['revision:prepare'], () => {
    let manifest = gulp.src('dist/rev-manifest.json');

    return gulp.src('dist/index.html')
        .pipe($.revReplace({ manifest: manifest }))
        .pipe(gulp.dest('dist'));
});

/**
 * Clean Task
 * Remove files / folders in "dist" directory.
 */
gulp.task('clean', (cb) => {
    del.sync(['dist']);
    cb();
});

/**
 * List Task
 * Liast all tasks.
 */
gulp.task('list', $.taskListing);

/**
 * Start browser-sync
 *
 * @return {void}
 */
function browserSyncTask () {
    var bsOptions = {
        browser: config.bsBrowser || 'google chrome',
        online: false,
        logSnippet: false,
        notify: false,
        ghostMode: false,
        server: {
            baseDir: './dist'
        }
    };

    if (config.bsProxyServer) {
        bsOptions.proxy = config.bsProxyServer;
        delete bsOptions.server;
    }

    browserSync(bsOptions);
}

/**
 * gulp-plumber error handler
 *
 * @param  {string} err
 *
 * @return {this}
 */
function onError (err) {
    $.util.beep();
    $.util.log($.util.colors.red(err));
    this.emit('end');
    return this;
}