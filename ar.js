// "See it on your own wall": a true-size 3D model of a painting for phone AR.
// No libraries. Used in two places:
//  - the browser (index.html loads it only when the button is tapped) makes a USDZ for iPhone Quick Look;
//  - the server (functions/ar/[file].js) makes a GLB for Android Scene Viewer.
// The model is one box per canvas (a diptych is two boxes with the real gap), sizes in metres,
// photo on the front, painted edges (the photo's border continues round the edge), plain linen back.
// Axes: +Y up, +Z out of the wall. The back of the canvas sits at z = 0, so AR hangs it flat on the wall.

const LINEN = [0.86, 0.8, 0.69];

// spec: {pw, h, depth, gap (cm), panels, tw, th (texture size in px)}
// The texture is cropped to the picture like CSS "object-fit: cover".
export function buildMesh(spec) {
  const n = Math.max(1, Math.min(4, spec.panels | 0 || 1));
  const pw = spec.pw / 100, h = spec.h / 100, d = Math.max(0.005, (spec.depth || 1.8) / 100), gap = n > 1 ? (spec.gap || 0) / 100 : 0;
  const W = n * pw + (n - 1) * gap, A = spec.tw / spec.th, S = (n * pw) / h;
  let u0 = 0, u1 = 1, v0 = 0, v1 = 1; // part of the texture that is the picture (v = 0 at the top)
  if (A > S) { u0 = (1 - S / A) / 2; u1 = 1 - u0; } else if (A < S) { v0 = (1 - A / S) / 2; v1 = 1 - v0; }
  const art = { p: [], n: [], uv: [] }, back = { p: [], n: [] };
  const quad = (m, pts, nor, uvs) => { for (let k = 0; k < 4; k++) { m.p.push(...pts[k]); m.n.push(...nor); if (uvs) m.uv.push(...uvs[k]); } };
  const t = h / 2, b = -h / 2;
  for (let i = 0; i < n; i++) {
    const x0 = -W / 2 + i * (pw + gap), x1 = x0 + pw;
    const pu0 = u0 + (i / n) * (u1 - u0), pu1 = u0 + ((i + 1) / n) * (u1 - u0);
    const eu = (d / pw) * (pu1 - pu0), ev = (d / h) * (v1 - v0); // edge strip, at true scale
    // corners in order bottom-left, bottom-right, top-right, top-left as seen from outside (counter-clockwise)
    quad(art, [[x0, b, d], [x1, b, d], [x1, t, d], [x0, t, d]], [0, 0, 1], [[pu0, v1], [pu1, v1], [pu1, v0], [pu0, v0]]);
    quad(art, [[x1, b, d], [x1, b, 0], [x1, t, 0], [x1, t, d]], [1, 0, 0], [[pu1, v1], [pu1 - eu, v1], [pu1 - eu, v0], [pu1, v0]]);
    quad(art, [[x0, b, 0], [x0, b, d], [x0, t, d], [x0, t, 0]], [-1, 0, 0], [[pu0 + eu, v1], [pu0, v1], [pu0, v0], [pu0 + eu, v0]]);
    quad(art, [[x0, t, d], [x1, t, d], [x1, t, 0], [x0, t, 0]], [0, 1, 0], [[pu0, v0], [pu1, v0], [pu1, v0 + ev], [pu0, v0 + ev]]);
    quad(art, [[x0, b, 0], [x1, b, 0], [x1, b, d], [x0, b, d]], [0, -1, 0], [[pu0, v1 - ev], [pu1, v1 - ev], [pu1, v1], [pu0, v1]]);
    quad(back, [[x1, b, 0], [x0, b, 0], [x0, t, 0], [x1, t, 0]], [0, 0, -1]);
  }
  return { art, back };
}

// two triangles per quad
const tris = (quads) => { const o = []; for (let q = 0; q < quads; q++) { const a = q * 4; o.push(a, a + 1, a + 2, a, a + 2, a + 3); } return o; };
const f6 = (v) => (Math.round(v * 1e6) / 1e6).toString();

