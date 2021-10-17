let audioIN = { audio: true };

let recording = false;
const btnRecord = document.getElementById("btn-record");
const clipList = document.getElementById("clip-list");
let mediaRecorder = null;

try {
  navigator.mediaDevices
    .getUserMedia(audioIN)
    .then(function (mediaStreamObj) {
      btnRecord.addEventListener("click", function (ev) {
        btnRecord.classList.toggle("recording");
        if (recording) {
          stopRecording();
        } else {
          mediaRecorder = startRecording(mediaStreamObj);
        }
        recording = !recording;
      });
    })
    .catch((err) => {
      alert(err.message);
    });
} catch (err) {
  alert(err.message);
}

function startRecording(mediaStreamObj) {
  let mediaRecorder = new MediaRecorder(mediaStreamObj);
  let chunks = [];

  mediaRecorder.onstop = function (e) {
    let clipName = prompt("Enter a name for your sound clip");
    if (!clipName) {
      clipName = new Date().toLocaleDateString();
    }

    const clipContainer = document.createElement("div");
    clipContainer.classList.add("clip");

    clipContainer.addEventListener("click", function () {
      clipContainer.classList.toggle("clip__selected");
    });

    const clipLabel = document.createElement("div");
    clipLabel.classList.add("clip-label");
    clipLabel.innerHTML = clipName;
    clipContainer.appendChild(clipLabel);

    const audio = document.createElement("audio");

    audio.setAttribute("controls", "");
    audio.addEventListener("click", function(e) {
      e.stopPropagation();
    });

    clipContainer.appendChild(audio);
    clipList.appendChild(clipContainer);

    audio.controls = true;
    const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
    chunks = [];
    const audioURL = URL.createObjectURL(blob);
    audio.src = audioURL;
  };

  mediaRecorder.ondataavailable = function (e) {
    chunks.push(e.data);
  };

  mediaRecorder.start();

  return mediaRecorder;
}

function stopRecording() {
  if (mediaRecorder) {
    mediaRecorder.stop();
  }
}
