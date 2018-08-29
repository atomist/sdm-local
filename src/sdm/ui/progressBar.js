var ansi = require('ansi.js');
var newlineEvent = require('on-new-line');

var stream = process.stdout;

stream.rows = stream.rows || 40;
stream.columns = stream.columns || 80;
newlineEvent(stream);

var placeholder = '\uFFFC';
var rendering = false;
var instances = [];
var cursorRow;
var existing = false;

function beginUpdate() {
    rendering = true;
}

function endUpdate() {
    rendering = false;
}

function isUpdating() {
    return rendering === true;
}

function init(cursorPosition) {
    cursorRow = cursorPosition.row;
}

stream.on('before:newlines', function (count) {
    updateRows(count);

    if (!existing) {
        cursorRow = cursorRow + count;
        if (stream.rows < cursorRow) {
            cursorRow = stream.rows;
        }
    }
});

function updateRows(count) {

    if (isUpdating() || instances.length === 0) {
        return;
    }

    var current = {row: cursorRow, col: 1};
    if (!current) {
        return;
    }

    // did not reach the end, the screen need not scroll up
    if (current.row < stream.rows) {
        return;
    }

    var minRow = 1;
    var cursor = instances[0].cursor;

    beginUpdate();

    instances.forEach(function (instance) {

        if (instance.rendered && (!instance.completed || instance.tough)) {
            // clear the rendered bar
            instance.clear();
            instance.origin.row = Math.max(minRow, instance.origin.row - count);
            minRow += instance.rows;
        } else if (instance.rendered
            && instance.completed
            && !instance.tough
            && !instance.archived
            && !instance.clean) {

            instance.clear();
            instance.origin.row = -instance.rows;
            instance.colorize(instance.output);
            instance.archived = true;
        }
    });


    // append empty row for the new lines, the screen will scroll up,
    // then we can move the bars to their's new position.
    cursor
        .moveTo(current.row, current.col)
        .write(repeatChar(count, '\n'));

    instances.forEach(function (instance) {
        if (instance.rendered && (!instance.completed || instance.tough)) {
            instance.colorize(instance.output);
        }
    });

    cursor.moveTo(current.row - count, current.col);

    endUpdate();
}

function ProgressBar(options) {

    options = options || {};

    this.cursor = ansi(stream);
    this.total = options.total || 100;
    this.current = options.current || 0;
    this.width = options.width || 60;
    this.fixedWidth = options.fixedWidth;

    if (typeof this.width === 'string') {
        if (this.width.endsWith('%')) {
            this.width = parseFloat(this.width) / 100 % 1;
        } else {
            this.width = parseFloat(this.width);
        }
    }

    this.tough = !!options.tough;
    this.clean = !!options.clean;
    this.chars = {
        blank: options.blank || '—',
        filled: options.filled || '▇'
    };

    // callback on completed
    this.callback = options.callback;

    this.setSchema(options.schema);
    this.snoop();

    instances.push(this);
}


// exports
// -------

exports.ProgressBar = ProgressBar;
exports.init = init;


// proto
// -----

ProgressBar.prototype.setSchema = function (schema, refresh) {
    this.schema = schema || ' [:bar] :current/:total :percent :elapseds :etas';

    if (refresh) {
        existing = true;
        this.compile(refresh);
        existing = false;
    }
};

ProgressBar.prototype.tick = function (delta, tokens) {

    var type = typeof delta;

    if (type === 'object') {
        tokens = delta;
        delta = 1;
    } else if (type === 'undefined') {
        delta = 1;
    } else {
        delta = parseFloat(delta);
        if (isNaN(delta) || !isFinite(delta)) {
            delta = 1;
        }
    }

    if (this.completed && delta >= 0) {
        return;
    }

    if (!this.start) {
        this.start = new Date;
    }

    this.current += delta;
    this.compile(tokens);
    this.snoop();
};

ProgressBar.prototype.update = function (ratio, tokens, created) {
    existing = !created;
    var completed = Math.floor(ratio * this.total);
    var delta = completed - this.current;

    this.tick(delta, tokens);
    existing = false;
};

ProgressBar.prototype.compile = function (tokens) {

    var ratio = this.current / this.total;

    ratio = Math.min(Math.max(ratio, 0), 1);

    var chars = this.chars;
    var schema = this.schema;
    var percent = ratio * 100;
    var elapsed = new Date - this.start;

    var eta;
    if (this.current <= 0) {
        eta = '-';
    } else {
        eta = percent === 100 ? 0 : elapsed * this.total / this.current;
        eta = formatTime(eta);
    }

    var output = schema
        .replace(/:total/g, this.total)
        .replace(/:current/g, this.current)
        .replace(/:elapsed/g, formatTime(elapsed))
        .replace(/:eta/g, eta)
        .replace(/:percent/g, toFixed(percent, 0) + '%');

    if (tokens && typeof tokens === 'object') {
        for (var key in tokens) {
            if (tokens.hasOwnProperty(key)) {
                output = output.replace(new RegExp(':' + key, 'g'), ('' + tokens[key]) || placeholder);
            }
        }
    }

    var raw = bleach(output);
    var cols = process.stdout.columns;
    var width = this.width;

    width = width < 1 ? cols * width : width;
    if (!this.fixedWidth) {
        width = Math.min(width, Math.max(0, cols - bareLength(raw)));
    }

    var length = Math.round(width * ratio);
    var filled = repeatChar(length, chars.filled);
    var blank = repeatChar(width - length, chars.blank);

    raw = combine(raw, filled, blank, true);
    output = combine(output, filled, blank, false);

    // without color and font styles
    this.raw = raw;
    // row count of the progress bar
    this.rows = raw.split('\n').length;

    this.render(output);
};