/* ---------- GLB (Android Scene Viewer) ---------- */
export function buildGLB(spec, jpeg) {
  const { art, back } = buildMesh(spec);
  const parts = [], views = [], acc = [];
  let len = 0;
  const add = (bytes, target) => {
    while (len % 4) { parts.push(new Uint8Array(1)); len++; }
    views.push({ buffer: 0, byteOffset: len, byteLength: bytes.byteLength, ...(target ? { target } : {}) });
    parts.push(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)); len += bytes.byteLength;
    return views.length - 1;
  };
  const vec = (arr, type, minmax) => {
    const f = new Float32Array(arr), comps = type === 'VEC3' ? 3 : 2, a = { bufferView: add(f, 34962), componentType: 5126, count: arr.length / comps, type };
    if (minmax) { a.min = [0, 1, 2].map((k) => Math.min(...arr.filter((_, j) => j % 3 === k))); a.max = [0, 1, 2].map((k) => Math.max(...arr.filter((_, j) => j % 3 === k))); }
    acc.push(a); return acc.length - 1;
  };
  const idx = (count) => { const ix = new Uint16Array(tris(count / 4)); acc.push({ bufferView: add(ix, 34963), componentType: 5123, count: ix.length, type: 'SCALAR' }); return acc.length - 1; };
  const aCount = art.p.length / 3, bCount = back.p.length / 3;
  const prims = [
    { attributes: { POSITION: vec(art.p, 'VEC3', true), NORMAL: vec(art.n, 'VEC3'), TEXCOORD_0: vec(art.uv, 'VEC2') }, indices: idx(aCount), material: 0 },
    { attributes: { POSITION: vec(back.p, 'VEC3', true), NORMAL: vec(back.n, 'VEC3') }, indices: idx(bCount), material: 1 },
  ];
  const imgView = add(jpeg);
  const gltf = {
    asset: { version: '2.0', generator: 'valentynaksendz-site ar.js' },
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: 'Painting' }],
    meshes: [{ primitives: prims }],
    materials: [
      { name: 'Canvas', pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.85 } },
      { name: 'Back', pbrMetallicRoughness: { baseColorFactor: [...LINEN, 1], metallicFactor: 0, roughnessFactor: 1 } },
    ],
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
    images: [{ bufferView: imgView, mimeType: 'image/jpeg' }],
    textures: [{ source: 0, sampler: 0 }],
    accessors: acc, bufferViews: views,
  };
  while (len % 4) { parts.push(new Uint8Array(1)); len++; }
  gltf.buffers = [{ byteLength: len }];
  let js = new TextEncoder().encode(JSON.stringify(gltf));
  const jl = Math.ceil(js.length / 4) * 4, jsPad = new Uint8Array(jl).fill(0x20); jsPad.set(js); js = jsPad;
  const out = new Uint8Array(12 + 8 + jl + 8 + len), dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, out.length, true);
  dv.setUint32(12, jl, true); dv.setUint32(16, 0x4e4f534a, true); out.set(js, 20);
  let o = 20 + jl; dv.setUint32(o, len, true); dv.setUint32(o + 4, 0x004e4942, true); o += 8;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/* ---------- USDZ (iPhone / iPad Quick Look) ---------- */
