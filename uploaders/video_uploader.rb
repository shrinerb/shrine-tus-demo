require "./config/shrine"

class VideoUploader < Shrine
  plugin :determine_mime_type
  plugin :restore_cached_data
end
