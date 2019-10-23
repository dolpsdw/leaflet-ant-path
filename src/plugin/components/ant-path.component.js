import { FeatureGroup, polyline, canvas } from "leaflet";
//* Closure @private uids to be used as key https://javascript.info/symbol
const Layers = { main: Symbol("main"), pulse: Symbol("pulse") };

/**
 * Builds the layers for each polyArray[{path: LatLng|MultiPolyline, polyOptions}]
 * 1 layer foreach path, 1 layer for each diferent polyType in path (dash animations)
 * @class
 * @extends {L.FeatureGroup}
 */
export default class AntPath extends FeatureGroup {
  //this[Layers.main], this references are required for layer & polyline interfaces
  [Layers.main] = [];
  [Layers.pulse] = [];

  _map = null;

  /**
   * polyOptions to apply for each L.Path
   * @typedef {Object<string,any>} polyOptions
   * @property {polyline} use - L.pathType to use for construct the path
   * @property {number} weight - weight of the path stroke
   * @property {Renderer} renderer - render used to render polylayers
   * @property {number} opacity - opacity of the stroke
   * @property {string} color - hex color
   */
  /**
   * default polyOption that will be merged on each L.Path
   * @type {polyOptions}
   * @memberof AntPath
   */
  _defaultPolyOptions = {
    use: polyline,
    weight: 5,
    renderer: canvas({ pane: "overlayPane" }),
    opacity: 0.5,
    color: "#0000FF"
  };
  /**
   * dashedOptions to apply on the dashed animated path
   * @typedef {Object<string,any>} dashedOptions
   * @property {Renderer} renderer - render used to render dashedlayers
   * @property {number} delay - speed of animation
   * @property {string} dashArray - dashed pattern
   * @property {string} color - hex color
   * @property {boolean} paused - state of animation
   * @property {boolean} reverse - direction of animation
   */
  /**
   * default dashedOptions that will be merged with the input
   * @type {dashedOptions}
   * @memberof AntPath
   */
  _defaultdashedOptions = {
    renderer: canvas({ pane: "overlayPane" }),
    delay: 400,
    dashArray: "10,20",
    color: "#FFFFFF",
    paused: false,
    reverse: false
  };
  /**
   * polyDef to construct a Path
   * @typedef {Object<string,any>} polyDef
   * @property {latLngs|latlngs[]} path - single polyline latlngs or Multilatlngs
   * @property {polyOptions} [polyOptions=_defaultOptions] - Path options to apply
   */
  /**
   * polyArray
   * @type {Array<polyDef>}
   * @memberof AntPath
   */
  _polyArrayInput;
  /**
   * dashedOptions
   * @type {dashedOptions}
   * @memberof AntPath
   */
  _dashedOptionsInput = {};
  /**
   * Creates an instance of AntPath.
   * @constructor
   * @param {Array<polyDef>} polyArray - The Array of {@link polyDef} to be draw.
   * @param {dashedOptions} [commondashedOptions=_defaultdashedOptions] - The {@link dashedOptions} of dashed animated path (Common to all the Paths)
   * @memberof AntPath
   */
  constructor(polyArray, commondashedOptions) {
    super();
    //* this.options get feeded by Util.setOptions
    this._polyArrayInput = polyArray.map(p => {
      return { ...p, polyOptions: { ...this._defaultPolyOptions, ...p.polyOptions } };
    });
    this._dashedOptionsInput = { ...this._defaultdashedOptions, ...commondashedOptions };
    // no need to call this twice this._mount();
  }
  _mount() {
    //!One Layer per Color (~one per polyArray)(renderer by same canvas) + One layer per dashed polyType (all the dashed animated in same canvas together)
    const dic = {};
    this._polyArrayInput.forEach(i => {
      const l = i.polyOptions.use(i.path, i.polyOptions);
      this.addLayer(l);
      this[Layers.main].push(l);
      //* gather the diferent paths by L.path type
      const ply = i.polyOptions.use.toString();
      if (!dic[ply]) {
        //if not initialized
        dic[ply] = { path: [], use: i.polyOptions.use };
      }
      dic[ply].path.push(i.path); // Test if it do nice on combination of single and multi line
    });
    // Add the dashed layers
    for (const key in dic) {
      if (dic.hasOwnProperty(key)) {
        const dl = dic[key].use(dic[key].path, this._dashedOptionsInput);
        this.addLayer(dl);
        this[Layers.pulse].push(dl);
      }
    }
  }
  /**
   * Last Animation frame
   * @type {number}
   * @memberof AntPath
   */
  _frameRef;
  //! since movecanvas is arrow could acces resume reverse? also maybe redraw only the this[Layers.pulse].foreach?
  _moveCanvas = () => {
    const dashDef = this._dashedOptionsInput.dashArray.split(",");
    let totalDashDef = 0;
    dashDef.forEach(n => totalDashDef + parseInt(n, 10));
    // If at start of animation the dashedOffset = total DashDef, reset the animation (Or is mod = 0)
    if (this._dashedOptionsInput.renderer._ctx.lineDashOffset % totalDashDef === 0) {
      this._dashedOptionsInput.renderer._ctx.lineDashOffset = 0;
    }
    let speed = (1 / this._dashedOptionsInput.delay) * 1000;
    if (this._dashedOptionsInput.reverse) {
      speed = speed * -1;
    }
    this._dashedOptionsInput.renderer._ctx.lineDashOffset += speed; //not sure if non canvas renders have _ctx
    this[Layers.pulse].forEach(l => l.redraw());
    this._frameRef = window.requestAnimationFrame(this._moveCanvas);
  };

