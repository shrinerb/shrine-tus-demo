# Shrine Tus Demo

This is a demo app for the [tus resumable upload protocol], which integrates
[tus-ruby-server] and [tus-js-client] with [Shrine] file attachment library.

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
var file_data = {
  id: upload.url,
  storage: "cache",
  metadata: {
    filename:  upload.file.name.match(/[^\/\\]+$/)[0], // IE returns full path
    size:      upload.file.size,
    mime_type: upload.file.type,
  }
}
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

All that's left now is to specify how you want the uploaded file to be moved
from the tus storage to permanent Shrine storage. At first this might sound
like it defeats the whole purpose of completing a large file upload, if we're
going to re-upload it again somewhere else. But it's not actually that bad for
a few reasons:

* treating the tus storage as temporary allows `tus-ruby-server` to easily
  delete old unfinished and finished uploads, and the latter is needed because
  not all finished uploads will necessarily be attached to the record at the
  end

* "different storages" is just an abstract concept, tus storage and permanent
  storage could just be different directires inside the same Amazon S3 bucket,
  and copying an S3 object between directories can be very efficient (see
  approach **C**)

There are three ways in which you can copy the file through the tus server to
permanent Shrine storage, which one you will choose depends on whether you want
lower coupling or higher performance.

### Approach A: Downloading through the tus server

The simplest apporach is to use [shrine-tus] as the temporary Shrine storage,
which allows you to treat a file located at a tus URL as a cached file. You
could either register `Shrine::Storage::Tus` as a global `:cache` storage, or
register it under a different name and then load it in uploaders that you will
use `tus-ruby-server` for.

```rb
gem "shrine-tus"
gem "shrine-url", "~> 0.3" # dependency of Shrine::Storage::Tus
```
```rb
require "shrine/storage/tus"

Shrine.storages = {
  cache: Shrine::Storage::YourTemporaryStorage.new(...),
  store: Shrine::Storage::YourPermanentStorage.new(...),
  tus:   Shrine::Storage::Tus.new,
}
```
```rb
class VideoUploader < Shrine
  storages[:cache] = storages[:tus] # use Shrine::Storage::Tus as temporary storage
end
```

`Shrine::Storage::Tus` is a subclass of `Shrine::Storage::Url`, and while
`Shrine::Storage::Url` by default uses [Down] for downloading files,
`Shrine::Storage::Tus` uses `wget` by default. The main advantage of using
`wget` is that it can automatically resume the download on network failures,
which are more likely to happen on downloads of large files.

One limitation of `wget` is that it doesn't support partial downloads, so if
you want to use the `restore_cached_data` Shrine plugin, you should switch to
using Down:

```rb
Shrine::Storage::Tus.new(downloader: :down) # uses Down gem for downloading instead of wget
```

### Approach B: Downloading directly from the storage

While approach **A** is simple and agnostic to the implemetation of the tus
server, downloading the uploaded file through the tus server has some
performance implications:

* The file will have to temporarily be downloaded to disk before it is uploaded
  to permanent storage, so you need to ensure that your main server has enough
  disk space to support this.

* Downloading files though the tus server may impact its request throughput,
  because on popular web servers like Puma, Unicorn and Passenger the workers
  need to wait until the whole file is downloaded before they become available
  again to serve other requests.

* If tus-ruby-server is hosted on Heroku or otherwise its web server has a
  request timeout configured, the request might time out before the file
  manages to get fully downloaded, depending on the size of the file and
  network conditions.

Instead of downloading the uploaded file through the tus server, you could
bypass the tus server and download from the underlying storage directly. Note
if you're using filesystem storage this would require that the tus server and
your main app share the same disk.

`Shrine::Storage::Tus` can be configured to download files directly from the
tus storage (using the common interface that all tus storages share), you just
need to give it the tus storage instance.

