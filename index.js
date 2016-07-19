var through2 = require('through2');
var gUtil = require('gulp-util');
var PluginError = gUtil.PluginError;
var attrParse = require('html-loader/lib/attributesParser');
var loaderUtils = require("loader-utils");
var url = require('url');
var path = require('path');
var fs = require('fs');
var fsPath = require('fs-path');
var util = require('util');
var pkg = require('./package.json');

function randomIdent() {
    return "xxxHTMLLINKxxx" + Math.random() + Math.random() + "xxx";
}

function renderURI(options, key) {
    var value = options.indexes[key];
    var uri = options.prefix + value;
    if (options.template) {
        return options.template
            .replace('[key]', key)
            .replace('[value]', value)
            .replace('[uri]', uri);
    }
    return uri;
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
        var keyRaw = path.relative(options.root, src), keyNew = keyRaw;
        var extRaw = path.extname(keyRaw), extNew = extRaw;

        if (options.exts && extRaw in options.exts) {
            extNew = options.exts[extRaw];
            keyNew = keyRaw.replace(new RegExp(extRaw + '$', 'g'), extNew);
        }

        // 索引已存在, 表示已经处理过
        if (keyRaw in options.indexes) {
            options.indexes[keyNew] = options.indexes[keyRaw];
            return renderURI(options, keyRaw);
        }
        if (keyNew in options.indexes) {
            return renderURI(options, keyNew);
        }

        var dest = path.join(path.dirname(keyNew), options.file || path.basename(keyNew));

        // 替换后缀
        if (options.file && options.file.indexOf('[ext]') > -1) {
            dest = dest.replace('[ext]', extNew == '' ? '' : extNew.substr(1));
        }

        // 替换文件名
        var basename = path.basename(keyNew);
        basename = basename.substring(0, basename.lastIndexOf(extNew));
        dest = dest.replace('[name]', basename);

        // 替换 hash
        if (options.file && options.file.indexOf('[hash]') > -1) {
            dest = dest.replace('[hash]', loaderUtils.getHashDigest(fs.readFileSync(src)));
        }

        // 复制文件到对应目录
        fsPath.mkdirSync(path.dirname(options.dest + '/' + dest));
        fsPath.copySync(src, options.dest + '/' + dest);

        // 更新索引
        options.indexes[keyRaw] = dest;
        options.indexes[keyNew] = dest;

        return renderURI(options, keyNew);
    });
}

module.exports = function (options) {
    return through2.obj(function (file, enc, cb) {
        if (file.isNull()) {
            return cb(null, file);
        }
        if (file.isStream()) {
            return cb(new PluginError(pkg.name, 'Streaming is not supported'));
        }
        if (file.isBuffer()) {
            var contents = file.contents.toString('utf-8');
            var filename = util.isArray(file.history) ? file.history[0] : file.history;
            contents = process(contents, path.dirname(filename), options);
            file.contents = new Buffer(contents);
        }
        this.push(file);
        return cb(null, file);
    });
};
