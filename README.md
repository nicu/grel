Grel
====

NodeJS module that automates the creation of Git Releases and uploading attachments using GitHub's [Releases API](http://developer.github.com/v3/repos/releases).


Examples
========

### Initialise

```js
var Grel = require('grel'),
    grel;

grel = new Grel({
    user: user,
	password: pass,
	owner: owner,
	repo: repo
});
```

### Create a new release

```js
grel.create('1.0.0', 'Release 1.0.0', ['/path/to/file'], function(error, release) {
	if (error) {
		console.log('Something went wrong', error);
		return;
	}

	console.log('Release', release.tag_name, 'created');
});
```
* Note that you can send an empty file array if you have no file attachments

### Find an existing release

```js
grel.find('1.0.0', function(error, release) {
	if (error) {
		console.log('Something went wrong', error);
		return;
	}

	console.log('Release', release.tag_name, 'found');
});
```

### Attach files to an existing release

```js
grel.attach(release, ['/path/to/file1', '/path/to/file2'], function(err, msg) {
    if (err) {
		console.log('Could not attach file', err);
		return;
	}

	console.log('Files attached');
});
```
* Note that you can send an empty file array if you have no file attachments

`release` is an object returned by `grel.create` or `grel.find`