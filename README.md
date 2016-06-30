# Kinvey
[Kinvey](http://www.kinvey.com) (pronounced Kin-vey, like convey) makes it ridiculously easy for developers to setup, use and operate a cloud backend for their mobile apps. They don't have to worry about connecting to various cloud services, setting up servers for their backend, or maintaining and scaling them.

This node module makes it very easy to connect your Node app with Kinvey.

## How to use

### 1. Sign up for Kinvey
To use the library, sign up for Kinvey if you have not already done so. Go to the [sign up](https://console.kinvey.com/#signup) page, and follow the steps provided.

### 2. Install the library
You can install the module using npm:

```bash
npm install kinvey@beta --save
```

### 3. Configure the library
Now, the library is available for use in your project.

Import the library in your code using `require`.

```javascript
var Kinvey = require('kinvey');
```

Next, use `Kinvey.init` to configure your app:

```javascript
Kinvey.init({
    appKey: '<appKey>',
    appSecret: '<appSecret>'
});
```

### 4. Verify Set Up
You can use the following snippet to verify the app credentials were entered correctly. This function will contact the backend and verify that the library can communicate with your app.

```javascript
Kinvey.ping().then(function(response) {
  console.log('Kinvey Ping Success. Kinvey Service is alive, version: ' + response.version + ', response: ' + response.kinvey);
}).catch(function(error) {
  console.log('Kinvey Ping Failed. Response: ' + error.description);
});
```

## What’s next?
You are now ready to start building your awesome apps! Next we recommend diving into the [User guide](http://devcenter.kinvey.com/node-v3.0/guides/users) or [Data store guide](http://devcenter.kinvey.com/node-v3.0/guides/datastore) to learn more about our service, or explore the [sample apps](http://devcenter.kinvey.com/node-v3.0/samples) to go straight to working projects.

## License

    Copyright 2016 Kinvey, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
