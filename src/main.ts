import {
  getImageData,
  int,
  newDrawing,
  newSource,
  range,
  ranges,
} from "./drawing.ts";
import type { Img, Rect, Unit } from "./drawing.ts";
import samples from "../samples/list.json" with { type: "json" };

const fileElem = document.querySelector("#fileElem") as HTMLInputElement,
  download = document.querySelector("#download") as HTMLAnchorElement,
  canvas = document.querySelector("#out") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
let memoriaTop = document.querySelector("#memoria_top") as HTMLImageElement,
  memoriaBottom = document.querySelector("#memoria_bottom") as HTMLImageElement;

interface Source extends Rect, Unit, Img {}
let top: Source | undefined, bottom: Source | undefined;

/** yyyyMMdd_HHmmss形式のタイムスタンプStringを得る */
// "sv"（スウェーデン語）ロケールを使うことで、"yyyy-MM-dd HH:mm:ss" 形式になり、扱い易い。
const timestamp = ({ date = new Date(), delimiter = "_" } = {}) =>
  date.toLocaleString("sv").replace(/\D/g, (a) => a == " " ? delimiter : "");

const loadImage = async (url: string) => {
  const img = new Image();
  img.src = url;
  await img.decode();
  URL.revokeObjectURL(url);
  return img;
};

const calculateLuminance = (
  r: number,
  g: number,
  b: number,
) => (0.299 * r + 0.587 * g + 0.114 * b);
/** RGBAの配列から最小輝度を求める */
const getMinLuminance = (data: Uint8ClampedArray | number[]) => {
  let min = Infinity;
  for (let i = 0; i < data.length; i += 4) {
    const luminance = calculateLuminance(data[i], data[i + 1], data[i + 2]);
    if (luminance < min) {
      min = luminance;
    }
  }
  return min;
};

const isCloseTo = (a: number, b: number, { diff = 10 } = {}) =>
  Math.abs(a - b) < diff;

type Scrollbar = "top" | "bottom" | "";
// スクロールバーの輝度値（推定値）: 136はバー有り、246はバー無しを表す
const SCROLLBAR_PRESENT_LUMINANCE = 136; // スクロールバーがあるときの最小輝度
const SCROLLBAR_ABSENT_LUMINANCE = 246; // スクロールバーがないときの最小輝度

const getScrollbar = (source: Source): Scrollbar => {
  const topRange = { xp: 0.5, yp: 0.5, xd: 0.9750, w: 5, h: 5, yd: 0.1705 };
  const bottomRange = { ...topRange, yf: 1, yd: -0.1005 };
  const [top, bottom] = [topRange, bottomRange].map((range) => {
    const data = getImageData(source, range).data;
    return getMinLuminance(data);
  });
  if (
    isCloseTo(top, SCROLLBAR_PRESENT_LUMINANCE) &&
    isCloseTo(bottom, SCROLLBAR_ABSENT_LUMINANCE)
  ) return "top";
  if (
    isCloseTo(top, SCROLLBAR_ABSENT_LUMINANCE) &&
    isCloseTo(bottom, SCROLLBAR_PRESENT_LUMINANCE)
  ) return "bottom";
  return "";
};

const handleFiles = async (files: FileList | File[] | undefined) => {
  if (files?.length) {
    const images = await Promise.all(
      [...files].map((file) => loadImage(URL.createObjectURL(file))),
    );
    handleImages(images);
  }
};

