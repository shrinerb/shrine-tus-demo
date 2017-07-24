require "tus/server"
require "goliath/rack_proxy"

class TusApp < Goliath::RackProxy
  rack_app Tus::Server
  rewindable_input false # set to true if using checksums
end
