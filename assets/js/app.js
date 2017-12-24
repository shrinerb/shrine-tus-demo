var fileInput = document.querySelector('input[type=file]')
var wrapper   = fileInput.parentNode

uppy = Uppy.Core({ id: 'tus' })
  .use(Uppy.FileInput, {
    target:               wrapper,
    allowMultipleFiles:   false,
    replaceTargetContent: true
  })
  .use(Uppy.Tus, {
    endpoint: 'http://localhost:9000/'
  })
  .use(Uppy.ProgressBar, {
    target: wrapper
  })

uppy.run()

uppy.on('upload-success', function(fileId, data) {
  var file = uppy.getFile(fileId)

  var uploadedFileData = JSON.stringify({
    id: data.url,
    storage: "cache",
    metadata: {
      filename:  file.name,
      size:      file.size,
      mime_type: file.type,
    }
  });


  var hiddenInput = wrapper.parentNode.querySelector("input[type=hidden]");
  hiddenInput.value = uploadedFileData;

  var videoLink = wrapper.parentNode.querySelector('.video-preview a')
  videoLink.href = data.url
  videoLink.innerHTML = data.url
})
