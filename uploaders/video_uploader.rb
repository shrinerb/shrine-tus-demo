require "./config/shrine"

class VideoUploader < Shrine
  storages[:cache] = storages[:tus] # use Shrine::Storage::Tus as temporary storage
end
