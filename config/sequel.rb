require "sequel"

if ENV["DATABASE_URL"]
  DB = Sequel.connect(ENV.fetch("DATABASE_URL"))
else
  system "createdb shrine-tus-demo", err: "/dev/null"
  DB = Sequel.postgres("shrine-tus-demo")
end

DB.create_table! :movies do
  primary_key :id
  column :name, :varchar
  column :video_data, :text
end
