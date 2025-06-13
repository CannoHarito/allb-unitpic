// src/drawing.ts
var MAX_PADDING_WIDTH = 200;
var PADDING_COLOR_DIFF_THRESHOLD = 5;
var int = Math.trunc;
var vals = (...rects) => {
  const { x = 0, y = 0, w = 1, h = 1 } = Object.assign({}, ...rects);
  return [x, y, w, h];
};
var vw = ({ unit }, d) => int(unit * d);
var range = (rect, ...ranges2) => {
  let {
    x = 0,
    xd = 0,
    xf = 0,
    xp = 0,
    y = 0,
    yd = 0,
    yf = 0,
    yp = 0,
    w = 0,
    wd = 0,
    h = 0,
    hd = 0
  } = Object.assign({}, ...ranges2);
  w += vw(rect, wd);
  h += vw(rect, hd);
  x = (rect.x ?? 0) + int((rect.w - 1) * xf) + x + vw(rect, xd) - int(w * xp);
  y = (rect.y ?? 0) + int((rect.h - 1) * yf) + y + vw(rect, yd) - int(h * yp);
  return { x, y, w, h };
};
var ranges = (...args) => vals(range(...args));
var newDrawing = (unit, { w = unit, h = int(w * 9 / 16), x = 0, y = 0 } = {}) => ({ unit, w, h, x, y });
var newSource = (img, { padding } = {}) => {
  const { naturalWidth, naturalHeight } = img;
  let { top: top2 = 0, left = 0, bottom: bottom2 = 0, right = 0 } = padding ?? getPadding(img);
  let w = naturalWidth - left - right;
  const h = naturalHeight - top2 - bottom2;
  const isWiderThan16x9 = w * 9 / 16 - h > 1;
  if (isWiderThan16x9) {
    w = int(h * 16 / 9);
    left += int((naturalWidth - left - right - w) / 2);
  }
  return Object.assign(newDrawing(w, { h, x: left, y: top2 }), { img });
};
var getImageData = (source, ...ranges2) => {
  const { x, y, w, h } = range(source, ...ranges2);
  const ctx2 = useCtx({ w, h });
  ctx2.drawImage(source.img, x, y, w, h, 0, 0, w, h);
  return ctx2.getImageData(0, 0, w, h);
};
var WINDOW_BORDER_WIDTH = 2;
var WINDOW_TITLEBAR_HEIGHT = 32;
var hasWindow = ({ w, h }, { ratio = 16 / 9 } = {}) => ((w - WINDOW_BORDER_WIDTH) / ratio - (h - WINDOW_TITLEBAR_HEIGHT)) ** 2 < 1;
var useCtx = ({ w = MAX_PADDING_WIDTH, h = MAX_PADDING_WIDTH } = {}) => {
  const canvas2 = new OffscreenCanvas(w, h);
  return canvas2.getContext("2d");
};
var countPaddingWidth = (ctx2, rect) => {
  const data = ctx2.getImageData(...vals(rect)).data;
  let paddingWidth = 0;
  const [r, g, b] = data;
  for (let i = 4; i < data.length; i += 4) {
    if (Math.hypot(data[i] - r, data[i + 1] - g, data[i + 2] - b) > PADDING_COLOR_DIFF_THRESHOLD)
      break;
    paddingWidth++;
  }
  return paddingWidth;
};
var getPadding = (img, { max = MAX_PADDING_WIDTH } = {}) => {
  const { naturalWidth: w, naturalHeight: h } = img;
  if (hasWindow({ w, h })) {
    console.debug("hasWindow", { w, h });
    return { top: 31, left: 1, right: 1, bottom: 1 };
  }
  const rectH = { w: max, h: 1 };
  const ctx2 = useCtx(rectH);
  ctx2.drawImage(img, ...vals(rectH, { y: int(h * 0.3) }), ...vals(rectH));
  const left = countPaddingWidth(ctx2, rectH);
  ctx2.drawImage(
    img,
    ...vals({ x: w - 1, y: int(h * 0.3), w: -max, h: 1 }),
    ...vals(rectH)
  );
  const right = countPaddingWidth(ctx2, rectH);
  console.debug("padding", { w, h, left, right });
  return { top: 0, left, right, bottom: 0 };
};

