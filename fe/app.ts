import mime from "mime";

let recordings = [];
let loggedIn = false;
const btnLogin = document.getElementById("btn-login");

fetch("/api/users/self")
  .then(function (res) {
    return res.json();
  })
  .then((jsonData) => {
    if (jsonData.data._id) {
      setLoggedIn(true);
    }
  });

function setLoggedIn(loggedIn) {
  if (loggedIn) {
    btnLogin.remove();

    fetch("/api/recordings")
      .then((res) => res.json())
      .then((jsonData) => {
        const recordings = jsonData.data;
        setRecordings(recordings);
      });
  }
}

function setRecordings(arrRecordings) {
  recordings = arrRecordings;
  clipList.innerHTML = "";

  for (const recording of recordings) {
    clipList.appendChild(createClipElement({
      clipName: recording._id,
      audioURL: recording.signedUrl
    }))
  }
}

btnLogin.addEventListener("click", function () {
  const username = prompt("Username");
  const password = prompt("Password");

  fetch("/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      password,
    }),
  })
    .then((res) => {
      if (res.status === 200) {
        setLoggedIn(true);
      }
    })
    .catch((err) => {
      alert(err.message);
    });
});

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

    const blob = new Blob(chunks, { type: mediaRecorder.mimeType });

    const formData = new FormData();
    const file = new File(
      [blob],
      "recording." + mime.getExtension(mediaRecorder.mimeType)
    );
    formData.append("recording", file);

    chunks = [];
    const audioURL = URL.createObjectURL(blob);
    clipList.appendChild(createClipElement({ clipName, audioURL }));

    const postImageRes = fetch("/api/recordings", {
      method: "POST",
      body: formData,
    })
      .then(function (res) {
        return postImageRes.json();
      })
      .then(function (jsonData) {
        console.log(jsonData);
      });
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

function createClipElement({ clipName, audioURL }) {
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
  audio.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  clipContainer.appendChild(audio);

  audio.controls = true;
  audio.src = audioURL;
  return clipContainer;
}