  // AntPath leaflet events
  onAdd(map) {
    this._map = map;
    //this._map.on("zoomend", this._calculateAnimationSpeed, this);
    this._mount();
    //* requestAnimation have to be called ONCE for all the Canvas for performance...
    this._frameRef = window.requestAnimationFrame(this._moveCanvas);
    return this;
  }

  onRemove(layer) {
    if (this._map) {
      //this._map.off("zoomend", this._calculateAnimationSpeed, this);
      this._map = null;
    }
    if (layer) {
      this[Layers.pulse].forEach(l => layer.removeLayer(l));
      this[Layers.main].forEach(l => layer.removeLayer(l));
    }
    //* Maybe cancel requestAnimationFrame ? https://developer.mozilla.org/en-US/docs/Web/API/Window/cancelAnimationFrame
    window.cancelAnimationFrame(this._frameRef);
    return this;
  }
  // AntPath public Interface
  pause() {
    if (!this._dashedOptionsInput.paused) {
      this._dashedOptionsInput.paused = true;
      window.cancelAnimationFrame(this._frameRef);
    }
  }

  resume() {
    if (this._dashedOptionsInput.paused) {
      this._dashedOptionsInput.paused = false;
      this._frameRef = window.requestAnimationFrame(this._moveCanvas);
    }
  }

  //Feature Group methods overwriting
  bringToFront() {
    this[Layers.main].forEach(l => l.bringToFront());
    this[Layers.pulse].forEach(l => l.bringToFront());
    return this;
  }

  bringToBack() {
    this[Layers.pulse].forEach(l => l.bringToBack());
    this[Layers.main].forEach(l => l.bringToBack());
    return this;
  }

  //Layer interface
  removeFrom(layer) {
    if (layer && layer.hasLayer(this)) {
      layer.removeLayer(this);
    }
    return this;
  }

  //Polyline interface
  /**
   * reStyle the common dash options
   * @param {dashedOptions} options
   * @memberof AntPath
   */
  setStyle(options) {
    // Todo compare new options to old and implement logic (at the end for redraw, inExample for color & dasharray => this[Layers.pulse].setStyle())
    console.log(options);
    return this;
  }

  redraw() {
    this[Layers.main].forEach(l => l.redraw());
    this[Layers.pulse].forEach(l => l.redraw());
    return this;
  }

  getLatLngs() {
    return this[Layers.pulse].map(l => l.getLatLngs());
  }

  getBounds() {
    return this[Layers.pulse][0].getBounds();
  }

  toGeoJSON() {
    return this[Layers.pulse][0].toGeoJSON();
  }
}