// samples/list.json
var list_default = [
  "./samples/v0309-u02-m1-opporeno5a-20220526.jpg",
  "./samples/v0309-u02-m0-dmm-20220526.png"
];

// src/main.ts
var fileElem = document.querySelector("#fileElem");
var download = document.querySelector("#download");
var canvas = document.querySelector("#out");
var ctx = canvas.getContext("2d");
var memoriaTop = document.querySelector("#memoria_top");
var memoriaBottom = document.querySelector("#memoria_bottom");
var top;
var bottom;
var timestamp = ({ date = /* @__PURE__ */ new Date(), delimiter = "_" } = {}) => date.toLocaleString("sv").replace(/\D/g, (a) => a == " " ? delimiter : "");
var loadImage = async (url) => {
  const img = new Image();
  img.src = url;
  await img.decode();
  URL.revokeObjectURL(url);
  return img;
};
var calculateLuminance = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
var getMinLuminance = (data) => {
  let min = Infinity;
  for (let i = 0; i < data.length; i += 4) {
    const luminance = calculateLuminance(data[i], data[i + 1], data[i + 2]);
    if (luminance < min) {
      min = luminance;
    }
  }
  return min;
};
var isCloseTo = (a, b, { diff = 10 } = {}) => Math.abs(a - b) < diff;
var SCROLLBAR_PRESENT_LUMINANCE = 136;
var SCROLLBAR_ABSENT_LUMINANCE = 246;
var getScrollbar = (source) => {
  const topRange = { xp: 0.5, yp: 0.5, xd: 0.975, w: 5, h: 5, yd: 0.1705 };
  const bottomRange = { ...topRange, yf: 1, yd: -0.1005 };
  const [top2, bottom2] = [topRange, bottomRange].map((range2) => {
    const data = getImageData(source, range2).data;
    return getMinLuminance(data);
  });
  if (isCloseTo(top2, SCROLLBAR_PRESENT_LUMINANCE) && isCloseTo(bottom2, SCROLLBAR_ABSENT_LUMINANCE))
    return "top";
  if (isCloseTo(top2, SCROLLBAR_ABSENT_LUMINANCE) && isCloseTo(bottom2, SCROLLBAR_PRESENT_LUMINANCE))
    return "bottom";
  return "";
};
var handleFiles = async (files) => {
  if (files?.length) {
    const images = await Promise.all(
      [...files].map((file) => loadImage(URL.createObjectURL(file)))
    );
    handleImages(images);
  }
};
var handleImages = (images) => {
  const sources = images.map((img) => newSource(img));
  let newTop = void 0, newBottom = void 0;
  const remains = [];
  for (const source of sources) {
    const scrollbar = getScrollbar(source);
    if (!newTop && scrollbar === "top") {
      newTop = source;
    } else if (!newBottom && scrollbar === "bottom") {
      newBottom = source;
    } else
      remains.push(source);
  }
  newTop ??= remains.pop();
  newBottom ??= remains.pop();
  if (newTop) {
    console.debug("update memoria_top");
    memoriaTop.replaceWith(newTop.img);
    memoriaTop = newTop.img;
    top = newTop;
  }
  if (newBottom) {
    console.debug("update memoria_bottom");
    memoriaBottom.replaceWith(newBottom.img);
    memoriaBottom = newBottom.img;
    bottom = newBottom;
  }
  if (newTop || newBottom) {
    console.debug("update canvas");
    updateCanvas();
  }
};
function updateCanvas() {
  const base = !top || bottom && top.w < bottom.w ? bottom : top;
  if (base) {
    const draw = newDrawing(base.w, { w: int(base.w * 0.975) });
    Object.assign(canvas, { width: draw.w, height: draw.h });
    const bg = { wd: 1, hd: 9 / 16 };
    ctx.drawImage(base.img, ...ranges(base, bg), ...ranges(draw, bg));
    const statusBottom = range(base, { yf: 1, yd: -0.0789 }).y;
    if (draw.h < statusBottom) {
      console.debug({ redrawStatus: true, canvasHeight: draw.h, statusBottom });
      const st = { xd: 0.0146, yp: 1, yf: 1, yd: -0.0789, wd: 0.4668, hd: 0.0758 };
      const stDraw = { ...st, yd: 0, yp: 1 };
      ctx.drawImage(base.img, ...ranges(base, st), ...ranges(draw, stDraw));
    }
    ctx.fillStyle = "rgb(248,249,252)";
    const mask = { xd: 0.4516, yd: 94e-4, wd: 0.5484, hd: 0.0391 };
    ctx.fillRect(...ranges(draw, mask));
    const memoriaFrame = { xd: 0.4945, yd: 47e-4, wd: 0.5063, hd: 0.5586 };
    ctx.fillRect(...ranges(draw, memoriaFrame));
    ctx.fillStyle = "rgb(204,220,253)";
    const memoriaBorderLeft = { ...memoriaFrame, wd: 0, w: 2 };
    ctx.fillRect(...ranges(draw, memoriaBorderLeft));
    const memoriaBorderRight = { ...memoriaBorderLeft, xd: 0, xf: 1, xp: 1 };
    ctx.fillRect(...ranges(draw, memoriaBorderRight));
    const memoriaRow = { xd: 0.518, wd: 0.4367, hd: 0.0938 };
    const memoriaHeight = range(draw, memoriaRow).h;
    const marginHeight = int((draw.h - memoriaHeight * 5) / 5.5);
    const rangesDrawRow = (row) => ranges(draw, memoriaRow, {
      y: marginHeight + (memoriaHeight + marginHeight) * row
    });
    if (top) {
      [0.182, 0.3172].forEach(
        (yd, i) => ctx.drawImage(
          top.img,
          ...ranges(top, memoriaRow, { yd }),
          ...rangesDrawRow(i)
        )
      );
    }
    if (bottom) {
      [-0.4063, -0.2969, -0.1891].forEach(
        (yd, i) => ctx.drawImage(
          bottom.img,
          ...ranges(bottom, memoriaRow, { yf: 1, yd }),
          ...rangesDrawRow(2 + i)
        )
      );
    }
    if (download.href) {
      URL.revokeObjectURL(download.href);
      download.href = "";
    }
    canvas.parentElement && (canvas.parentElement.hidden = false);
    canvas.toBlob((blob) => {
      download.href = URL.createObjectURL(blob);
      download.setAttribute("download", timestamp());
    });
  }
}
globalThis.addEventListener("dragover", (e) => e.preventDefault());
globalThis.addEventListener("drop", (e) => {
  e.preventDefault();
  handleFiles(e.dataTransfer?.files);
});
fileElem.addEventListener(
  "input",
  (e) => handleFiles(e.target.files ?? void 0)
);
globalThis.addEventListener("paste", (e) => {
  const itemlist = e.clipboardData?.items;
  if (!itemlist)
    return;
  const imgFiles = [...itemlist].map(
    (img) => img.type.indexOf("image") !== -1 ? img.getAsFile() : false
  ).filter((item) => item);
  handleFiles(imgFiles);
});
if (list_default?.length) {
  document.querySelector("#btn_sample")?.addEventListener(
    "click",
    ({ currentTarget }) => {
      Promise.all(list_default.map((path) => loadImage(path))).then((images) => handleImages(images));
      currentTarget.style.display = "none";
    }
  );
}
