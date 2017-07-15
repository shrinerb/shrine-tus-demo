require "./config/shrine"

class TusUploader < Shrine
  # use Shrine::Storage::Tus as temporary storage
  plugin :default_storage, cache: :tus
end
