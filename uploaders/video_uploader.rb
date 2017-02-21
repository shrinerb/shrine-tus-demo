require "./config/shrine"

class VideoUploader < Shrine
  plugin :determine_mime_type
end
