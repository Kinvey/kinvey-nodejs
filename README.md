# Kinvey NodeJS SDK
[Kinvey](http://www.kinvey.com) (pronounced Kin-vey, like convey) makes it ridiculously easy for developers to setup, use and operate a cloud backend for their mobile apps. They don't have to worry about connecting to various cloud services, setting up servers for their backend, or maintaining and scaling them.

This node module makes it very easy to connect your NodeJS app with Kinvey.

## How to use

#### 1. Sign up for Kinvey
To use the SDK, sign up for Kinvey if you have not already done so. Go to the [sign up](https://console.kinvey.com/#signup) page, and follow the steps provided.

#### 2. Install the SDK
You can install the module using npm:

```bash
npm install kinvey-node-sdk --save
```

#### 3. Configure the SDK
Import the library in your code using `require`.

```javascript
var Kinvey = require('kinvey-node-sdk');
```

Next, use `Kinvey.init` to configure your app. Replace `<appKey>` and `<appSecret>` with your apps app key and secret. You can find these for your app using the [Kinvey Console App](https://console.kinvey.com).

```javascript
Kinvey.init({
    appKey: '<appKey>',
    appSecret: '<appSecret>'
});
```

#### 4. Verify Set Up
You can use the following snippet to verify the app credentials were entered correctly. This function will contact the backend and verify that the SDK can communicate with your app.

```javascript
Kinvey.ping().then(function(response) {
  console.log('Kinvey Ping Success. Kinvey Service is alive, version: ' + response.version + ', response: ' + response.kinvey);
}).catch(function(error) {
  console.log('Kinvey Ping Failed. Response: ' + error.message);
});
```

## What’s next?
You are now ready to start building your awesome apps! Next we recommend diving into the [User guide](http://devcenter.kinvey.com/node-v3.0/guides/users) or [Data store guide](http://devcenter.kinvey.com/node-v3.0/guides/datastore) to learn more about our service, or explore the [sample apps](http://devcenter.kinvey.com/node-v3.0/samples) to go straight to working projects.

## Build
The simplest way to build the sdk is by running `gulp`. More advanced tasks are available.

* `gulp build`: build the sdk
* `gulp bump`: bump the pacakge version. Please see [Flags](#Flags).
* `gulp clean`: remove files created by the build process
* `gulp lint`: lint the src files
* `gulp tag`: create a git tag for the version

#### Flags
The following flags are available when running `gulp bump`:

* `--type <major|minor|patch|prerelease>`: Bumps the package version using the [Semantic Version 2.0.0](http://semver.org/) spec. Defaults to `patch`.
* `--version <version>`: Sets the package version to the provided version.

## Test

You can run the tests using `npm test`.

## Release
The workflow for releasing a new version of the sdk is as follows:

1. Commit all changes on the develop branch.
2. Checkout the master branch and merge the develop branch.
3. Update the [Changelog](CHANGELOG.md).
4. Run `gulp bump --type <type>` replacing `<type>` with major, minor, patch, or prerelease. See [Flags](#Flags) above.
5. Run `gulp build` and commit file changes.
6. Run `gulp tag`.
7. Make sure all changes are committed on the master branch and push.
8. Checkout the develop branch and merge the master branch.
9. __Optional:__ Update Dev Center and Sample apps.

*Note: The [Node Release Job](https://build.kinvey.com/jenkins/view/Libraries/job/node-sdk-release/) will publish the [pacakge](https://www.npmjs.com/package/kinvey-node-sdk) on NPM.*

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
