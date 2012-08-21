# Kinvey

Kinvey JavaScript Library for Node.js. Kinvey is a Backend as a Service platform that makes it ridiculously easy for developers to setup and operate backends for their mobile, tablet and web apps.

## How to use

### 1. Sign up for Kinvey
To use the library, sign up for Kinvey if you have not already done so. Go to the [sign up](https://console.kinvey.com/#signup) page, and follow the steps provided.

### 2. Install the library
You can setup the library in two ways. You can either install the module directly through `npm`:

	npm install kinvey

Or alternatively, clone the repository and create a symbolic link to the module:

	git clone git@github.com:Kinvey/kinvey-nodejs.git
	cd kinvey-nodejs
	npm link

Now, the library is available for use in your project. Use `require` to import the library. `require` will return the Kinvey namespace.

```js
var Kinvey = require('kinvey');
```

### 3. Initialize the library

Once you have imported the library, it is time to initialize it. To do so, you’ll need the `App Key` and `App Secret` of your application. You can find these keys when you click on an the application in the console.

```js
Kinvey.init({
  appKey: '<your-app-key>',
  appSecret: '<your-app-secret>'
});
```

### 4. Use it
As a first example, we will show you how to save an item on Kinvey. The following code snippet saves a book. We use the first parameter of `Kinvey.Entity` to specify in which collection we want to save this book.

```js
var book = new Kinvey.Entity({
  title: 'Awesome Arms',
  author: 'Robert Kennedy'
}, 'book');
book.save({
  success: function(response) {
    // response is the book object.
  },
  error: function(error) {
    // error contains a error and description field indicating what exactly went wrong.
  }
});
```

At a later stage, you might want to retrieve all books written by a certain author. Therefore, you can use the `Kinvey.Collection` class.

```js
// First, build a query to match the author.
var query = new Kinvey.Query();
query.on('author').equal('Robert Kennedy');

// Create a collection, and pass in the query.
var bookCollection = new Kinvey.Collection('book', { query: query });
bookCollection.fetch({
  success: function(list) {
    // list is an array of books written by Kennedy.
  },
  error: function(error) {
    // error contains a error and description field indicating what exactly went wrong.
  }
});
```

## What’s next?
The example shown above only shows a very small subset of all features the library offers. To learn more:

* Read about our APIs in the [JavaScript Developer’s Guide](http://docs.kinvey.com/js-developers-guide.html)
* Try saving and loading data using the [JavaScript Appdata API](http://docs.kinvey.com/js-developers-guide.html#appdata)
* Consult the [JavaScript API Docs](http://docs.kinvey.com/js-api-reference.html) for detailed information on all available methods