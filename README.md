# starter-vanilla
A starting point for web projects built on vanilla javascript utilising gulp &amp; browserify.


##### Project Structure
```
# The compiled app goes here
- dist
# This where the source of your app lives
- src
    # Images, svg's etc.
    - assets
    # Javascript components
    - components
    # Sass files
    - sass
    # Base javascript file (browserify starts here)
    - app.js
    - index.html
```


##### Getting Started
To get up and running quickly follow these steps:

**Clone this repo**  
`$ git clone https://github.com/alexblunck/starter-vanilla.git`

**Install dependencies**  
`$ npm install`

**Build app**  
`$ gulp build`


##### Gulp Tasks
starter-vanilla uses gulp to build  your app. Following tasks are available:

**Build app for production**  
`$ gulp build`

**Build app, open browser, watch for changes &amp; reload browser if necessary**  
`$ gulp watch` or `$ gulp`


##### Requirements
tarter-vanilla needs following things to be installed:

- [Node.js](https://nodejs.org)  
- Gulp `$ sudo npm install gulp`