// This code uses:
//
// * babel-polyfill (https://babeljs.io/docs/usage/polyfill/)
// * tus-js-client (https://github.com/tus/tus-js-client)
// * uppy (https://uppy.io)

document.querySelectorAll('input[type=file]').forEach(function (fileInput) {
  fileInput.style.display = 'none' // uppy will add its own file input

  uppy = Uppy.Core({ id: fileInput.id })
    .use(Uppy.FileInput, {
      target: fileInput.parentNode,
    })
    .use(Uppy.Tus, {
      endpoint: '/files',
    })
    .use(Uppy.ProgressBar, {
      target: fileInput.parentNode,
    })

  uppy.run()

  uppy.on('upload-success', function(file, data) {
    var uploadedFileData = JSON.stringify({
      id: data.url,
      storage: "cache",
      metadata: {
        filename:  file.name,
        size:      file.size,
        mime_type: file.type,
      }
    })

    var hiddenInput = document.getElementById(fileInput.dataset.uploadResultElement)
    hiddenInput.value = uploadedFileData

    var videoLink = document.getElementById(fileInput.dataset.previewElement)
    videoLink.href = data.url
    videoLink.innerHTML = data.url
  })
})