function usdMesh(name, m, withUV, mat) {
  const q = m.p.length / 12, pts = [], nor = [], st = [];
  for (let i = 0; i < m.p.length; i += 3) { pts.push(`(${f6(m.p[i])}, ${f6(m.p[i + 1])}, ${f6(m.p[i + 2])})`); nor.push(`(${m.n[i]}, ${m.n[i + 1]}, ${m.n[i + 2]})`); }
  if (withUV) for (let i = 0; i < m.uv.length; i += 2) st.push(`(${f6(m.uv[i])}, ${f6(1 - m.uv[i + 1])})`); // USD textures start at the bottom
  return `
    def Mesh "${name}" (
        prepend apiSchemas = ["MaterialBindingAPI"]
    )
    {
        int[] faceVertexCounts = [${Array(q).fill(4).join(', ')}]
        int[] faceVertexIndices = [${Array.from({ length: q * 4 }, (_, i) => i).join(', ')}]
        point3f[] points = [${pts.join(', ')}]
        normal3f[] normals = [${nor.join(', ')}] (
            interpolation = "vertex"
        )${withUV ? `
        texCoord2f[] primvars:st = [${st.join(', ')}] (
            interpolation = "vertex"
        )` : ''}
        uniform token subdivisionScheme = "none"
        uniform bool doubleSided = 0
        rel material:binding = </Root/Materials/${mat}>
    }`;
}
export function buildUSDA(spec, texName) {
  const { art, back } = buildMesh(spec);
  return `#usda 1.0
(
    customLayerData = {
        string creator = "valentynaksendz-site ar.js"
    }
    defaultPrim = "Root"
    metersPerUnit = 1
    upAxis = "Y"
)

def Xform "Root" (
    assetInfo = {
        string name = "Painting"
    }
    kind = "component"
    prepend apiSchemas = ["Preliminary_AnchoringAPI"]
)
{
    token preliminary:anchoring:type = "plane"
    token preliminary:planeAnchoring:alignment = "vertical"
${usdMesh('Canvas', art, true, 'CanvasMat')}
${usdMesh('Back', back, false, 'BackMat')}

    def Scope "Materials"
    {
        def Material "CanvasMat"
        {
            token outputs:surface.connect = </Root/Materials/CanvasMat/PBR.outputs:surface>

            def Shader "PBR"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor.connect = </Root/Materials/CanvasMat/Tex.outputs:rgb>
                float inputs:metallic = 0
                float inputs:roughness = 0.85
                token outputs:surface
            }

            def Shader "St"
            {
                uniform token info:id = "UsdPrimvarReader_float2"
                string inputs:varname = "st"
                float2 outputs:result
            }

            def Shader "Tex"
            {
                uniform token info:id = "UsdUVTexture"
                asset inputs:file = @${texName}@
                token inputs:sourceColorSpace = "sRGB"
                float2 inputs:st.connect = </Root/Materials/CanvasMat/St.outputs:result>
                token inputs:wrapS = "clamp"
                token inputs:wrapT = "clamp"
                float3 outputs:rgb
            }
        }

        def Material "BackMat"
        {
            token outputs:surface.connect = </Root/Materials/BackMat/PBR.outputs:surface>

            def Shader "PBR"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor = (${LINEN.join(', ')})
                float inputs:metallic = 0
                float inputs:roughness = 1
                token outputs:surface
            }
        }
    }
}
`;
}

// USDZ = an uncompressed zip whose files start on 64-byte boundaries, the .usda first.
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export function zipStore(files) {
  const enc = new TextEncoder(), chunks = [], central = [];
  let off = 0;
  for (const f of files) {
    const name = enc.encode(f.name), data = f.data, crc = crc32(data);
    const pad = (64 - ((off + 30 + name.length + 4) % 64)) % 64; // extra field: 4-byte header + padding
    const extra = new Uint8Array(4 + pad), ev = new DataView(extra.buffer); ev.setUint16(0, 0x1986, true); ev.setUint16(2, pad, true);
    const h = new Uint8Array(30), hv = new DataView(h.buffer);
    hv.setUint32(0, 0x04034b50, true); hv.setUint16(4, 20, true); hv.setUint16(8, 0, true);
    hv.setUint32(14, crc, true); hv.setUint32(18, data.length, true); hv.setUint32(22, data.length, true);
    hv.setUint16(26, name.length, true); hv.setUint16(28, extra.length, true);
    chunks.push(h, name, extra, data);
    const c = new Uint8Array(46), cv = new DataView(c.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true); cv.setUint32(42, off, true);
    central.push(c, name);
    off += 30 + name.length + extra.length + data.length;
  }
  const cdSize = central.reduce((s, c) => s + c.length, 0), end = new Uint8Array(22), endv = new DataView(end.buffer);
  endv.setUint32(0, 0x06054b50, true); endv.setUint16(8, files.length, true); endv.setUint16(10, files.length, true);
  endv.setUint32(12, cdSize, true); endv.setUint32(16, off, true);
  return new Blob([...chunks, ...central, end], { type: 'model/vnd.usdz+zip' });
}
export function buildUSDZ(spec, jpeg) {
  const usda = new TextEncoder().encode(buildUSDA(spec, 'painting.jpg'));
  return zipStore([{ name: 'painting.usda', data: usda }, { name: 'painting.jpg', data: jpeg }]);
}
