import { Drawing, Source } from "./source.js";
const fileElem = document.querySelector("#fileElem"),
    download = document.querySelector("#download"),
    // list = document.querySelector("#images"),
    canvas = document.querySelector("#out");
const ctx = canvas.getContext("2d");
// let sorting = null;

const int = Math.trunc;

const timestamp = (date = new Date(), delimiter = "_") =>
    date.toLocaleString("sv").replace(/\D/g, a => a == " " ? delimiter : "");

const loadImage = file => new Promise(resolve => {
    const img = new Image();
    img.addEventListener("load", () => {
        URL.revokeObjectURL(img.src);
        resolve(img);
    });
    img.src = URL.createObjectURL(file);
});

const luminance = (array, i = 0) =>
    int(0.299 * array[i] + 0.587 * array[i + 1] + 0.114 * array[i + 2]);

const isCloseTo = (a, b, diff = 10) => Math.abs(a - b) < diff;

const readScrollbar = source => {
    const testRange = { xp: 0.5, yp: 0.5, xd: 0.9750, w: 5, h: 5 },
        yds = [{ yd: 0.1705 }, { yf: 1, yd: -0.1005 }];
    const [top, bottom] = yds.map(o => {
        const data = source.getImageData(testRange, o).data;
        const luminances = [255];
        for (let i = 0; i < data.length; i += 4)
            luminances.push(luminance(data, i));
        return Math.min(...luminances);
    });
    if (isCloseTo(top, 136) && isCloseTo(bottom, 246)) return "top";
    if (isCloseTo(top, 246) && isCloseTo(bottom, 136)) return "bottom";
    return "???";
};

const hundleImg = img => {
    const source = new Source(img);
    source.scrollbar = readScrollbar(source);
    return source;
};

const hundleFiles = async files => {
    if (files?.length) {
        const sources = await Promise.all(
            [...files].map(file => loadImage(file).then(img => hundleImg(img)))
        );
        return await updateCanvas(...sources);
    }
};

