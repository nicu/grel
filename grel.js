// TODO - remove "callback && callback.call(...)", maybe use "noop"
// TODO - 'release' is just the JSON object we get from GitHub. Create a class when/if needed

var https = require('https'),
    fs = require('fs'),
    path = require('path'),
    url_parser = require('url'),

    // Constants
    GIT_RELEASES_URL = 'https://api.github.com/repos/{owner}/{repo}/releases';

/**
 * Basic method that copies all the keys and values from the specified object
 * into the current object.
 *
 * @param  {Object} obj The source object from which we want to borrow properties
 * @return {null} No return value
 */

function borrow(obj) {
    for (var key in obj) {
        this[key] = obj[key];
    }
}

/**
 * Format a string by replacing all keys between { and } with values from the given dictionary
 * @param  {String} string Format string
 * @param  {Object} dict   Object containing values for the keys specified in the format string
 * @return {String}        Formatted string
 */

function strformat(string, dict) {
    var formatted = string;
    for (var prop in dict) {
        var regexp = new RegExp('\\{' + prop + '\\}', 'gi');
        formatted = formatted.replace(regexp, dict[prop]);
    }
    return formatted;
}


/**
 * Creates a new instance of the GrelRequest class.
 *
 * This class is used when sending HTTP requests to GitHub and it automatically handles
 * user authentication and a few other things.
 *
 * @param {Grel} grel Grel object that is used for authentication
 */

function GrelRequest(grel) {
    this.headers = {
        'Authorization': 'Basic ' + new Buffer(grel.user + ':' + grel.password).toString('base64'),
        'Accept': 'application/vnd.github.manifold-preview'
    };

    this.grel = grel;
    this.content = null;
}

/**
 * Sets a header on the current request object
 * @param  {String} name  Name of the HTTP header
 * @param  {String} value Value for the HTTP header
 * @return {null} No return value
 */
GrelRequest.prototype.header = function(name, value) {
    this.headers[name] = value;
};

/**
 * Sets the content body for the HTTP requests.
 *
 * @param  {String|Buffer} content Content body
 * @return {null} No return value
 */
GrelRequest.prototype.data = function(content) {
    this.content = content;
};

/**
 * Fire an HTTP request to GitHub.
 * @param  {String}   method   HTTP verb
 * @param  {String}   url      URL for the request
 * @param  {Function} callback Callback function
 * @return {null} No return value
 */
GrelRequest.prototype.send = function(method, url, callback) {
    var self = this,
        location = url_parser.parse(url),
        args = {
            // rejectUnauthorized: false,
            method: method,
            host: location.host,
            path: location.path,
            port: 443,
            headers: this.headers
        },
        req;

    req = https.request(args, function(res) {
        var body = "";
        res.on('data', function(data) {
            body += data;
        });
        res.on('end', function() {
            handleResponse.call(self, res, body, callback);
        })
        res.on('error', function(e) {
            callback && callback.call(self, e);
        });
    });

    // Write the content body data, if any
    this.content && req.write(this.content);

    req.end();
};

/**
 * Private method that handles HTTP responses we get from GitHub.
 * This method will always be executed in the context of a GrelRequest.
 *
 * @param  {String}   response HTTP response
 * @param  {Function} callback Callback function
 * @return {null} No return value
 */

function handleResponse(res, data, callback) {
    var json = JSON.parse(data);

    if ((res.statusCode >= 200) && (res.statusCode <= 206)) {
        // Handle a few known responses
        switch (json.message) {
            case 'Bad credentials':
                callback.call(this, json);
                break;

            default:
                callback.call(this, null, json);
        }
    } else {
        callback.call(this, json);
    }
}

/**
 * Creates a new instance of the Grel class.
 * The config object should contain the following keys: [user, pass, owner, repo]
 *
 * @param {Object} config GitHub credentials and repo information.
 */

function Grel(config) {
    // copy all of the config keys and values in our new object
    borrow.call(this, config);
}

/**
 * Creates a new release.
 *
 * @constructor
 * @param  {String}   name     Release name
 * @param  {String}   message  Release description
 * @param  {Array}    files    List of files to be attached to the release
 * @param  {Function} callback Callback function called whenever an error occurs
 *                             or when release is created and all attachments are uploaded.
 * @return {null} No return value
 */
Grel.prototype.create = function(name, message, files, callback) {
    var self = this,
        data = JSON.stringify({
            "tag_name": name,
            "name": name,
            "body": message,
            "draft": false,
            "prerelease": false
        }),
        req = new GrelRequest(this),
        url = strformat(GIT_RELEASES_URL, this),
        release;

    req.data(data);
    req.send('POST', url, function(error, release) {
        if (error) {
            callback && callback(error);
            return;
        }

        self.attach(release, files, callback);
    });
};

/**
 * Attaches files to the given release.
 * @param  {Object}   release  Release object
 * @param  {Array}    files    Array of files to be attached
 * @param  {Function} callback Callback function
 * @return {null} No return value
 */
Grel.prototype.attach = function(release, files, callback) {
    var self = this,
        bytes, filename,
        i, l = files.length,
        content_types = {
        	'zip': 'application/zip',
        	'default': 'text/html'
        },
        // very rudimentary implementation of what we usually handle with promises
        in_progress = files.length,
        uploadComplete = function(error, response) {
        	if (error) {
        		callback && callback.call(self, error);
        		return;
        	}

            // if all the files were attached, execute the callback
            if (--in_progress === 0) {
                callback && callback.call(self, null, release);
            }
        };

    // if there are no files to attach, execute the callback
    if (!files.length) {
    	callback && callback.call(self, null, release);
    	return;
    }

    files.forEach(function(filename) {
        fs.readFile(filename, function(err, file) {
            if (err) {
                callback && callback.call(self, err);
                return;
            }

            var req = new GrelRequest(self),
                url = strformat(release.upload_url, {
                    "\\?name": "?name=" + path.basename(filename)
                }),
                ext = path.extname(filename).replace(/^\.+/, '');

            req.header('Content-Type', content_types[ext] || content_types['default']);
            req.header('Content-Length', file.length);
            req.data(file);
            req.send('POST', url, uploadComplete);
        });
    });
};

Grel.prototype.find = function(tag, callback) {
	var self = this,
	    req = new GrelRequest(this),
	    url = strformat(GIT_RELEASES_URL, this),
	    i, l, release;

	req.send('GET', url, function(error, json) {
		if (error) {
			callback && callback.call(self, error);
			return;
		}

	    for (i = 0, l = json.length; i < l; ++i) {
	    	release = json[i];
	    	if (release.tag_name === tag) {
	    	    callback && callback.call(self, null, release);
	    	    return;
	    	}
	    };

	    // if we got here, we didn't find the release we're after
	    callback && callback.call(self, {
	        'message': 'Not found'
	    });
	});
};

/**
 * Removes the specified release.
 * @param  {Grel}   release  Release to be removed
 * @param  {Function} callback Callback function
 * @return {null} No return value
 */
Grel.prototype.remove = function(release, callback) {

};

/**
 * Export the Grel class
 */
module.exports = Grel;
