const MAX_PADDING_WIDTH = 200;
const PADDING_COLOR_DIFF_THRESHOLD = 5;
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
  x = (rect.x ?? 0) + int((rect.w - 1) * xf) + x + vw(rect, xd) - int(w * xp);
  y = (rect.y ?? 0) + int((rect.h - 1) * yf) + y + vw(rect, yd) - int(h * yp);
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
  let { top = 0, left = 0, bottom = 0, right = 0 } = padding ?? getPadding(img);
  let w = naturalWidth - left - right;
  const h = naturalHeight - top - bottom;
  const isWiderThan16x9 = w * 9 / 16 - h > 1;
  if (isWiderThan16x9) {
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

const WINDOW_BORDER_WIDTH = 2;
const WINDOW_TITLEBAR_HEIGHT = 32;
// 16:9比のゲームウィンドウの枠を、16n+2:9n+32かどうかで判定
const hasWindow = (
  { w, h }: { w: number; h: number },
  { ratio = 16 / 9 } = {},
) =>
  ((w - WINDOW_BORDER_WIDTH) / ratio - (h - WINDOW_TITLEBAR_HEIGHT)) ** 2 < 1;

const useCtx = ({ w = MAX_PADDING_WIDTH, h = MAX_PADDING_WIDTH } = {}) => {
  const canvas = new OffscreenCanvas(w, h);
  return canvas.getContext("2d")!;
};

// paddingの画素を数える
const countPaddingWidth = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  rect: Partial<Rect>,
) => {
  const data = ctx.getImageData(...vals(rect)).data;
  let paddingWidth = 0;
  const [r, g, b] = data;
  for (let i = 4; i < data.length; i += 4) {
    if (
      Math.hypot(data[i] - r, data[i + 1] - g, data[i + 2] - b) >
        PADDING_COLOR_DIFF_THRESHOLD
    ) break;
    paddingWidth++;
  }
  return paddingWidth;
};

interface Padding {
  top: number;
  left: number;
  right: number;
  bottom: number;
}
const getPadding = (
  img: HTMLImageElement,
  { max = MAX_PADDING_WIDTH } = {},
): Padding => {
  const { naturalWidth: w, naturalHeight: h } = img;
  if (hasWindow({ w, h })) {
    console.debug("hasWindow", { w, h });
    return { top: 31, left: 1, right: 1, bottom: 1 };
  }
  const rectH = { w: max, h: 1 };
  const ctx = useCtx(rectH);
  ctx.drawImage(img, ...vals(rectH, { y: int(h * 0.3) }), ...vals(rectH));
  const left = countPaddingWidth(ctx, rectH);
  ctx.drawImage(
    img,
    ...vals({ x: w - 1, y: int(h * 0.3), w: -max, h: 1 }),
    ...vals(rectH),
  );
  const right = countPaddingWidth(ctx, rectH);
  console.debug("padding", { w, h, left, right });
  return { top: 0, left, right, bottom: 0 };
};

export { getImageData, int, newDrawing, newSource, range, ranges, vals, vw };
export type { Img, Padding, Range, Rect, Unit };
