const dropbox = document.querySelector("body"),
    fileElem = document.querySelector("#fileElem"),
    fileSelect = document.querySelector("#fileSelect"),
    download = document.querySelector("#download"),
    list = document.querySelector("#images"),
    canvas = document.querySelector("#out");
const ctx = canvas.getContext("2d");
let sorting = null;
let canvasUrl = null;

const zeropadding = (num, len = 2) => ("000000" + num).slice(-len);
const timestamp = (date = new Date(), delimiter = "_") => (
    ""
    + date.getFullYear()
    + zeropadding(1 + date.getMonth())
    + zeropadding(date.getDate())
    + delimiter
    + zeropadding(date.getHours())
    + zeropadding(date.getMinutes())
    + zeropadding(date.getSeconds())
);

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
    sorting = null;
    const loadPromises = [];
    for (let i = 0; i < files.length; i++) {//filesはargumentsのようなオブジェクト(Arrayでない)
        const file = files[i];
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        loadPromises.push(new Promise(resolve => {
            img.onload = function () {
                URL.revokeObjectURL(this.src);
                resolve(this);
            }
        }));
        const li = document.createElement("li");
        li.addEventListener("click", e => {
            if (sorting) {
                if (sorting != e.currentTarget) {
                    const img1 = e.currentTarget.querySelector("img");
                    e.currentTarget.appendChild(sorting.querySelector("img"));
                    sorting.appendChild(img1);
                    updateCanvas();
                }
                sorting.classList.remove("sorting");
                sorting = null;
            } else {
                sorting = e.currentTarget;
                sorting.classList.add("sorting");
            }
        }, false)
        list.appendChild(li).appendChild(img);
    }
    Promise.all(loadPromises).then(images => updateCanvas(images))
}

async function updateCanvas(images = list.querySelectorAll("img")) {
    if (images.length < 2) return;
    const imgUp = images[0];//list.querySelectorAll("img")[0];
    const imgLow = images[1];//list.querySelectorAll("img")[1];
    const { naturalWidth, naturalHeight } = imgUp;
    let [width, height, offsetX, offsetY] = [naturalWidth, naturalHeight, 0, 0];
    if (naturalWidth * 9 / 16 > naturalHeight - 0.5) {//iphone等16:9より横長
        width = naturalHeight * 16 / 9 | 0;
        offsetX = (naturalWidth - width) / 2 | 0;
    } else if (((naturalWidth - 2) * 9 / 16 + 32 - naturalHeight) ** 2 < 1) {//DMM win版
        width = naturalWidth - 2;
        height = naturalHeight - 32;
        offsetX = 1;
        offsetY = 31;
    }
    console.log({ width, height, offsetX, offsetY });
    const header = 0.0525 * width | 0, footer = 0.09025 * width | 0;
    height -= header + footer;
    console.log({ width, height, offsetX, offsetY });
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(imgUp, offsetX, offsetY + header, width, height, 0, 0, width, height);
    const frameLeft = width * 0.485 | 0;
    const frameTop = width * 0.015 | 0;
    const frameRight = width * 0.995 | 0;
    const frameCurve = width * 0.002 | 0;
    ctx.beginPath();
    ctx.moveTo(frameLeft, height);
    ctx.lineTo(frameLeft, frameTop + frameCurve);
    ctx.quadraticCurveTo(frameLeft, frameTop, frameLeft + frameCurve, frameTop)
    ctx.lineTo(frameRight - frameCurve, frameTop);
    ctx.quadraticCurveTo(frameRight, frameTop, frameRight, frameTop + frameCurve);
    ctx.lineTo(frameRight, height);
    ctx.fillStyle = "rgb(250,250,250)";
    ctx.fill();
    ctx.strokeStyle = "rgb(202,213,241)";
    ctx.stroke();
    const memoWidth = width * 0.4365 | 0;
    const memoHight = width * 0.09375 | 0;
    const marginTop = (height - frameTop - memoHight * 4) / 5 | 0;
    const marginLeft = (frameRight - frameLeft - memoWidth) / 2 | 0;
    const memoLeft = offsetX + width * 0.51875 | 0;
    const memoTop = [offsetY + width * 0.1890 | 0, offsetY + width * 0.3015 | 0, naturalHeight - width * 0.29335 - 0.015 * width | 0, naturalHeight - footer - memoHight - 0.015 * width | 0];
    ctx.drawImage(imgUp, memoLeft, memoTop[0], memoWidth, memoHight, frameLeft + marginLeft, frameTop + marginTop, memoWidth, memoHight);
    ctx.drawImage(imgUp, memoLeft, memoTop[1], memoWidth, memoHight, frameLeft + marginLeft, frameTop + marginTop * 2 + memoHight * 1, memoWidth, memoHight);
    ctx.drawImage(imgLow, memoLeft, memoTop[2], memoWidth, memoHight, frameLeft + marginLeft, frameTop + marginTop * 3 + memoHight * 2, memoWidth, memoHight);
    ctx.drawImage(imgLow, memoLeft, memoTop[3], memoWidth, memoHight, frameLeft + marginLeft, frameTop + marginTop * 4 + memoHight * 3, memoWidth, memoHight);
    // canvas.toBlob((blob)=>{
    //     const item = new ClipboardItem({ "image/png": blob });
    //     navigator.clipboard.write([item]).then(()=>alert("Copied! paste it on paint"));
    // });
    canvas.toBlob(blob => {
        if (canvasUrl) URL.revokeObjectURL(canvasUrl);
        canvasUrl = URL.createObjectURL(blob);
        download.href = canvasUrl;
        download.setAttribute("download", timestamp());
    });
}

dropbox.addEventListener("dragover", stopEvent, false);
dropbox.addEventListener("drop", drop, false);
fileElem.addEventListener("change", function () { hundleFiles(this.files); }, false);
fileSelect.addEventListener("click", () => fileElem.click(), false);