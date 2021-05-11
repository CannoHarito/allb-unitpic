const dropbox = document.querySelector("body"),
    fileElem = document.querySelector("#fileElem"),
    list = document.querySelector("#images"),
    canvas = document.querySelector("#out");

let imageNum = 0;
function stopEvent(e) {
    // e.stopPropagation();
    e.preventDefault();
}
function drop(e) {
    e.preventDefault();
    const files = e.dataTransfer.files
    fileElem.files = files;
    hundleFiles(files)
}

function hundleFiles(files) {
    if (!files.length) return;
    list.innerHTML = "";
    imageNum = 0;
    for (let i = 0; i < files.length; i++) {//filesはargumentsのようなオブジェクト(Arrayでない)
        const file = files[i];
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.onload = function () {
            URL.revokeObjectURL(this.src);
            imageNum++;
        }
        list.appendChild(img);
    }
}
const ctx = canvas.getContext("2d");
function updateCanvas() {
    if (imageNum < 2) return;
    const imgUp = list.querySelectorAll("img")[0];
    const imgLow = list.querySelectorAll("img")[1];
    ctx.drawImage(imgUp, 5, 134, 2470, 1235, 0, 0, 2470, 1235);
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(imgUp, 5, 134, 50, 1235, -2470, 0, 50, 1235);
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(1265, 1235);
    ctx.lineTo(1265, 45);
    ctx.quadraticCurveTo(1265, 40, 1270, 40)
    ctx.lineTo(2435, 40);
    ctx.quadraticCurveTo(2440, 40, 2440, 45);
    ctx.lineTo(2440, 1235);
    ctx.fillStyle = "rgb(250,250,250)";
    ctx.fill();
    ctx.strokeStyle = "rgb(202,213,241)";
    ctx.stroke();
    const memoHight = 240
    const yohakuH = (1235 - 40 - memoHight * 4) / 5 | 0
    const yohakuW = (2440 - 1265 - 1117) / 2 | 0
    ctx.drawImage(imgUp, 1325, 484, 1117, memoHight, 1265 + yohakuW, 40 + yohakuH, 1117, memoHight);
    ctx.drawImage(imgUp, 1325, 772, 1117, memoHight, 1265 + yohakuW, 40 + yohakuH * 2 + memoHight * 1, 1117, memoHight);
    ctx.drawImage(imgLow, 1325, 849, 1117, memoHight, 1265 + yohakuW, 40 + yohakuH * 3 + memoHight * 2, 1117, memoHight);
    ctx.drawImage(imgLow, 1325, 1130, 1117, memoHight, 1265 + yohakuW, 40 + yohakuH * 4 + memoHight * 3, 1117, memoHight);
    // canvas.toBlob(function (blob) {
    //     const item = new ClipboardItem({ "image/png": blob });
    //     navigator.clipboard.write([item]);
    //     alert("Copied! paste it on paint");
    // });
}

// dropbox.addEventListener("dragenter", stopEvent, false);
dropbox.addEventListener("dragover", stopEvent, false);
dropbox.addEventListener("drop", drop, false);
fileElem.addEventListener("change", function () { hundleFiles(this.files); }, false);

document.querySelector("button").addEventListener("click", updateCanvas, false);