ProgressBar.prototype.render = function (output) {

    if (this.output === output) {
        return;
    }

    var current = {row: cursorRow, col: 1};
    if (!current) {
        return;
    }

    beginUpdate();

    this.savePos = current;
    if (!this.origin) {
        this.origin = current;
    }

    if (this.origin.row === stream.rows) {

        this.cursor.write(repeatChar(this.rows, '\n'));

        instances.forEach(function (instance) {
            if (instance.origin) {
                instance.origin.row -= this.rows;
            }
        }, this);
    }

    this.clear();
    this.colorize(output);

    // move the cursor to the current position.
    if (this.rendered) {
        this.cursor.moveTo(current.row, current.col);
    }

    this.output = output;
    this.rendered = true;

    endUpdate();
};

ProgressBar.prototype.colorize = function (output) {

    var charsLeft = process.stdout.columns - 1;

    function writeChars(chars) {
        if (!charsLeft) {
            return;
        }

        cursor.write(chars.slice(0, charsLeft));
        charsLeft = Math.max(0, charsLeft - chars.length);
    }

    var cursor = this.cursor;
    var parts = output.split(/(\.[A-Za-z]+)/g);
    var content = '';
    var matches = [];

    cursor.moveTo(this.origin.row, this.origin.col);

    function write() {

        //console.log(content)
        //console.log(matches)

        var hasFg = false;
        var hasBg = false;
        var gradient = null;

        matches.forEach(function (match) {

            if (match.method === 'gradient') {
                gradient = match;
                return;
            }

            var host = match.isBg
                ? cursor.bg : match.isFont
                    ? cursor.font
                    : cursor.fg;

            if (match.isBg) {
                hasBg = true;
            } else {
                hasFg = true;
            }

            host[match.method]();
        });

        content = content.replace(new RegExp(placeholder, 'g'), '');

        if (content) {

            if (gradient) {

                var color1 = gradient.color1;
                var color2 = gradient.color2;

                for (var i = 0, l = content.length; i < l; i++) {

                    var color = i === 0
                        ? color1 : i === l - 1
                            ? color2
                            : interpolate(color1, color2, (i + 1) / l);

                    cursor.fg.rgb(color.r, color.g, color.b);
                    writeChars(content[i]);
                    cursor.fg.reset();
                }
            } else {
                writeChars(content);
            }
        }

        // reset font style
        matches.forEach(function (match) {
            if (match.isFont) {
                cursor.font['reset' + ucFirst(match.method)]();
            }
        });

        // reset foreground
        if (hasFg) {
            cursor.fg.reset();
        }

        // reset background
        if (hasBg) {
            cursor.bg.reset();
        }

        matches = [];
        content = '';
    }

    for (var i = 0, l = parts.length; i < l; i++) {

        var part = parts[i];
        var match = null;

        if (!part) {
            continue;
        }

        if (part.startsWith('.')) {

            if (part === '.gradient') {
                if (parts[i + 1]) {
                    match = parseGradient(parts[i + 1]);

                    parts[i + 1] = parts[i + 1].replace(/^\((.+),(.+)\)/, '');
                }
            } else {
                match = parseMethod(cursor, part);
            }
        }

        if (match) {
            if (match.suffix) {
                if (i < l - 1) {
                    parts[i + 1] += match.suffix;
                } else {
                    // the last one
                    writeChars(match.suffix);
                }
            }

            matches.push(match);
        } else {

            if (matches.length) {
                write();
            }

            content += part;
        }
    }

    write();

    cursor.write('\n');
};

ProgressBar.prototype.clear = function () {

    if (this.output) {
        this.cursor.moveTo(this.origin.row, this.origin.col);
        for (var i = 0; i < this.rows; i++) {
            this.cursor
                .eraseLine()
                .moveDown();
        }
        this.cursor.moveTo(this.origin.row, this.origin.col);
    }
};

ProgressBar.prototype.snoop = function () {

    this.completed = this.current >= this.total;

    if (this.completed) {
        this.terminate();
    }

    return this.completed;
};

ProgressBar.prototype.terminate = function () {

    if (this.clean && this.rendered) {
        this.clear();
        //var lines = this.raw.split('\n');
        //for (var i = 0; i < this.rows; i++) {
        //  this.cursor
        //    .deleteLine()
        //    .moveDown();
        //}
    }

    this.callback && this.callback(this);
    if (this.savePos) {
        this.cursor.moveTo(this.savePos.row, this.savePos.col);
    }
};


