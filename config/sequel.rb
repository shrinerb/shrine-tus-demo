require "sequel"

DB = Sequel.sqlite

DB.create_table :movies do
  primary_key :id
  column :name, :varchar
  column :video_data, :text
end
