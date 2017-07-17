# Shrine Tus Demo

This is a demo app for the [tus resumable upload protocol], which integrates
[tus-ruby-server] and [tus-js-client] with [Shrine] file attachment library.

## Setup

* Run `bundle install`

* Run `gem install foreman`

* Run `foreman start`

## Integration

If you're familar with the flow for direct uploads in Shrine, integrating
`tus-ruby-server` with Shrine is very similar; on the client side you use a
specialized library for the tus.io resumable upload protocol, and there is more
work on the server side. This is how it works on the high level:

1. tus client (`tus-js-client`) uploads a file to the tus server (`tus-ruby-server`)
1. tus server returns the URL of the finished upload to the client
1. client submits the tus URL and file metadata to your app
1. uploaded file data is assigned as a Shrine attachment

When the client finishes uploading the file to the tus server, it should send
the uploaded file information to the server in the Shrine uploaded file JSON
format, so that it can be attached to the record. This is how you can construct
it using the `tus.Upload` JavaScript object from `tus-js-client`:

```js
var fileData = {
  id: upload.url,
  storage: "cache",
  metadata: {
    filename:  upload.file.name.match(/[^\/\\]+$/)[0], // IE returns full path
    size:      upload.file.size,
    mime_type: upload.file.type,
  }
};
```

Then you can either assign that to a hidden field and have it submitted when
user clicks a button, or you can send it directly to your main app in an AJAX
request. Since this hash format matches Shrine's uploaded file format, on the
server side you can now assign this file data directly to the attachment
attribute on the record.

```rb
class VideoUploader < Shrine
  # ...
end
```
```rb
class Movie < Sequel::Model
  include VideoUploader::Attachment.new(:video)
end
```
```rb
file_data #=> {"id":"http://tus-server.org/68db42638388ae645ab747b36a837a79", "storage":"cache", "metadata":{...}}
Movie.create(video: file_data)
```

For various options regarding integrating Shrine and tus-ruby-server see
[shrine-tus].

[tus resumable upload protocol]: http://tus.io
[tus-ruby-server]: https://github.com/janko-m/tus-ruby-server
[tus-js-client]: https://github.com/tus/tus-js-client
[Shrine]: https://github.com/janko-m/shrine
[shrine-tus]: https://github.com/janko-m/shrine-tus
