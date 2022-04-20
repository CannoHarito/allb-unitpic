const KUROOBI_MAX_WIDE = 200;
const KUROOBI_CHECK_HEIGHT = 50;
const int = Math.trunc;

export class Drawing {
    constructor(unit, { width = unit, height = int(width * 9 / 16), left = 0, top = 0 } = {}) {
        Object.assign(this, { unit, width, height, left, top });
    }
    get right() { return this.left + this.width }
    get bottom() { return this.top + this.height }
    vw(d) {
        return int(this.unit * d);
    }
    range(...o) {
        let {
            x = 0, xd = 0, xf = 0, xp = 0,
            y = 0, yd = 0, yf = 0, yp = 0,
            w = 0, wd = 0,
            h = 0, hd = 0,
        } = Object.assign({}, ...o);
        w = w + this.vw(wd);
        h = h + this.vw(hd);
        x = this.left + int(this.width * xf) + x + this.vw(xd) - int(w * xp);
        y = this.top + int(this.height * yf) + y + this.vw(yd) - int(h * yp);
        return { x, y, w, h };
    }
    ranges(...o) {
        return Object.values(this.range(...o));
    }
}

export class Source extends Drawing {
    static #canvas;
    static #ctx;
    constructor(img, { padding } = {}) {
        const { naturalWidth, naturalHeight } = img;
        if (!naturalWidth || !naturalHeight)
            throw new Error("Unable to get size of image");
        let { top = 0, left = 0, bottom = 0, right = 0, isDmm, isKuroObi }
            = padding ?? Source.getPadding(img);//call static method before super()
        let width = naturalWidth - left - right,
            height = naturalHeight - top - bottom;
        const isWiderThan16x9 = width * 9 / 16 - height > 1;
        if (isWiderThan16x9) {
            width = int(height * 16 / 9);
            left += int((naturalWidth - left - right - width) / 2);
        }
        super(width, { height, top, left });
        this.img = img;
        console.debug({ newSource: this, isDmm, isKuroObi, isWiderThan16x9 });
    }
    getImageData(...o) {
        const { x, y, w, h } = this.range(...o);
        const ctx = this.constructor.#getCtx({ w, h });
        ctx.drawImage(this.img, x, y, w, h, 0, 0, w, h);
        return ctx.getImageData(0, 0, w, h);
    }
    static #getCtx({ w = 1, h = 1 } = {}) {
        if (!this.#ctx) {
            const canvas = document.createElement('canvas');
            Object.assign(canvas, { width: w, height: h });
            this.#canvas = canvas;
            this.#ctx = canvas.getContext("2d");
        } else {
            const canvas = this.#canvas;
            if (canvas.width < w) canvas.width = w;
            if (canvas.height < h) canvas.height = h;
        }
        return this.#ctx;
    }
    static getPadding(img) {
        const { naturalWidth, naturalHeight } = img;
        const isDmm = ((naturalWidth - 2) * 9 / 16 + 32 - naturalHeight) ** 2 < 1;
        if (isDmm) {
            return { top: 31, left: 1, bottom: 1, right: 1, isDmm };
        }
        const isKuroObi = this.getKuroObiLeft(img);
        return { top: 0, left: isKuroObi, bottom: 0, right: 0, isDmm, isKuroObi };
    }
    static getKuroObiLeft(img, { w = KUROOBI_MAX_WIDE, y = KUROOBI_CHECK_HEIGHT } = {}) {
        const ctx = this.#getCtx({ w });
        ctx.drawImage(img, 0, y, w, 1, 0, 0, w, 1);
        const data = ctx.getImageData(0, 0, w, 1).data;
        let paddingLeft = 0;
        for (let i = 0; i < data.length; i += 4, paddingLeft++) {
            if (data[i] > 2 || data[i + 1] > 2 || data[i + 2] > 2) break;//is not black
        }
        return paddingLeft;
    }
};
