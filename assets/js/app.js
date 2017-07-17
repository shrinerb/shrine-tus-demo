Object.assign(tus.defaultOptions, {
  endpoint: "http://localhost:9000/",
  retryDelays: [0, 1000, 3000, 6000, 10000],
});

document.querySelectorAll("input[type=file]").forEach(function(fileInput) {
  fileInput.addEventListener("change", function() {
    for (var i = 0; i < fileInput.files.length; i++) {
      var file = fileInput.files[i],
          progressBar = document.querySelector(".progress").cloneNode(true);

      fileInput.parentNode.insertBefore(progressBar, fileInput);

      var upload = new tus.Upload(file, {
        metadata: {
          "filename":     file.name, // for "Content-Type"
          "content_type": file.type, // for "Content-Disposition"
        },
      });

      upload.options.onProgress = function(bytesSent, bytesTotal) {
        var progress = parseInt(bytesSent / bytesTotal * 100, 10);
        var percentage = progress.toString() + '%';
        progressBar.querySelector(".progress-bar").style = "width: " + percentage;
        progressBar.querySelector(".progress-bar").innerHTML = percentage;
      };

      upload.options.onSuccess = function(result) {
        fileInput.parentNode.removeChild(progressBar);

        // custruct uploaded file data in the Shrine attachment format
        var fileData = {
          id: upload.url,
          storage: "cache",
          metadata: {
            filename:  file.name.match(/[^\/\\]+$/)[0], // IE returns full path
            size:      file.size,
            mime_type: file.type,
          }
        };

        // assign file data to the hidden field so that it's submitted to the app
        var hiddenInput = fileInput.parentNode.querySelector("input[type=hidden]");
        hiddenInput.value = JSON.stringify(fileData);

        urlElement = document.createElement("p");
        urlElement.innerHTML = upload.url;
        fileInput.parentNode.insertBefore(urlElement, fileInput.nextSibling);
      };

      upload.options.onError = function(error) {
        if (error.originalRequest.status == 0) { // no internet connection
          setTimeout(function() { upload.start() }, 5000);
        }
        else {
          alert(error);
        }
      };

      // start the tus upload
      upload.start();
    };

    // remove selected files
    fileInput.value = "";
  });
});
