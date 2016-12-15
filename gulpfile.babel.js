/**
 * starter-vanilla
 * gulpfile.babel.js
 */

import pkg from './package.json'
import path from 'path'
import git from 'git-rev-sync'
import gulp from 'gulp'
import source from 'vinyl-source-stream'
import buffer from 'vinyl-buffer'
import del from 'del'
import autoprefixer from 'autoprefixer'
import { argv } from 'yargs'
import browserify from 'browserify'
import stringify from 'stringify'
import watchify from 'watchify'
import babelify from 'babelify'
import browserSync from 'browser-sync'
import cssImport from 'postcss-import'
import cssNested from 'postcss-nested'
import cssVars from 'postcss-simple-vars'

const $ = require('gulp-load-plugins')()

/**
 * Arguments
 */
const ARGS = {
    production: argv.production,
    sourcemaps: argv.sourcemaps,
    zip: argv.zip
}

/**
 * Paths
 */
const PATHS = {
    src: './src',
    build: './build'
}

/**
 * Config
 */
const CONFIG = {
    port: 3000
}

/**
 * Task: Build
 * Build production ready version of the app.
 */
gulp.task('build', gulp.series(
    clean,
    gulp.parallel(
        bundleApp,
        styles,
        copy,
        assets
    ),
    size,
    revision,
    revisionReplace,
    compress,
    zip
))

/**
 * Task: Watch
 * build complete app, start development server &
 * watch for changes.
 */
gulp.task('watch', gulp.series(
    clean,
    gulp.parallel(
        bundleAppAndWatch,
        styles,
        copy,
        assets
    ),
    server,
    watch
))

/**
 * Bundle app with ./src/index.js as the
 * entry point.
 *
 * @return {stream}
 */
function bundleApp () {
    return bundle(src('index.js'))
}

/**
 * Use browserify to bundle the application..
 *
 * @param  {string} entry - Path to entry file
 *
 * @return {stream}
 */
function bundle (entry) {
    let bundler = browserify(entry, { debug: ARGS.sourcemaps })

    bundler.transform(stringify, {
        appliesTo: { includeExtensions: ['.html', '.svg'] },
        minifyAppliesTo: { includeExtensions: ['.html', '.svg'] },
        minify: true
    })
    bundler.transform(babelify.configure({
        presets: ['es2015']
    }))

    return bundler
        .bundle()
        .pipe(source('bundle.js'))
        .pipe(buffer())
            .pipe($.if(ARGS.sourcemaps, $.sourcemaps.init({ loadMaps: true })))
                .pipe($.uglify())
            .pipe($.if(ARGS.sourcemaps, $.sourcemaps.write('./', { addComment: false })))
            .pipe(gulp.dest(PATHS.build))
}

/**
 * Bundle app with ./src/index.js as the
 * entry point, watch for changes and rebundle.
 *
 * @return {stream}
 */
function bundleAppAndWatch () {
    return watchBundle(src('index.js'))
}

/**
 * Use watchify / browserify to bundle the
 * application, watch for changes and rebundle.
 *
 * @param  {string} entry - Path to entry file
 *
 * @return {stream}
 */
function watchBundle (entry) {
    let options = watchify.args
    options.debug = true

    let bundler = watchify(browserify(entry, options))

    bundler.transform(stringify, {
        appliesTo: { includeExtensions: ['.html', '.svg'] },
        minifyAppliesTo: { includeExtensions: ['.html', '.svg'] },
        minify: true
    })
    bundler.transform(babelify.configure({
        presets: ['es2015']
    }))

    function rebundle () {
        return bundler
            .bundle()
            .on('error', errorHandler)
            .pipe(source('bundle.js'))
            .pipe(buffer())
                .pipe($.sourcemaps.init({ loadMaps: true }))
                .pipe($.sourcemaps.write('./'))
                .pipe(gulp.dest(PATHS.build))
                .pipe(browserSync.stream())
    }

    bundler.on('update', rebundle)
    return rebundle()
}

/**
 * Watch for changes to certain files and
 * run appropriate tasks,
 *
 * @param  {Function} done
 *
 * @return {stream}
 */
function watch (done) {
    gulp.watch([
        src('index.html')
    ], copy)

    gulp.watch([
        src('**/*.css')
    ], styles)

    done()
}

/**
 * Copy files into build dir.
 *
 * @return {void}
 */
