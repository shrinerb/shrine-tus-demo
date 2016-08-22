jQuery(function() {
  $("input[type=file]").on("change", function(e) {
    var file = e.target.files[0];
    var fileField = $(e.target)

    fileField.val("");

    var upload = new tus.Upload(file, {
      endpoint: "http://localhost:9292/files",
      metadata: {filename: file.name, content_type: file.type},
      onError: function(error) {
        alert(error);
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
