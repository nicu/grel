Grel
====

NodeJS module that automates the creation of Git Releases and uploading attachments.


Examples
========

### Initialise

```js
var grel = new Grel({
    user: user,
	password: pass,
	owner: owner,
	repo: repo
});
```

### Create a new release

```js
grel.create(release_name, release_message, files, function(error, release) {
	if (error) {
		console.log('Something went wrong', error);
		return;
	}

	console.log('Release', release.tag_name, 'created');
});
```

`files` is an array of file paths

### Find an existing release

```js
grel.find(release_name, function(error, release) {
	if (error) {
		console.log('Something went wrong', error);
		return;
	}

	console.log('Release', release.tag_name, 'found');
});
```

### Attach files to an existing release

```js
grel.attach(release, files, function(err, msg) {
    if (err) {
		console.log('Could not attach file', err);
		return;
	}

	console.log('Files attached');
});
```

`files` is an array of file paths