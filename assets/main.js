import { Drawing, Source } from "./source.js";
const fileElem = document.querySelector("#fileElem"),
    download = document.querySelector("#download"),
    canvas = document.querySelector("#out");
const ctx = canvas.getContext("2d");
let sceans = {};

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

const newSource = img => {
    const source = new Source(img);
    source.scrollbar = readScrollbar(source);
    return source;
};

const hundleFiles = async files => {
    if (files?.length) {
        const sources = await Promise.all(
            [...files].map(file => loadImage(file).then(img => newSource(img)))
        );
        hundleSources(sources);
    }
};

const sceanTest = {
    "memoria_top": source => source.scrollbar == "top",
    "memoria_bottom": source => source.scrollbar == "bottom",
};

const hundleSources = async (sources = []) => {
    const currentSceans = {};
    Object.keys(sceanTest).forEach(key => {
        const index = sources.findIndex(sceanTest[key]);
        if (index == -1) currentSceans[key] = undefined;
        else currentSceans[key] = sources.splice(index, 1)[0];
    });
    for (const key in currentSceans) {
        if (!currentSceans[key]) currentSceans[key] = sources.pop();
        const source = currentSceans[key];
        if (!source) {
            currentSceans[key] = sceans[key];
        } else {
            if (sceans[key]) removeSource(sceans[key]);
            document.querySelector(`#${key}`).appendChild(source.img);
        }
    }
    sceans = currentSceans;
    removeSource(...sources);
    return await updateCanvas(...Object.values(sceans));
};

const removeSource = (...sources) => {
    sources.forEach(source => source?.img?.remove());
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
        const mask = { xd: 0.4516, yd: 0.0094, wd: 0.5484, hd: 0.0391 };
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