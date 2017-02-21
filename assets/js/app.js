jQuery(function() {
  $("input[type=file]").on("change", function(e) {
    var file      = e.target.files[0],
        fileField = $(e.target),
        metadata  = {};

    fileField.val("");

    if (file.name != "") { metadata["filename"]     = file.name; }
    if (file.type != "") { metadata["content_type"] = file.type; }

    var upload = new tus.Upload(file, {
      endpoint: "/files",
      chunkSize: 0.5*1024*1204,
      retryDelays: [0, 1000, 3000, 6000, 10000],
      metadata: metadata,
      onError: function(error) {
        if (error.originalRequest.status == 0) { // no internet connection
          setTimeout(function() { upload.start() }, 5000);
        }
        else alert(error);
      },
      onProgress: function(bytesSent, bytesTotal) {
        var progress = parseInt(bytesSent / bytesTotal * 100, 10);
        var percentage = progress.toString() + '%';
        progressBar.find(".progress-bar").css("width", percentage).html(percentage);
      },
      onSuccess: function(result) {
        progressBar.remove();

        var file = {
          storage: "cache",
          id: upload.url,
          metadata: {
            filename:  upload.file.name.match(/[^\/\\]+$/)[0], // IE returns full path
            size:      upload.file.size,
            mime_type: upload.file.type,
          }
        }

        fileField.prev().val(JSON.stringify(file));
        fileField.after($('<p>' + upload.url + '</p>'));
      }
    });

    var progressBar = $('<div class="progress" style="width: 300px"><div class="progress-bar"></div></div>').insertBefore(e.target);

    upload.start();
  })
});