// helpers
// -------

function toFixed(value, precision) {

    var power = Math.pow(10, precision);

    return (Math.round(value * power) / power).toFixed(precision);
}

function formatTime(ms) {
    return isNaN(ms) || !isFinite(ms)
        ? '0.0'
        : toFixed(ms / 1000, 1);
}

function lcFirst(str) {
    return str.charAt(0).toLowerCase() + str.substring(1);
}

function ucFirst(str) {
    return str.charAt(0).toUpperCase() + str.substring(1);
}

function repeatChar(count, char) {
    return new Array(parseInt(count, 10) + 1).join(char);
}

function parseMethod(cursor, str) {

    str = str.substr(1);

    return parseColor(cursor, str)
        || parseFont(cursor, str)
        || parseGradient(str);
}

function parseColor(cursor, str) {

    var match = str.match(/^(bgR|r)ed/)
        || str.match(/^(bgB|b)lue/)
        || str.match(/^(bgC|c)yan/)
        || str.match(/^(bgG|g)rey/)
        || str.match(/^(bgW|w)hite/)
        || str.match(/^(bgB|b)lack/)
        || str.match(/^(bgG|g)reen/)
        || str.match(/^(bgY|y)ellow/)
        || str.match(/^(bgM|m)agenta/)
        || str.match(/^(bgB|b)right(Black|Red|Green|Yellow|Blue|Magenta|Cyan|White)/);

    if (match) {

        var method = match[0];
        var suffix = str.substr(method.length);
        var isBg = method.startsWith('bg');

        if (isBg) {
            method = lcFirst(method.substr(2));
        }

        if (typeof cursor[method] === 'function') {
            return {
                isBg: isBg,
                method: method,
                suffix: suffix
            };
        }
    }
}

function parseFont(cursor, str) {

    var match = str.match(/^bold|italic|underline|inverse/);
    if (match) {

        var method = match[0];
        var suffix = str.substr(method.length);

        if (typeof cursor[method] === 'function') {
            return {
                isFont: true,
                method: method,
                suffix: suffix
            };
        }
    }
}

function parseGradient(str) {

    var match = str.match(/^\((.+),(.+)\)/);
    if (match) {

        var color1 = match[1].trim();
        var color2 = match[2].trim();

        color1 = color1.startsWith('#') ? hex2rgb(color1) : name2rgb(color1);
        color2 = color1.startsWith('#') ? hex2rgb(color2) : name2rgb(color2);

        if (color1 && color2) {
            return {
                method: 'gradient',
                color1: color1,
                color2: color2
            };
        }
    }
}

function interpolate(color1, color2, percent) {

    return {
        r: atPercent(color1.r, color2.r, percent),
        g: atPercent(color1.g, color2.g, percent),
        b: atPercent(color1.b, color2.b, percent)
    };
}

function atPercent(a, b, percent) {
    return a + Math.round((b - a) * percent);
}

function hex2rgb(color) {

    var c = color.substring(1);
    var r = c.substring(0, 2);
    var g = c.substring(2, 4);
    var b = c.substring(4, 6);

    return {
        r: parseInt(r, 16),
        g: parseInt(g, 16),
        b: parseInt(b, 16)
    };
}

function name2rgb(name) {
    var hex = {
        red: '#ff0000',
        blue: '#0000ff',
        cyan: '#00ffff',
        grey: '#808080',
        white: '#ffffff',
        black: '#000000',
        green: '#008000',
        yellow: '#ffff00',
        magenta: '#ff00ff'
    }[name];

    return hex ? hex2rgb(hex) : null;
}

function bleach(output) {
    return output
        .replace(/\.(bgR|r)ed/g, '')
        .replace(/\.(bgB|b)lue/g, '')
        .replace(/\.(bgC|c)yan/g, '')
        .replace(/\.(bgG|g)rey/g, '')
        .replace(/\.(bgW|w)hite/g, '')
        .replace(/\.(bgB|b)lack/g, '')
        .replace(/\.(bgG|g)reen/g, '')
        .replace(/\.(bgY|y)ellow/g, '')
        .replace(/\.(bgM|m)agenta/g, '')
        // bright
        .replace(/\.(bgB|b)right(Black|Red|Green|Yellow|Blue|Magenta|Cyan|White)/g, '')
        // font style
        .replace(/\.bold|italic|underline|inverse/g, '')
        // gradient
        .replace(/\.gradient\((.+),(.+)\)/g, '');
}

function combine(output, filled, blank, bare) {

    var bar = filled + blank;

    if (!bare) {
        bar = bar || placeholder;
        blank = blank || placeholder;
        filled = filled || placeholder;
    }

    return output
        .replace(/:filled/g, filled)
        .replace(/:blank/g, blank)
        .replace(/:bar/g, bar);
}

function bareLength(output) {
    var str = output
        .replace(/:filled/g, '')
        .replace(/:blank/g, '')
        .replace(/:bar/g, '');

    return str.length;
}
