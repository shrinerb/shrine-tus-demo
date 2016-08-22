# Shrine Tus Demo

This is a demo app for the [tus resumable upload protocol] which integrates
[tus-ruby-server] with [Shrine] file attachments library.

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
[Shrine]: https://github.com/janko-m/shrine
