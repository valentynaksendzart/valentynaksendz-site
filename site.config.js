/* =====================================================================
   SITE CONFIG — everything that is specific to one artist lives here.
   НАСТРОЙКИ САЙТА — всё, что относится к конкретному художнику, здесь.
   For a new client: copy the repo, edit this file (and see SETUP.md).
   Для нового клиента: скопируйте репозиторий, правьте этот файл (см. SETUP.md).
   ===================================================================== */
window.SITE_CONFIG = {
  // Artist / brand
  artistName: "Valentyna Ksendz",
  siteTitle: "Valentyna Ksendz Art",
  instagramHandle: "@valentynaart_uk",
  // SKU prefix for products (must match SKU_PREFIX in lib/site.js)
  skuPrefix: "VK",

  // Colours: applied as CSS variables on page load (see :root in index.html)
  colors: {
    "--wall": "#183D32",      // page background (Deep Forest Green)
    "--paper": "#1f4a3d",     // raised panels
    "--ink": "#f4eedd",       // main text
    "--muted": "#d2ccb6",     // secondary text
    "--rule": "#3a6656",
    "--gold": "#d9bc6e",      // headings, buttons
    "--gold-deep": "#b99a4c",
    "--accent": "#e4c97d",
    "--accent-ink": "#183D32"
  },

  // Painting themes / collections (pal + style drive the placeholder art)
themes: {
  wildflowers:{name:"Wildflowers",blurb:"Poppies, cornflowers, chamomile and meadow grasses, painted the way a field feels in June.",pal:["#5f7d3a","#8aa35a","#c8d49a","#d23b2a","#3f5bb0","#f4f1e6","#e9b93c"],style:"meadow"},
  impressions:{name:"Impressions",blurb:"Soft, Monet-inspired light: ponds, river mist and gardens seen through half-closed eyes.",pal:["#8fa8c8","#b9c7dd","#c7b8d8","#a8c4a0","#e8d9b5","#6f88a8","#f1e8d8"],style:"monet"},
  impasto:{name:"Impasto",blurb:"Thick, sculpted paint laid on with knife and brush. Up close it is pure texture; step back and the flowers appear.",pal:["#e7c33a","#d9822b","#b23a3a","#f3eee0","#5a7a3a","#2f3a5a","#e9a3b0"],style:"impasto"},
  splash:{name:"Splash & Pour",blurb:"Acrylic thrown, poured and dabbed with gloves, sticks, knives and sponges, then gently guided into an image.",pal:["#1f2a44","#3a6fb0","#e05a7a","#f2c14e","#7fc8a9","#f6f4ee","#a26bd1"],style:"splash"}
},

  // Number of prints in each limited edition
  instagram: "https://www.instagram.com/valentynaart_uk/",
  edition: 10,

  // Frame options under 'Buy original' (prices TBC)
  frames: [
  {id:"none",name:"No frame",desc:"Painted edges, ready to hang as it is",price:"Included",sw:"repeating-linear-gradient(45deg,#4b6b5f 0 4px,#3a5a4e 4px 8px)"},
  {id:"oak",name:"Natural oak floating frame",desc:"Light wood with a small shadow gap around the canvas",price:"+ price TBC",cm:2.5,gap:.8,bg:"linear-gradient(135deg,#d7b68a,#b38d5f)",sw:"linear-gradient(135deg,#d7b68a,#b38d5f)"},
  {id:"black",name:"Black floating frame",desc:"Slim and modern, makes bright colours glow",price:"+ price TBC",cm:2.5,gap:.8,bg:"linear-gradient(135deg,#3a3a3a,#141414)",sw:"linear-gradient(135deg,#3a3a3a,#141414)"},
  {id:"gold",name:"Classic gold frame",desc:"Traditional moulding, beautiful with impressionist work",price:"+ price TBC",cm:6,gap:0,bg:"linear-gradient(135deg,#f0d78c,#b8913f 45%,#e6c672 60%,#9c7a30)",sw:"linear-gradient(135deg,#f0d78c,#b8913f 45%,#e6c672 60%,#9c7a30)"},
  {id:"help",name:"Help me choose a frame",desc:"Valentyna suggests 2 or 3 frames for this painting and your room, with photos, before you decide",price:"Free advice",sw:"radial-gradient(circle,#d9bc6e 0 30%,#4b6b5f 31%)"}
],

  // Longest side (cm) above which a painting ships rolled
  rollOverCm: 70,
  styleNames: {meadow:"Contemporary impressionism",monet:"Impressionism, Monet-inspired",impasto:"Impasto, palette knife",splash:"Acrylic splash & pour"},

  // Shipping destinations: ok=false means not served, wood=false means no wooden stretcher/crate
  countries: [
  {v:"uk",n:"United Kingdom",zone:"Domestic",ok:true,wood:true},
  {v:"eu",n:"Europe (EU)",zone:"Europe",ok:true,wood:true},
  {v:"us",n:"United States",zone:"North America",ok:true,wood:true},
  {v:"ca",n:"Canada",zone:"North America",ok:true,wood:true},
  {v:"jp",n:"Japan",zone:"Asia",ok:true,wood:true},
  {v:"asia",n:"Other Asia",zone:"Asia",ok:true,wood:true},
  {v:"au",n:"Australia",zone:"Oceania",ok:true,wood:false},
  {v:"nz",n:"New Zealand",zone:"Oceania",ok:true,wood:false},
  {v:"za",n:"South Africa",zone:"Not available",ok:false,wood:true}
],

  // Currencies: prices are stored in the first one (rate 1); other rates are approximate
  currencies: {
  GBP:{label:"GBP (£)",sym:"£",rate:1,locale:"en-GB"},
  USD:{label:"USD (US$)",sym:"US$",rate:1.27,locale:"en-US"},
  EUR:{label:"EUR (€)",sym:"€",rate:1.17,locale:"de-DE"},
  CAD:{label:"CAD (CA$)",sym:"CA$",rate:1.76,locale:"en-CA"},
  AUD:{label:"AUD (A$)",sym:"A$",rate:1.93,locale:"en-AU"},
  JPY:{label:"JPY (¥)",sym:"¥",rate:190,locale:"ja-JP"}
}};

// Apply colours before the page paints (no flash of the wrong theme).
(function (c) {
  var s = document.documentElement.style;
  for (var k in c.colors) s.setProperty(k, c.colors[k]);
})(window.SITE_CONFIG);
