# Kinvey
[Kinvey](http://www.kinvey.com) (pronounced Kin-vey, like convey) makes it ridiculously easy for developers to setup, use and operate a cloud backend for their mobile apps. They don't have to worry about connecting to various cloud services, setting up servers for their backend, or maintaining and scaling them.

This node module makes it very easy to connect your Node.js app with Kinvey.

## How to use

### 1. Sign up for Kinvey
To use the library, sign up for Kinvey if you have not already done so. Go to the [sign up](https://console.kinvey.com/#signup) page, and follow the steps provided.

### 2. Add the library
You can add the library in three ways. The recommended way to add the module to your project is adding a dependency to `package.json`:

```javascript
{
  ...
  "dependencies": {
    "kinvey": "~0.9"
    ...
  }
  ...
}
```

The module will be installed when updating your project:

```bash
npm update
```

Alternatively, you can install the module directly from the command line:

```bash
npm install kinvey
```

Finally, you can also clone the repository and create a symbolic link to the module:

	git clone git@github.com:Kinvey/kinvey-nodejs.git
	cd kinvey-nodejs
	npm link

### 3. Configure the library
Now, the library is available for use in your project. Import the library in your code using `require`. Next, use `Kinvey.init` to configure your app:

```javascript
var Kinvey = require('kinvey');
Kinvey.init({
    appKey: 'your-app-key',
    appSecret: 'your-app-secret'
});
```

### 4. Verify Set Up
You can use the following snippet to verify the app credentials were entered correctly. This function will contact the backend and verify that the library can communicate with your app.

```javascript
Kinvey.ping({
    success: function(response) {
        console.log('Kinvey Ping Success. Kinvey Service is alive, version: ' + response.version + ', response: ' + response.kinvey);
    },
    error: function(error) {
        console.log('Kinvey Ping Failed. Response: ' + error.description);
    }
});
```

## What’s next?
You are now ready to start building your awesome apps! Next we recommend diving into the [User guide](http://devcenter.kinvey.com/nodejs/guides/users) or [Data store guide](http://devcenter.kinvey.com/nodejs/guides/datastore) to learn more about our service, or explore the [sample apps](http://devcenter.kinvey.com/nodejs/samples) to go straight to working projects.
