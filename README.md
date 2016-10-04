# Shrine Tus Demo

This is a demo app for the [tus resumable upload protocol] which integrates
[tus-ruby-server] with [Shrine] file attachments library.

Once [tus-js-client] uploads the file to [tus-ruby-server], it assigns the
file URL to the hidden field in form of an uploaded file. Attaching files
defined by a custom URL is possible because of [shrine-url], which is used as
the `:cache` storage.

```rb
gem "shrine-url"
```
```rb
Shrine.storages = {
  cache: Shrine::Storage::Url.new, # we save URLs to files served by the tus server
  store: Shrine::Storage::YourMainStorage.new(...),
}
```

Then in your JavaScript you should assign the URL of the tus file to the `id`
field of the uploaded file representation, and this way the file uploaded to
the tus server effectively acts as a cached file, so it can be assigned to the
hidden attachment field and attached to a model.

```js
var file = {
  storage: "cache",
  id: urlToFile,
  metadata: {...},
}
```

See the [shrine-url] README for info on how this works.

## Requirements

You need to have the following:

* Amazon S3 account
* SQLite

## Setup

* Add .env with your Amazon S3 credentials:

  ```sh
  # .env
  S3_BUCKET="..."
  S3_REGION="..."
  S3_ACCESS_KEY_ID="..."
  S3_SECRET_ACCESS_KEY="..."
  ```

* Run `bundle install`

* Run `bundle exec rackup`

[tus resumable upload protocol]: http://tus.io
[tus-ruby-server]: https://github.com/janko-m/tus-ruby-server
[tus-js-client]: https://github.com/tus/tus-js-client
[Shrine]: https://github.com/janko-m/shrine
[shrine-url]: https://github.com/janko-m/shrine-url
