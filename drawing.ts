const KUROOBI_MAX_WIDE = 200;
const int = Math.trunc;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Unit {
  unit: number;
}
interface Range extends Partial<Rect> {
  wd?: number;
  hd?: number;
  xd?: number;
  yd?: number;
  xf?: number;
  yf?: number;
  xp?: number;
  yp?: number;
}

const vals = (...rects: Partial<Rect>[]) => {
  const { x = 0, y = 0, w = 1, h = 1 } = Object.assign({}, ...rects);
  return [x, y, w, h] as [number, number, number, number];
};
const vw = ({ unit }: Unit, d: number) => int(unit * d);
const range = (rect: Rect & Unit, ...ranges: Range[]): Rect => {
  // deno-fmt-ignore
  let {
    x = 0, xd = 0, xf = 0, xp = 0,
    y = 0, yd = 0, yf = 0, yp = 0,
    w = 0, wd = 0,
    h = 0, hd = 0,
  } = Object.assign({}, ...ranges) as Range;

  w += vw(rect, wd);
  h += vw(rect, hd);
  x = (rect.x ?? 0) + int(rect.w * xf) + x + vw(rect, xd) - int(w * xp);
  y = (rect.y ?? 0) + int(rect.h * yf) + y + vw(rect, yd) - int(h * yp);
  return { x, y, w, h };
};
const ranges = (...args: Parameters<typeof range>) => vals(range(...args));

const newDrawing = (
  unit: number,
  { w = unit, h = int(w * 9 / 16), x = 0, y = 0 }: Partial<Rect> = {},
): Rect & Unit => ({ unit, w, h, x, y });

interface Img {
  img: HTMLImageElement;
}
const newSource = (
  img: HTMLImageElement,
  { padding }: { padding?: Partial<Padding> } = {},
): Rect & Unit & Img => {
  const { naturalWidth, naturalHeight } = img;
  let { top = 0, left = 0, bottom = 0, right = 0 } = padding ?? getTrim(img);
  let w = naturalWidth - left - right;
  const h = naturalHeight - top - bottom;
  const isWiderThan16x9 = w * 9 / 16 - h > 1;
  if (isWiderThan16x9) {
    console.debug({ w, h, isWiderThan16x9 });
    w = int(h * 16 / 9);
    left += int((naturalWidth - left - right - w) / 2);
  }
  return Object.assign(newDrawing(w, { h, x: left, y: top }), { img });
};
const getImageData = (source: Rect & Unit & Img, ...ranges: Range[]) => {
  const { x, y, w, h } = range(source, ...ranges);
  const ctx = useCtx({ w, h });
  ctx.drawImage(source.img, x, y, w, h, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
};

// 16:9比のゲームウィンドウの枠を、16n+2:9n+32かどうかで判定
const hasWindow = (
  { w, h }: { w: number; h: number },
  { ratio = 16 / 9 } = {},
) => ((w - 2) / ratio - (h - 32)) ** 2 < 1;

// 操作用canvasの準備
let _canvas: HTMLCanvasElement | null = null;
let _ctx: CanvasRenderingContext2D | null = null;
const useCtx = ({ w = KUROOBI_MAX_WIDE, h = KUROOBI_MAX_WIDE } = {}) => {
  if (_canvas) {
    if (_canvas.width < w || _canvas.height < h) {
      Object.assign(_canvas, { width: w, height: h });
    }
  } else {
    _canvas = document.createElement("canvas");
    Object.assign(_canvas, { width: w, height: h });
    _ctx = _canvas.getContext("2d");
  }
  return _ctx!;
};
// const disposeCtx = () => {
//   _ctx = null;
//   _canvas?.remove();
//   _canvas = null;
// };

// ノルムの2乗
const norm = (...rs: number[]) => rs.reduce((prev, r) => prev + r * r, 0);
// 余白の画素を数える
const countMarginWidth = (
  ctx: CanvasRenderingContext2D,
  rect: Partial<Rect>,
) => {
  const data = ctx.getImageData(...vals(rect)).data;
  let kuro = 0;
  const r = data[0], g = data[1], b = data[2];
  for (let i = 4; i < data.length; i += 4, kuro++) {
    if (norm(data[i] - r, data[i + 1] - g, data[i + 2] - b) > 5) break;
  }
  return kuro;
};

interface Padding {
  top: number;
  left: number;
  right: number;
  bottom: number;
}
const getTrim = (
  img: HTMLImageElement,
  { max = KUROOBI_MAX_WIDE } = {},
): Padding => {
  const { naturalWidth: w, naturalHeight: h } = img;
  if (hasWindow({ w, h })) {
    console.debug({ w, h, hasWindow: true });
    return { top: 31, left: 1, right: 1, bottom: 1 };
  }
  const ctx = useCtx({ w: max });
  const rectH = { w: max, h: 1 };
  ctx.drawImage(img, ...vals(rectH, { y: int(h * 0.3) }), ...vals(rectH));
  const left = countMarginWidth(ctx, rectH);
  console.debug({ w, h, left });
  return { top: 0, left, right: 0, bottom: 0 };
};

export { getImageData, int, newDrawing, newSource, range, ranges, vals, vw };
export type { Img, Padding, Range, Rect, Unit };
