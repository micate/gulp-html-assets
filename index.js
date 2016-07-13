var through2 = require('through2');
var gUtil = require('gulp-util');
var PluginError = gUtil.PluginError;
var attrParse = require('html-loader/lib/attributesParser');
var loaderUtils = require("loader-utils");
var url = require('url');
var path = require('path');
var fs = require('fs');
var fsPath = require('fs-path');
var pkg = require('./package.json');

function randomIdent() {
    return "xxxHTMLLINKxxx" + Math.random() + Math.random() + "xxx";
}

function process(content, base, options) {
    var attributes = ["img:src", "link:href", "script:src"];
    var links = attrParse(content, function (tag, attr) {
        return attributes.indexOf(tag + ":" + attr) >= 0;
    });
    links.reverse();

    var data = {};
    content = [content];
    links.forEach(function (link) {
        if (!loaderUtils.isUrlRequest(link.value)) {
            return;
        }

        var uri = url.parse(link.value);
        if (uri.hash !== null && uri.hash !== undefined) {
            uri.hash = null;
            link.value = uri.format();
            link.length = link.value.length;
        }

        do {
            var ident = randomIdent();
        } while (data[ident]);
        data[ident] = link.value;
        var x = content.pop();
        content.push(x.substr(link.start + link.length));
        content.push(ident);
        content.push(x.substr(0, link.start));
    });
    content.reverse();
    content = content.join("");

    return content.replace(/xxxHTMLLINKxxx[0-9\.]+xxx/g, function (match) {
        if (!data[match]) {
            return match;
        }

        var src = path.resolve(path.join(base, data[match]));
        var key = path.relative(options.root, src);

        // 索引已存在, 表示已经处理过
        if (key in options.indexes) {
            return options.prefix + options.indexes[key];
        }

        var dest = path.join(path.dirname(key), (options.file || key));

        // 替换后缀
        var ext = path.extname(key);
        if (ext != '') {
            dest = dest.replace('[ext]', ext.substr(1));
        }

        // 替换文件名
        var basename = path.basename(key);
        basename = basename.substring(0, basename.lastIndexOf(ext));
        dest = dest.replace('[name]', basename);

        // 替换 hash
        if (options.file.indexOf('[hash]') > -1) {
            dest = dest.replace('[hash]', loaderUtils.getHashDigest(fs.readFileSync(src)));
        }

        // 复制文件到对应目录
        fsPath.mkdirSync(path.dirname(options.dest + '/' + dest));
        fsPath.copySync(src, options.dest + '/' + dest);

        // 更新索引
        options.indexes[key] = dest;

        return options.prefix + options.indexes[key];
    });
}

var ref = (function () {
    return function (options) {
        return through2.obj(function (file, enc, cb) {
            if (file.isNull()) {
                return cb(null, file)
            }
            if (file.isStream()) {
                return cb(new PluginError(pkg.name, 'Streaming is not supported'))
            }
            if (file.isBuffer()) {
                var contents = file.contents.toString('utf-8');
                contents = process(contents, path.dirname(file.history), options);
                file.contents = new Buffer(contents);
            }
            return cb(null, file);
        });
    };
})();

module.exports = ref;