function copy () {
    const glob = [
        src('**/*.html')
    ]

    return gulp.src(glob)
        .pipe($.htmlmin({
            removeComments: true,
            collapseWhitespace: true
        }))
        .pipe(gulp.dest(PATHS.build))
        .pipe(browserSync.stream())
}

/**
 * Copy assets into build dir.
 *
 * @return {void}
 */
function assets () {
    const glob = [
        src('assets/**/*')
    ]

    const dest = path.join(PATHS.build, 'assets')

    return gulp.src(glob)
        .pipe(gulp.dest(dest))
        .pipe(browserSync.stream())
}

/**
 * Compile styles.
 *
 * @return {stream}
 */
function styles () {
    const glob = src('*.css')

    const plugins = [
        cssImport(),
        cssNested(),
        cssVars(),
        autoprefixer({ browsers: ['last 2 versions'] })
    ]

    return gulp.src(glob)
        .pipe($.if(ARGS.sourcemaps, $.sourcemaps.init()))
            .pipe($.plumber(errorHandler))
            .pipe($.postcss(plugins))
            .pipe($.concat('bundle.css'))
        .pipe($.if(ARGS.sourcemaps, $.sourcemaps.write('./')))
        .pipe(gulp.dest(PATHS.build))
        .pipe(browserSync.stream({ match: '**/*.css' }))
}

/**
 * Version all js & css files in the build dir.
 *
 * @return {stream}
 */
function revision () {
    const glob = [
        path.join(PATHS.build, '*.js'),
        path.join(PATHS.build, '*.css'),
        path.join(PATHS.build, '**/*.gif')
    ]

    return gulp.src(glob)
        .pipe($.rev())
        .pipe(gulp.dest(PATHS.build))
        .pipe($.rev.manifest())
        .pipe(gulp.dest(PATHS.build))
}

/**
 * Replace file references in index.html sing the
 * "rev-manifest.json" created by the "revision"
 * task.
 *
 * @return {stream}
 */
function revisionReplace () {
    const manifest = path.join(PATHS.build, 'rev-manifest.json')
    const manifestStream = gulp.src(manifest)

    return gulp.src(path.join(PATHS.build, '**/*.html'))
        .pipe($.revReplace({ manifest: manifestStream }))
        .pipe(gulp.dest(PATHS.build))
}

/**
 * Use gzip to compress all js & css files in
 * the build dir.
 *
 * @return {stream}
 */
function compress () {
    const glob = [
        path.join(PATHS.build, '*.js'),
        path.join(PATHS.build, '*.css')
    ]

    return gulp.src(glob)
        .pipe($.gzip())
        .pipe(gulp.dest(PATHS.build))
}

/**
 * Archive the contents on the build dir
 * into a zip file.
 *
 * @return {stream}
 */
function zip (done) {
    if (!ARGS.zip) {
        done()
        return
    }

    const glob = [
        path.join(PATHS.build, '*')
    ]

    const filename = `${pkg.name}-${git.short()}.zip`

    return gulp.src(glob)
        .pipe($.zip(filename))
        .pipe(gulp.dest(PATHS.build))
}

/**
 * Delete build dir.
 *
 * @return {void}
 */
function clean () {
    return del(PATHS.build)
}

/**
 * Start node server (server.js) & BrowserSync.
 *
 * @param  {function} done
 *
 * @return {stream}
 */
function server (done) {
    let options = {
        browser: 'google chrome',
        port: CONFIG.port,
        online: false,
        logSnippet: false,
        notify: false,
        ghostMode: false,
        server: {
            baseDir: PATHS.build
        }
    }

    browserSync(options)
    done()
}

/**
 * Log the size of files in build dir.
 *
 * @return {stream}
 */
function size () {
    const glob = path.join(PATHS.build, '*')

    return gulp.src(glob)
        .pipe($.size({showFiles: true}))
        .pipe($.size({gzip: true}))
}

/**
 * gulp-plumber errorHandler.
 *
 * @param  {string} err
 *
 * @return {this}
 */
function errorHandler (err) {
    $.util.beep()
    $.util.log($.util.colors.red(err))
    this.emit('end')
    return this
}

/**
 * Helper to join file path with src path
 *
 * @param  {string} p Filepath
 *
 * @return {string}
 */
function src (p) {
    return path.join(PATHS.src, p)
}
