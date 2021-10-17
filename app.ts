let audioIN = { audio: true };

let recording = false;
const btnRecord = document.getElementById("btn-record");

try {
  navigator.mediaDevices.getUserMedia(audioIN).then(function (mediaStreamObj) {
    alert("got media")
    let mediaRecorder = new MediaRecorder(mediaStreamObj);

    btnRecord.addEventListener('click', function (ev) {
      alert("clicked")
      btnRecord.classList.toggle("btn-record_recording")
      if (recording) {
        mediaRecorder.stop();
      } else {
        mediaRecorder.start();
      }
    })
  }).catch((err) =>{ alert(err.message) })
} catch(err) {
  alert(err.message)
}

