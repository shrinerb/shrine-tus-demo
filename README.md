# Shrine Tus Demo

This is a Ruby demo app for integrating the [tus resumable upload protocol]
with [Shrine]. It uses [Uppy] powered by [tus-js-client] for resumable uploads
to a [tus-ruby-server], and attaches the uploaded file with the help of
[shrine-tus]. The app runs on the [Falcon] web server, because tus-ruby-server
benefits from Falcon's asynchronous streaming of requests and responses.

## Setup

* Run `bundle install`
* Run `bundle exec falcon serve`

## Guide

### Configuring tus-ruby-server

First you'll need to add the necessary gems to your Gemfile:

```rb
# Gemfile
gem "shrine", "~> 2.0"     # File attachments
gem "tus-server", "~> 2.0" # HTTP API for tus resumable upload protocol
gem "shrine-tus", "~> 1.2" # Glue between Shrine and tus-server
```

In this demo we're running the tus server alongside our main application. The
tus server is mounted on `/files`, so this has to be the value of the
`:endpoint` option for the tus client.

By default the tus server will save uploaded files to the `data/` directory on
disk. However, you can still choose a different directory, or even a different
storage; see the [documentation][tus-ruby-server storages] for more details.

Note that the storage that the tus server uses will only be temporary; once the
file is uploaded to `tus-ruby-server` and assigned as record's attachment,
Shrine will take that file and re-upload it to the Shrine's permanent storage.
This separation allows you to easily [clear unfinished or unattached
uploads][tus-ruby-server expiration]

### Configuring Shrine and shrine-tus

This demo uses the "[Approach A]" of hooking up `shrine-tus`, which is to use
`Shrine::Storage::Tus` (subclass of `Shrine::Storage::Url`) for the temporary
Shrine storage. This approach is nice because it decouples your app from the
tus server implementation.

The Shrine storages can be configured in a way that allows you to use the tus
server only for some attachments (normally large ones), while other attachments
can still accept files in the standard way.

```rb
require "shrine"
require "shrine/storage/file_system"
require "shrine/storage/tus"

Shrine.storages = {
  cache: Shrine::Storage::FileSystem.new("public", prefix: "uploads/cache"),
  store: Shrine::Storage::FileSystem.new("public", prefix: "uploads"),
  tus:   Shrine::Storage::Tus.new,
}
```

Then you can add a `TusUploader` abstract class which changes the default
temporary storage to `Shrine::Storage::Tus`:

```rb
class TusUploader < Shrine
  # use Shrine::Storage::Tus for temporary storage
  storages[:cache] = storages[:tus]
end
```

Now every uploader that you want to accept uploaded files from tus server can
inherit from `TusUploader`:

```rb
class VideoUploader < TusUploader
  # ...
end
```
```rb
class Movie < Sequel::Model
  include VideoUploader::Attachment.new(:video)
end
```

### JavaScript

If you're familar with the flow for direct uploads in Shrine, integrating
`tus-ruby-server` with Shrine is very similar; on the client side you use a
specialized library that talks the tus resumable upload protocol, and assign
the uploaded file data instead of the raw file. This is how it works on the
high level:

1. tus client (`tus-js-client`) uploads a file to the tus server (`tus-ruby-server`)
1. tus server returns the URL of the finished upload to the client
1. client submits the tus URL and file metadata to your app
1. uploaded file data is assigned as a Shrine attachment

When the client finishes uploading the file to the tus server, it should send
the uploaded file information to the server in the Shrine uploaded file JSON
format, so that it can be attached to the record.

```rb
{
  "id": "http://localhost:9292/files/a0099970b2228b936e2fb413dffb402d",
  "storage": "cache",
  "metadata": {
    "filename": "nature.jpg",
    "size": 1342347,
    "mime_type": "image/jpeg"
  }
}
```

You can assign the uploaded file data to the hidden attachment field to be
submitted with the form, or send it immediately to the app in an AJAX request.
The only important thing is that the param name matches Shrine's attachment
attribute name.

### Attachment

Since the hash format above matches Shrine's uploaded file format, on the
server side you can now assign this file data directly to the attachment
attribute on the record.

```rb
file_data #=> "{\"id\":\"http://localhost:9292/files/68db42638388ae645ab747b36a837a79\",\"storage\":\"cache\",\"metadata\":{...}}"
Movie.create(video: file_data)
```

You can use the [backgrounding] Shrine plugin if you want the file to be
re-uploaded from tus server to permanent storage in a background job. This is
especially useful if you also want to do some file [processing] before
uploading to permanent storage.

For various options regarding integrating Shrine and tus-ruby-server see the
[shrine-tus] documentation.

[tus resumable upload protocol]: https://tus.io
[Shrine]: https://github.com/shrinerb/shrine
[Uppy]: https://uppy.io
[tus-js-client]: https://github.com/tus/tus-js-client
[tus-ruby-server]: https://github.com/janko/tus-ruby-server
[shrine-tus]: https://github.com/shrinerb/shrine-tus
[Falcon]: https://github.com/socketry/falcon
[Approach A]: https://github.com/shrinerb/shrine-tus/blob/552a96ce4e065f6d95f4077441eca93488e85482/README.md#approach-a-downloading-through-tus-server
[tus-ruby-server storages]: https://github.com/janko/tus-ruby-server#storage
[tus-ruby-server expiration]: https://github.com/janko/tus-ruby-server#expiration
[backgrounding]: https://shrinerb.com/rdoc/classes/Shrine/Plugins/Backgrounding.html
[processing]: https://shrinerb.com/rdoc/files/doc/processing_md.html
