require "roda"
require "tus/server"

require "./models/movie"

class ShrineTusDemo < Roda
  plugin :public

  plugin :render
  plugin :partials
  plugin :forme

  plugin :assets, js: "app.js", css: "app.css"

  use Rack::MethodOverride
  plugin :all_verbs

  plugin :indifferent_params

  # serve tus files through frontend server
  use Rack::Sendfile

  # log requests
  use Rack::CommonLogger

  route do |r|
    r.public # serve static assets
    r.assets # serve dynamic assets

    r.on "files" do
      r.run Tus::Server
    end

    r.root do
      r.redirect "/movies"
    end

    r.on "movies" do
      r.get true do
        @movies = Movie.all
        view("movies/index")
      end

      r.get "new" do
        @movie = Movie.new
        view("movies/new")
      end

      r.post true do
        movie = Movie.create(params[:movie])
        r.redirect "/movies"
      end

      r.on Integer do |id|
        @movie = Movie[id]

        r.get "edit" do
          view("movies/edit")
        end

        r.put do
          @movie.update(params[:movie])
          r.redirect "/movies"
        end

        r.delete do
          @movie.destroy
          r.redirect "/movies"
        end
      end
    end
  end
end