```rb
gem "shrine-tus"
gem "shrine-url", "~> 0.3" # dependency of Shrine::Storage::Tus
```
```rb
require "shrine/storage/tus"

# or just use `Tus::Server.opts[:storage]` if tus-ruby-server runs inside your main app
require "tus/storage/your_storage"
tus_storage = Tus::Storage::YourStorage.new(...)

Shrine.storages = {
  cache: Shrine::Storage::YourTemporaryStorage.new(...),
  store: Shrine::Storage::YourPermanentStorage.new(...),
  tus:   Shrine::Storage::Tus.new(tus_storage: tus_storage),
}
```
```rb
class VideoUploader < Shrine
  storages[:cache] = storages[:tus] # use Shrine::Storage::Tus as temporary storage
end
```

### Approach C: Utilizing storage-specific optimizations

Approach **B** is probably best in terms of performance if you're using a
different kind of permanent storage than the one tus-ruby-server uses. But if
you want to use the **same kind of permanent storage as your tus server uses**,
you can optimize the file transfer from tus storage to permanent Shrine storage
even further by utilizing storage-specific optimizations that Shrine storages
have built-in.

In order to achieve this, instead of using `Shrine::Storage::Tus` as your
temporary Shrine storage as we did in approaches **A** and **B**, we will be
using a regular Shrine storage which will match the storage that
tus-ruby-server uses. In other words, your Shrine storage and your tus storage
would reference the same files. So, if your tus-ruby-server is configured with
one of the following storages:

```rb
Tus::Server.opts[:storage] = Tus::Storage::Filesystem.new("data")
Tus::Server.opts[:storage] = Tus::Storage::Gridfs.new(client: mongo, prefix: "tus")
Tus::Server.opts[:storage] = Tus::Storage::S3.new(prefix: "tus", **s3_options)
```

Then Shrine should be configured with one of the following temporary storages:

```rb
Shrine.storages[:cache] = Shrine::Storage::FileSystem.new("data")
Shrine.storages[:cache] = Shrine::Storage::Gridfs.new(client: mongo, prefix: "tus")
Shrine.storages[:cache] = Shrine::Storage::S3.new(prefix: "tus", **s3_options)
```

In options **A** and **B** we didn't need to change the file data received from
the client, because we were using a subclass of `Shrine::Storage::Url`, which
accepts the `id` field as a URL. But with this approach the `id` field will
need to be translated from the tus URL to the correct ID for your temporary
Shrine storage. Luckily, [shrine-tus] comes with a `tus` plugin that will
automatically make this translation for you.

```rb
gem "shrine-tus"
```
```rb
Shrine.storages = {
  cache: Shrine::Storage::YourTemporaryStorage.new(...),
  store: Shrine::Storage::YourPermanentStorage.new(...),
}
```
```rb
class VideoUploader < Shrine
  plugin :tus
end
```

* `Shrine::Storage::FileSystem` will have roughly the same performance as in
  option **B**, but if you also load the `moving` plugin, Shrine will execute a
  `mv` command between the tus storage and permanent storage, which is
  instantaneous regardless of the filesize.

  ```rb
  Shrine.plugin :moving
  ```

* `Shrine::Storage::Gridfs` will use more efficient copying, resulting in a
  2x speedup in my benchmarks.

* `Shrine::Storage::S3` will issue a single S3 COPY request for files smaller
  than 100MB, while files 100MB or larger will be divided into multiple chunks
  which will be copied individually and in parallel using S3's multipart API.

Note that it's **not** recommended to use the `delete_promoted` Shrine plugin
with this approach, because depending on the tus storage implementation it
could cause HEAD requests to `tus-ruby-server` to return a success for files
that were deleted by Shrine.

[tus resumable upload protocol]: http://tus.io
[tus-ruby-server]: https://github.com/janko-m/tus-ruby-server
[tus-js-client]: https://github.com/tus/tus-js-client
[Shrine]: https://github.com/janko-m/shrine
[shrine-tus]: https://github.com/janko-m/shrine-tus
[Down]: https://github.com/janko-m/down
[expiration]: https://github.com/janko-m/tus-ruby-server#expiration