async function updateCanvas(top, bottom) {
    const base = top?.width < bottom?.width ? bottom : top;
    if (base) {
        const draw = new Drawing(base.width, { width: int(base.width * 0.975) });
        canvas.width = draw.width;
        canvas.height = draw.height;
        const background = { wd: 1, hd: 9 / 16 };
        ctx.drawImage(base.img, ...base.ranges(background), ...draw.ranges(background));
        const { y: statusBottom } = base.range({ yf: 1, yd: -0.0789 });
        if (draw.height < statusBottom) {
            console.debug({ statusFrame: true, canvasHeight: draw.height, statusBottom });
            // const statusFrame = { xd: 0.0146, yf: 1, yd: -0.2070, wd: 0.4668, hd: 0.1289 };
            const statusFrame = { xd: 0.0146, yp: 1, yf: 1, yd: -0.0789, wd: 0.4668, hd: 0.0758 };
            ctx.drawImage(base.img, ...base.ranges(statusFrame), ...draw.ranges(statusFrame, { yd: 0, yp: 1 }));
        }
        // draw frame of memoria
        const mask = { xd: 0.4570, yd: 0.0094, wd: 0.5430, hd: 0.0391 };
        ctx.fillStyle = "rgb(248,249,252)";
        ctx.fillRect(...draw.ranges(mask));
        const memoriaFrame = { xd: 0.4945, yd: 0.0047, wd: 0.5063, hd: 0.5586 };
        ctx.fillRect(...draw.ranges(memoriaFrame));
        const memoriaFrameBorder = { wd: 0, w: 2 };
        ctx.fillStyle = "rgb(204,220,253)";
        ctx.fillRect(...draw.ranges(memoriaFrame, memoriaFrameBorder));
        ctx.fillRect(...draw.ranges(memoriaFrame, memoriaFrameBorder, { xd: 0, xf: 1, xp: 1 }));
        // draw memoria
        const memoriaRow = { xd: 0.5180, wd: 0.4367, hd: 0.0938 };
        const memoriaHeight = draw.vw(memoriaRow.hd);
        const marginTop = int((draw.height - memoriaHeight * 5) / 5.5);
        if (top) {
            [0.1820, 0.3102].forEach((yd, i) =>
                ctx.drawImage(top.img, ...top.ranges(memoriaRow, { yd }), ...draw.ranges(memoriaRow, { y: marginTop * (1 + i) + memoriaHeight * i }))
            );
            // ctx.drawImage(top.img, ...top.ranges(memoriaRow, { yd: 0.1820 }), ...draw.ranges(memoriaRow, { y: marginTop * 1 + memoriaHeight * 0 }));
            // ctx.drawImage(top.img, ...top.ranges(memoriaRow, { yd: 0.3102 }), ...draw.ranges(memoriaRow, { y: marginTop * 2 + memoriaHeight * 1 }));
        }
        if (bottom) {
            [-0.4063, -0.2969, -0.1891].forEach((yd, i) =>
                ctx.drawImage(bottom.img, ...bottom.ranges(memoriaRow, { yf: 1, yd }), ...draw.ranges(memoriaRow, { y: marginTop * (3 + i) + memoriaHeight * (2 + i) }))
            );
            // ctx.drawImage(bottom.img, ...bottom.ranges(memoriaRow, { yf: 1, yd: -0.4063 }), ...draw.ranges(memoriaRow, { y: marginTop * 3 + memoriaHeight * 2 }));
            // ctx.drawImage(bottom.img, ...bottom.ranges(memoriaRow, { yf: 1, yd: -0.2969 }), ...draw.ranges(memoriaRow, { y: marginTop * 4 + memoriaHeight * 3 }));
            // ctx.drawImage(bottom.img, ...bottom.ranges(memoriaRow, { yf: 1, yd: -0.1891 }), ...draw.ranges(memoriaRow, { y: marginTop * 5 + memoriaHeight * 4 }));
        }
        if (download.href) {
            URL.revokeObjectURL(download.href);
            download.href = "";
        }
        canvas.parentElement.hidden = false;
        canvas.toBlob(blob => {
            download.href = URL.createObjectURL(blob);
            download.setAttribute("download", timestamp());
        });
    }
    // if (images.length < 2) return;
    // const imgUp = images[0];//list.querySelectorAll("img")[0];
    // const imgLow = images[1];//list.querySelectorAll("img")[1];
    // const { naturalWidth, naturalHeight } = imgUp;
    // let [width, height, offsetX, offsetY] = [naturalWidth, naturalHeight, 0, 0];
    // if (naturalWidth * 9 / 16 > naturalHeight - 0.5) {//iphone等16:9より横長
    //     width = naturalHeight * 16 / 9 | 0;
    //     offsetX = (naturalWidth - width) / 2 | 0;
    // } else if (((naturalWidth - 2) * 9 / 16 + 32 - naturalHeight) ** 2 < 1) {//DMM win版
    //     width = naturalWidth - 2;
    //     height = naturalHeight - 32;
    //     offsetX = 1;
    //     offsetY = 31;
    // }
    // console.log({ width, height, offsetX, offsetY });
    // const header = 0.0525 * width | 0, footer = 0.09025 * width | 0;
    // height -= header + footer;
    // console.log({ width, height, offsetX, offsetY });
    // canvas.width = width;
    // canvas.height = height;
    // ctx.drawImage(imgUp, offsetX, offsetY + header, width, height, 0, 0, width, height);
    // const frameLeft = width * 0.485 | 0;
    // const frameTop = width * 0.015 | 0;
    // const frameRight = width * 0.995 | 0;
    // const frameCurve = width * 0.002 | 0;
    // ctx.beginPath();
    // ctx.moveTo(frameLeft, height);
    // ctx.lineTo(frameLeft, frameTop + frameCurve);
    // ctx.quadraticCurveTo(frameLeft, frameTop, frameLeft + frameCurve, frameTop)
    // ctx.lineTo(frameRight - frameCurve, frameTop);
    // ctx.quadraticCurveTo(frameRight, frameTop, frameRight, frameTop + frameCurve);
    // ctx.lineTo(frameRight, height);
    // ctx.fillStyle = "rgb(250,250,250)";
    // ctx.fill();
    // ctx.strokeStyle = "rgb(202,213,241)";
    // ctx.stroke();
    // const memoWidth = width * 0.4365 | 0;
    // const memoHight = width * 0.09375 | 0;
    // const marginTop = (height - frameTop - memoHight * 4) / 5 | 0;
    // const marginLeft = (frameRight - frameLeft - memoWidth) / 2 | 0;
    // const memoLeft = offsetX + width * 0.51875 | 0;
    // const memoTop = [offsetY + width * 0.1890 | 0, offsetY + width * 0.3015 | 0, naturalHeight - width * 0.29335 - 0.015 * width | 0, naturalHeight - footer - memoHight - 0.015 * width | 0];
    // ctx.drawImage(imgUp, memoLeft, memoTop[0], memoWidth, memoHight, frameLeft + marginLeft, frameTop + marginTop, memoWidth, memoHight);
    // ctx.drawImage(imgUp, memoLeft, memoTop[1], memoWidth, memoHight, frameLeft + marginLeft, frameTop + marginTop * 2 + memoHight * 1, memoWidth, memoHight);
    // ctx.drawImage(imgLow, memoLeft, memoTop[2], memoWidth, memoHight, frameLeft + marginLeft, frameTop + marginTop * 3 + memoHight * 2, memoWidth, memoHight);
    // ctx.drawImage(imgLow, memoLeft, memoTop[3], memoWidth, memoHight, frameLeft + marginLeft, frameTop + marginTop * 4 + memoHight * 3, memoWidth, memoHight);
    // // canvas.toBlob((blob)=>{
    // //     const item = new ClipboardItem({ "image/png": blob });
    // //     navigator.clipboard.write([item]).then(()=>alert("Copied! paste it on paint"));
    // // });
    // if (download.href) URL.revokeObjectURL(download.href);
    // canvas.toBlob(blob => {
    //     download.href = URL.createObjectURL(blob);
    //     download.setAttribute("download", timestamp());
    // });
}

window.addEventListener("dragover", e => e.preventDefault());
window.addEventListener("drop", e => { e.preventDefault(); hundleFiles(e.dataTransfer?.files); });
fileElem.addEventListener("change", e => hundleFiles(e.target?.files));
window.addEventListener("paste", e => {
    let imgs = e.clipboardData?.items;
    if (!imgs) return;
    imgs = [...imgs].map(img =>
        img.type.indexOf("image") !== -1 ? img.getAsFile() : false
    ).filter(item => item);
    hundleFiles(imgs);
});