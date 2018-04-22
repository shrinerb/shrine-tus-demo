require "shrine"
require "shrine/storage/file_system"
require "shrine/storage/tus"

Shrine.storages = {
  cache: Shrine::Storage::FileSystem.new("public", prefix: "uploads/cache"),
  store: Shrine::Storage::FileSystem.new("public", prefix: "uploads/store"),
  tus:   Shrine::Storage::Tus.new(downloader: :http),
}

Shrine.plugin :sequel
Shrine.plugin :logging
Shrine.plugin :cached_attachment_data
