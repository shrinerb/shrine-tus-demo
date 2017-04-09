require "shrine"
require "shrine/storage/s3"
require "shrine/storage/tus"
require "./jobs/promote_job"
require "./jobs/delete_job"

require "dotenv"
Dotenv.load

s3_options = {
  bucket:             ENV.fetch("S3_BUCKET"),
  region:             ENV.fetch("S3_REGION"),
  access_key_id:      ENV.fetch("S3_ACCESS_KEY_ID"),
  secret_access_key:  ENV.fetch("S3_SECRET_ACCESS_KEY"),
}

Shrine.storages = {
  cache: Shrine::Storage::S3.new(prefix: "cache", **s3_options), # not used for tus
  store: Shrine::Storage::S3.new(prefix: "store", **s3_options),
  tus:   Shrine::Storage::Tus.new,
}

Shrine.plugin :sequel
Shrine.plugin :logging
Shrine.plugin :backgrounding
Shrine.plugin :cached_attachment_data

Shrine::Attacher.promote { |data| PromoteJob.perform_async(data) }
Shrine::Attacher.delete { |data| DeleteJob.perform_async(data) }
