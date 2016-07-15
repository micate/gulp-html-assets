# gulp-html-assets

> Find assets in HTML file, revisioning assets, rewrite references in each file.

## Install

Install with [npm](https://npmjs.org/)

```
npm install --save-dev gulp-html-assets
```

## Usage

Source html:

```html
<div>
<link rel="stylesheet" href="./index.entry.css">
<img src="./images/red-tree-2.jpg" alt="Red Tree" />
<script src="./index.entry.js"></script>
</div>
```

Gulp:

```js
var gulp = require('gulp');
var gulpHTMLAssets = require('gulp-html-assets');
var path = require('path');

const DEBUG = process.env.NODE_ENV !== 'production';
const OUTPUT_PATH = path.resolve('../output');

var manifest = {};

gulp.task('default', function () {
    var stream = gulp.src(['**/*.html'])
        .pipe(gulpHTMLAssets({
            root: path.resolve('.'),
            dest: OUTPUT_PATH,
            file: '[name]' + (DEBUG ? '' : '-[hash]') + '.[ext]',
            prefix: '/assets/build/',
            indexes: manifest
        }))
        .pipe(gulp.dest(OUTPUT_PATH));
        
    stream.on('end', function () {
        fs.writeFileSync(OUTPUT_PATH + '/manifest.json', JSON.stringify(manifest, null, 2));
    });
    
    return stream;
});
```

Output:

```html
<div>
<link rel="stylesheet" href="/assets/build/index.entry-472ce2cca6184c821e7804b855ac216c.css">
<img src="/assets/build/images/red-tree-2-68add0b5d16c3317de6cd16693269d4c.jpg" alt="Red Tree" />
<script src="/assets/build/index.entry-eae2b4beaf92fc30a996de142be88f97.js"></script>
</div>
```

Output manifest file:

```json
{
  "index.entry.css": "index.entry-472ce2cca6184c821e7804b855ac216c.css",
  "index.entry.js": "index.entry-eae2b4beaf92fc30a996de142be88f97.js",
  "images/red-tree-2.jpg": "images/red-tree-2-68add0b5d16c3317de6cd16693269d4c.jpg"
}
```

## Options
```js
.pipe(gulpHTMLAssets({ options })
```

#### root
Type: `String`<br/>

Set the assets root path<br/>

#### dest
Type: `String`<br/>

Set the assets target path<br />

#### file
Type: `String`<br/>

Set the assets target file name, support `[name]`, `[hash]`, `[ext]` placeholder.<br />

Example:

```js
file: '[name].[ext]'
```

With hash:

```js
file: '[name]-[hash].[ext]'
```

Condition hash:

```js
file: '[name]' + (DEBUG ? '' : '-[hash]') + '.[ext]'
```

#### prefix
Type: `String`<br/>

Set the assets references prefix in HTML.<br />

HTML:
```html
<script src="./index.entry.js"></script>
```

Output:
```html
<script src="/assets/build/index.entry.js"></script>
```

Output with CDN:
```html
<script src="http://c.d.n/assets/build/index.entry.js"></script>
```

#### template
Type: `String`<br />

HTML reference template, it's useful when work with backend templates.

Support `[key]`, `[value]` and `[uri]` placeholder, 
`[key]` is the `indexes` key, `[value]` is the `indexes` value, `[uri]` is the full uri.

Config:
```js
{
    template: "{{ assets \"[key]\" }}"
}
```

HTML:
```html
<div>
<link rel="stylesheet" href="./index.entry.css">
</div>
```

Output:
```html
<div>
<link rel="stylesheet" href="{{ assets "index.entry.css" }}">
</div>
```

#### indexes
Type: `Object{}`<br/>

Assets source and target map references.<br />

#### exts
Type: `Object`<br />

Convert exts from source to target, references will be effected.

Config:
```js
{
    prefix: "/assets/build/",
    exts: {
        '.ts': '.js',
        '.scss': '.js'
    }
}
```

HTML:
```html
<div>
<link rel="stylesheet" href="./index.entry.scss">
</div>
```

Output:
```html
<div>
<link rel="stylesheet" href="/assets/build/index.entry.css">
</div>
```
