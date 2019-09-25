require "shrine"
require "shrine/storage/file_system"
require "shrine/storage/tus"
require "dry-monitor"

# this is required if running on Falcon web server
if defined?(Falcon)
  require "down/http"
  require "localhost/authority"

  # use Falcon's self-signed SSL certificate for downloading tus files from localhost
  downloader = Down::Http.new(ssl_context: Localhost::Authority.fetch.client_context)
end

Shrine.storages = {
  cache: Shrine::Storage::FileSystem.new("public", prefix: "uploads/cache"),
  store: Shrine::Storage::FileSystem.new("public", prefix: "uploads"),
  tus:   Shrine::Storage::Tus.new(downloader: downloader),
}

Shrine.plugin :sequel
Shrine.plugin :instrumentation, notifications: Dry::Monitor::Notifications.new(:test)
Shrine.plugin :cached_attachment_data
Shrine.plugin :restore_cached_data
