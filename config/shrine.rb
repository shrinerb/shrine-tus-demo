require "shrine"
require "shrine/storage/url"
require "shrine/storage/s3"
require "./jobs/promote_job"
require "./jobs/delete_job"

require "dotenv"
Dotenv.load

class TusUrl < Shrine::Storage::Url
  private

  # Make HEAD and DELETE requests work from #exists? and #delete
  def request(*args)
    super do |req|
      req["Tus-Resumable"] = "1.0.0"
    end
  end
end

Shrine.storages = {
  cache: TusUrl.new,
  store: Shrine::Storage::S3.new(
    bucket:             ENV.fetch("S3_BUCKET"),
    region:             ENV.fetch("S3_REGION"),
    access_key_id:      ENV.fetch("S3_ACCESS_KEY_ID"),
    secret_access_key:  ENV.fetch("S3_SECRET_ACCESS_KEY"),
  ),
}

Shrine.plugin :sequel
Shrine.plugin :logging
Shrine.plugin :backgrounding
Shrine.plugin :cached_attachment_data

Shrine::Attacher.promote { |data| PromoteJob.perform_async(data) }
Shrine::Attacher.delete { |data| DeleteJob.perform_async(data) }