const handleImages = (images: HTMLImageElement[]) => {
  const sources = images.map((img) => newSource(img));
  let newTop: Source | undefined = undefined,
    newBottom: Source | undefined = undefined;
  const remains: Source[] = [];
  for (const source of sources) {
    const scrollbar = getScrollbar(source);
    if (!newTop && scrollbar === "top") {
      newTop = source;
    } else if (!newBottom && scrollbar === "bottom") {
      newBottom = source;
    } else remains.push(source);
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
  const base = (!top || (bottom && top.w < bottom.w)) ? bottom : top;
  if (base) {
    const draw = newDrawing(base.w, { w: int(base.w * 0.975) });
    Object.assign(canvas, { width: draw.w, height: draw.h });
    const bg = { wd: 1, hd: 9 / 16 };
    ctx.drawImage(base.img, ...ranges(base, bg), ...ranges(draw, bg));
    const statusBottom = range(base, { yf: 1, yd: -0.0789 }).y;
    if (draw.h < statusBottom) {
      // ステータス表示がカンバスの外側にはみ出しているので、上にずらして描画する
      console.debug({ redrawStatus: true, canvasHeight: draw.h, statusBottom });
      const st = { xd: .0146, yp: 1, yf: 1, yd: -.0789, wd: .4668, hd: .0758 };
      const stDraw = { ...st, yd: 0, yp: 1 };
      ctx.drawImage(base.img, ...ranges(base, st), ...ranges(draw, stDraw));
    }
    // メモリアを囲う枠を描画する
    // 背景色で塗りつぶし
    ctx.fillStyle = "rgb(248,249,252)";
    const mask = { xd: 0.4516, yd: 0.0094, wd: 0.5484, hd: 0.0391 };
    ctx.fillRect(...ranges(draw, mask));
    const memoriaFrame = { xd: 0.4945, yd: 0.0047, wd: 0.5063, hd: 0.5586 };
    ctx.fillRect(...ranges(draw, memoriaFrame));
    // 枠線の色
    ctx.fillStyle = "rgb(204,220,253)";
    const memoriaBorderLeft = { ...memoriaFrame, wd: 0, w: 2 };
    ctx.fillRect(...ranges(draw, memoriaBorderLeft));
    const memoriaBorderRight = { ...memoriaBorderLeft, xd: 0, xf: 1, xp: 1 };
    ctx.fillRect(...ranges(draw, memoriaBorderRight));
    // メモリアを描画する
    const memoriaRow = { xd: 0.5180, wd: 0.4367, hd: 0.0938 };
    const memoriaHeight = range(draw, memoriaRow).h;
    const marginHeight = int((draw.h - memoriaHeight * 5) / 5.5);
    const rangesDrawRow = (row: number) =>
      ranges(draw, memoriaRow, {
        y: marginHeight + (memoriaHeight + marginHeight) * row,
      });
    if (top) {
      [.1820, .3172].forEach((yd, i) =>
        ctx.drawImage(
          top!.img,
          ...ranges(top!, memoriaRow, { yd }),
          ...rangesDrawRow(i),
        )
      );
    }
    if (bottom) {
      [-0.4063, -0.2969, -0.1891].forEach((yd, i) =>
        ctx.drawImage(
          bottom!.img,
          ...ranges(bottom!, memoriaRow, { yf: 1, yd }),
          ...rangesDrawRow(2 + i),
        )
      );
    }
    if (download.href) {
      URL.revokeObjectURL(download.href);
      download.href = "";
    }
    canvas.parentElement && (canvas.parentElement.hidden = false);
    canvas.toBlob((blob) => {
      download.href = URL.createObjectURL(blob!);
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
  (e) => handleFiles((e.target as HTMLInputElement).files ?? undefined),
);
globalThis.addEventListener("paste", (e) => {
  const itemlist = e.clipboardData?.items;
  if (!itemlist) return;
  const imgFiles = [...itemlist].map((img) =>
    img.type.indexOf("image") !== -1 ? img.getAsFile() : false
  ).filter((item) => item) as File[];
  handleFiles(imgFiles);
});
if (samples?.length) {
  document.querySelector("#btn_sample")?.addEventListener(
    "click",
    ({ currentTarget }) => {
      Promise.all(samples.map((path) => loadImage(path)))
        .then((images) => handleImages(images));
      (currentTarget as HTMLButtonElement).style.display = "none";
    },
  );
}
