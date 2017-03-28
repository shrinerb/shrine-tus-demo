require "./config/shrine"

class VideoUploader < Shrine
  plugin :determine_mime_type
  plugin :delete_promoted
end
