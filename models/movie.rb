require "./config/sequel"
require "./uploaders/video_uploader"

class Movie < Sequel::Model
  include VideoUploader::Attachment.new(:video)
end
