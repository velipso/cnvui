// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/cnvui

function CnvUI(){
	var defaultSkin = {
		button: {
			font    : 'sans-serif',
			normal  : { bg: '#007', fg: '#fff' },
			disabled: { bg: '#777', fg: '#bbb' },
			hover   : { bg: '#33c', fg: '#fff' },
			active  : { bg: '#55f', fg: '#fff' }
		},
		scrollbar: {
			gutter: { normal: '#88f', disabled: '#777', hover: '#aaf', active: '#ccf' },
			button: { normal: '#400', disabled: '#777', hover: '#700', active: '#b00' },
			arrow : { normal: '#000', disabled: '#777', hover: '#333', active: '#444' },
			thumb : { normal: '#aaa', disabled: '#777', hover: '#ccc', active: '#eee' },
			edge  : { normal: '#bbb', disabled: '#777', hover: '#ddd', active: '#eee' }
		}
	};

	var my, cnv = null, ctx = null;
	var redrawing = false;
	var curover = false;
	var curcapture = false;

	function has(obj, key){
		return Object.prototype.hasOwnProperty.call(obj, key);
	}

	function redraw(){
		if (redrawing)
			return;
		redrawing = true;
		setTimeout(my.redraw, 1);
	}

	function mpos(e){
		var r = cnv.getBoundingClientRect();
		return [
			(e.clientX - r.left) * cnv.width / (r.right - r.left),
			(e.clientY - r.top) * cnv.height / (r.bottom - r.top)
		];
	}

	function mhit(mp){
		var ret = false;
		for (var i = 0; i < my.components.length; i++){
			var comp = my.components[i];
			if (!comp.visible)
				continue;
			var r = comp.rect();
			if (mp[0] >= r.x && mp[0] < r.x + r.width &&
				mp[1] >= r.y && mp[1] < r.y + r.height)
				ret = comp;
		}

		if (ret !== curover){
			if (curover)
				curover.mouseOut(curover);
			curover = ret;
			if (curover)
				curover.mouseOver(curover, mp[0], mp[1]);
		}

		return ret;
	}

	function mouseOver(e){
		var mp = mpos(e);
		var comp = mhit(mp);
		if (comp === false)
			return;
	}

	function mouseOut(e){
		var mp = mpos(e);
		var comp = mhit(mp);
		if (comp === false)
			return;
	}

	function mouseDown(e){
		var mp = mpos(e);
		var comp = mhit(mp);
		if (comp === false)
			return;
		if (comp.mouseDown(comp, mp[0], mp[1]) === true){ // capture mouse?
			if (cnv.setCapture)
				cnv.setCapture();
			curcapture = comp;
		}
	}

	function mouseUp(e){
		var mp = mpos(e);
		if (curcapture){
			var r = curcapture.rect();
			var over = mp[0] >= r.x && mp[0] < r.x + r.width &&
				mp[1] >= r.y && mp[1] < r.y + r.height;
			curcapture.mouseUp(curcapture, mp[0], mp[1], true, over);
			curcapture = false;
			return;
		}
		var comp = mhit(mp);
		if (comp === false)
			return;
		comp.mouseUp(comp, mp[0], mp[1], false, true);
	}

	function mouseMove(e){
		var mp = mpos(e);
		if (curcapture){
			var r = curcapture.rect();
			var over = mp[0] >= r.x && mp[0] < r.x + r.width &&
				mp[1] >= r.y && mp[1] < r.y + r.height;
			curcapture.mouseMove(curcapture, mp[0], mp[1], true, over);
			return;
		}
		var comp = mhit(mp);
		if (comp === false)
			return;
		comp.mouseMove(comp, mp[0], mp[1], false, true);
	}

	function keyDown(e){
	}

	function keyUp(e){
	}

	my = {
		components: [],
		skin: defaultSkin,
		detach: function(){
			if (cnv){
				cnv.removeEventListener('mouseover', mouseOver);
				cnv.removeEventListener('mouseout' , mouseOut );
				cnv.removeEventListener('mousedown', mouseDown);
				cnv.removeEventListener('mouseup'  , mouseUp  );
				cnv.removeEventListener('mousemove', mouseMove);
				cnv.removeEventListener('keydown'  , keyDown  );
				cnv.removeEventListener('keyup'    , keyUp    );
				cnv = null;
				ctx = null;
			}
			return my;
		},
		attach: function(newcnv){
			my.detach();
			cnv = newcnv;
			ctx = cnv.getContext('2d');
			cnv.addEventListener('mouseover', mouseOver);
			cnv.addEventListener('mouseout' , mouseOut );
			cnv.addEventListener('mousedown', mouseDown);
			cnv.addEventListener('mouseup'  , mouseUp  );
			cnv.addEventListener('mousemove', mouseMove);
			cnv.addEventListener('keydown'  , keyDown  );
			cnv.addEventListener('keyup'    , keyUp    );
			return my;
		},
		addComponent: function(opts){
			// opts is an object with the following keys:
			// {
			//   pt1: { // upper-left point of window (required)
			//     from: 'relative' | 'topleft' | 'topright' | 'bottomleft' | 'bottomright',
			//     x: value,
			//     y: value
			//   },
			//   pt2: { ... }, // lower-right point of window (required)
			//
			//   // pt1/pt2 can also be functions which get called to calculate the window bounds
			//   // function ptX(relativePt, canvasWidth, canvasHeight){ return [x, y] }
			//
			//   redraw: function(comp, style, ctx){ ... }, // redraw code (required)
			//   mouseOver: function(comp, mx, my){ ... }, // fired when mouse goes over component
			//   mouseOut: function(comp){ ... }, // mouse out
			//   mouseDown: function(comp, mx, my){ ... }, // mouse down
			//   mouseUp: function(comp, mx, my){ ... }, // mouse up
			//   mouseMove: function(comp, mx, my){ ... }, // mouse move
			//   canFocus: true | false, // can the component get keyboard focus?
			//   visible: true | false, // is the component visible?
			//   enabled: true | false, // is the component enabled?
			//   state: anything, // the component state (unique per component)
			// }
			function nop(){}
			var comp = {
				pt1: opts.pt1,
				pt2: opts.pt2,
				canFocus: has(opts, 'canFocus') ? opts.canFocus : true,
				visible: has(opts, 'visible') ? opts.visible : true,
				enabled: has(opts, 'enabled') ? opts.enabled : true,
				state: opts.state,
				redraw: opts.redraw,
				mouseOver: has(opts, 'mouseOver') ? opts.mouseOver : nop,
				mouseOut : has(opts, 'mouseOut' ) ? opts.mouseOut  : nop,
				mouseDown: has(opts, 'mouseDown') ? opts.mouseDown : nop,
				mouseUp  : has(opts, 'mouseUp'  ) ? opts.mouseUp   : nop,
				mouseMove: has(opts, 'mouseMove') ? opts.mouseMove : nop,
				invalidated: true,
				invalidate: function(){ // call to force a redraw
					comp.invalidated = true;
					redraw();
					return comp;
				},
				show: function(flag){
					if (typeof flag == 'undefined')
						flag = true;
					if (flag == comp.visible)
						return comp;
					comp.visible = flag;
					if (flag)
						comp.invalidate();
					return comp;
				},
				enable: function(flag){
					if (typeof flag == 'undefined')
						flag = true;
					if (flag == comp.enabled)
						return comp;
					comp.enabled = flag;
					return comp.invalidate();
				},
				rect: function(){ // calculate bounding rectangle
					var w = cnv === null ? 0 : cnv.width;
					var h = cnv === null ? 0 : cnv.height;
					function calcpt(rel, pt){
						if (typeof pt === 'function')
							return pt(rel, w, h);
						switch (pt.from){
							case 'topleft':
								return [pt.x, pt.y];
							case 'topright':
								return [w - pt.x, pt.y];
							case 'bottomleft':
								return [pt.x, h - pt.y];
							case 'bottomright':
								return [w - pt.x, h - pt.y];
							case 'relative':
							default:
								return [rel[0] + pt.x, rel[1] + pt.y];
						}
					}
					var p1 = calcpt([0, 0], comp.pt1);
					var p2 = calcpt(p1, comp.pt2);
					return {
						x: Math.min(p1[0], p2[0]),
						y: Math.min(p1[1], p2[1]),
						width: Math.abs(p1[0] - p2[0]),
						height: Math.abs(p1[1] - p2[1])
					};
				}
			};
			my.components.push(comp);
			redraw();
			return comp;
		},
		removeComponent: function(comp){
			var idx = my.components.indexOf(comp);
			if (idx >= 0)
				my.components.splice(idx, 1);
			return my;
		},
		redraw: function(){
			redrawing = false;

			function style(){
				// perform a lookeyUp of a value in skin using the arguments
				var here = my.skin;
				function next(k){
					if (Object.prototype.toString.call(here) === '[object Object]' && has(here, k))
						here = here[k];
					else
						here = '#000';
				}
				for (var i = 0; i < arguments.length; i++){
					var a = arguments[i];
					if (Object.prototype.toString.call(a) === '[object Array]')
						a.forEach(next);
					else
						next(a);
				}
				return here;
			}

			for (var i = 0; i < my.components.length; i++){
				var comp = my.components[i];
				if (comp.visible && comp.invalidated){
					comp.invalidated = false;
					comp.redraw(comp, style, ctx);
				}
			}
			return my;
		},

		// common UI components
		addButton: function(opts){
			// opts is an object with the following keys:
			// {
			//   pt1: (see addComponent's pt1),
			//   pt2: (see addComponent's pt2),
			//   text: 'Button Text', // optionally a function for drawing the button face
			//   skin: ['skin', 'path'], // defaults to ['button']
			//   enabled: true | false,
			//   click: function(comp){ ... called when button is clicked ... },
			//   dx: 0, // amount to move the text when the button is active
			//   dy: 0, // amount to move the text when the button is active
			//   padding: 0, // amount of vertical padding for text
			//   lineHeight: 1, // line height ratio
			//   fontSize: false, // false to auto-calculate based on padding/lineHeight
			// }
			return my.addComponent({
				pt1: opts.pt1,
				pt2: opts.pt2,
				enabled: has(opts, 'enabled') ? opts.enabled : true,
				state: {
					mstate: 'normal',
					text: has(opts, 'text') ? opts.text : '',
					skin: has(opts, 'skin') ? opts.skin : ['button'],
					click: opts.click,
					dx: has(opts, 'dx') ? opts.dx : 0,
					dy: has(opts, 'dy') ? opts.dy : 0,
					padding: has(opts, 'padding') ? opts.padding : 0,
					lineHeight: has(opts, 'lineHeight') ? opts.lineHeight : 1,
					fontSize: has(opts, 'fontSize') ? opts.fontSize : false
				},
				mouseOver: function(comp, mx, my){
					comp.state.mstate = 'hover';
					comp.invalidate();
				},
				mouseOut: function(comp){
					comp.state.mstate = 'normal';
					comp.invalidate();
				},
				mouseDown: function(comp, mx, my){
					comp.state.mstate = 'active';
					comp.invalidate();
					return true; // capture mouse
				},
				mouseUp: function(comp, mx, my, cap, over){
					comp.state.mstate = over ? 'hover' : 'normal';
					if (cap && over)
						comp.state.click(comp);
					comp.invalidate();
				},
				mouseMove: function(comp, mx, my, cap, over){
					if (cap){
						var st = over ? 'active' : 'normal';
						if (st !== comp.state.mstate){
							comp.state.mstate = st;
							comp.invalidate();
						}
					}
				},
				redraw: function(comp, style, ctx){
					var r = comp.rect();
					var st = comp.enabled ? comp.state.mstate : 'disabled';
					ctx.save();
					ctx.fillStyle = style(comp.state.skin, st, 'bg');
					ctx.fillRect(r.x, r.y, r.width, r.height);
					if (typeof comp.state.text === 'function')
						comp.state.text(comp, style, ctx, st);
					else{
						var txt = comp.state.text.split('\n');
						var lh = (r.height - comp.state.padding * 2) / txt.length;
						var fs = comp.state.fontSize;
						if (fs === false)
							fs = Math.round(lh / comp.state.lineHeight) + 'px';
						ctx.font = fs + ' ' + style(comp.state.skin, 'font');
						ctx.textAlign = 'center';
						ctx.textBaseline = 'middle';
						ctx.fillStyle = style(comp.state.skin, st, 'fg');
						var dx = st === 'active' ? comp.state.dx : 0;
						var dy = st === 'active' ? comp.state.dy : 0;
						for (var i = 0; i < txt.length; i++){
							ctx.fillText(txt[i],
								r.x + r.width * 0.5 + dx,
								r.y + comp.state.padding + (i + 0.5) * lh + dy,
								r.width);
						}
					}
					ctx.restore();
				}
			});
		},
		addScrollbar: function(opts){
			// opts is an object with the following keys:
			// {
			//   pt1: (see addComponent's pt1),
			//   pt2: (see addComponent's pt2),
			//   skin: ['skin', 'path'], // defaults to ['scrollbar']
			//   enabled: true | false,
			//   horizontal: true | false,
			//   dx: 0, // amount to move the arrow when the button is active
			//   dy: 0, // amount to move the arrow when the button is active
			//   edgeSize: 0, // edge at thumb for resiziable window sizes (0 to disable)
			//   value: 0, // starting position
			//   windowRange: [low, high],
			//   windowSize: 1,
			//   beforeUpdate: function(comp, value, size){ ... returns new values ... },
			//   // returns: { value: newValue, size: newSize } to alter the updated value
			//   update: function(comp, value, size){ ... values have been updated ... }
			// }
			var comp = my.addComponent({
				pt1: opts.pt1,
				pt2: opts.pt2,
				state: {
					mstate: { over: false, active: false },
					skin: has(opts, 'skin') ? opts.skin : ['scrollbar'],
					horizontal: opts.horizontal,
					dx: has(opts, 'dx') ? opts.dx : 0,
					dy: has(opts, 'dy') ? opts.dy : 0,
					edgeSize: has(opts, 'edgeSize') ? opts.edgeSize : 0,
					value: false,
					windowRange: opts.windowRange,
					windowSize: false,
					dragStart: 0,
					beforeUpdate: has(opts, 'beforeUpdate') ? opts.beforeUpdate : function(){},
					update: opts.update,
					set: function(comp, value, size){
						if (size <= 0)
							size = 1;
						var rng = comp.state.windowRange[1] - comp.state.windowRange[0];
						if (size > rng)
							size = rng;
						value = Math.min(Math.max(comp.state.windowRange[0], value),
							comp.state.windowRange[1] - size);
						if (value !== comp.state.value || size !== comp.state.size){
							comp.state.value = value;
							comp.state.windowSize = size;
							comp.state.update(comp, value, size);
							comp.invalidate();
						}
					},
					regions: function(comp){
						var r = comp.rect();
						var dwr = comp.state.windowRange[1] - comp.state.windowRange[0];
						var value1p = (comp.state.value - comp.state.windowRange[0]) / dwr;
						var value2p = (comp.state.value - comp.state.windowRange[0] +
							comp.state.windowSize) / dwr;
						if (comp.state.horizontal){
							var gutterw = r.width - r.height * 2;
							var thumb1pos = Math.round(value1p * gutterw);
							var thumb2pos = Math.round(value2p * gutterw);
							return {
								valuePerPix: dwr / gutterw,
								arrow1: {
									x: r.x,
									y: r.y,
									width: r.height,
									height: r.height
								},
								arrow2: {
									x: r.x + r.width - r.height,
									y: r.y,
									width: r.height,
									height: r.height
								},
								gutter: {
									x: r.x + r.height,
									y: r.y,
									width: gutterw,
									height: r.height
								},
								edge1: {
									x: r.x + r.height + thumb1pos,
									y: r.y,
									width: comp.state.edgeSize,
									height: r.height
								},
								thumb: {
									x: r.x + r.height + thumb1pos + comp.state.edgeSize,
									y: r.y,
									width: thumb2pos - thumb1pos - 2 * comp.state.edgeSize,
									height: r.height
								},
								edge2: {
									x: r.x + r.height + thumb2pos - comp.state.edgeSize,
									y: r.y,
									width: comp.state.edgeSize,
									height: r.height
								}
							};
						}
						else{
							return {
								valuePerPix: dwr / gutterw,
								arrow1: {
									x: r.x,
									y: r.y,
									width: r.width,
									height: r.width
								},
								arrow2: {
									x: r.x,
									y: r.y + r.height - r.width,
									width: r.width,
									height: r.width
								},
								gutter: {
									x: r.x,
									y: r.y + r.width,
									width: r.width,
									height: r.height - r.width * 2
								},
								edge1: {
									x: r.x,
									y: 0,
									width: r.width,
									height: comp.state.edgeSize
								},
								thumb: {
									x: r.x,
									y: 0,
									width: r.width,
									height: 10
								},
								edge2: {
									x: r.x,
									y: 0,
									width: r.width,
									height: comp.state.edgeSize
								}
							};
						}
					},
					calcMouseState: function(comp, mx, my){
						var r = comp.state.regions(comp);
						comp.state.mstate.over = false;
						comp.state.mstate.active = false;
						function testr(ov){
							var rr = r[ov];
							if (mx >= rr.x && mx < rr.x + rr.width &&
								my >= rr.y && my < rr.y + rr.height)
								comp.state.mstate.over = ov;
						}
						testr('gutter');
						testr('edge1');
						testr('edge2');
						testr('thumb');
						testr('arrow1');
						testr('arrow2');
					}
				},
				mouseOver: function(comp, mx, my){
					comp.state.calcMouseState(comp, mx, my);
					comp.invalidate();
				},
				mouseOut: function(comp){
					comp.state.mstate.over = false;
					comp.state.mstate.active = false;
					comp.invalidate();
				},
				mouseDown: function(comp, mx, my){
					comp.state.calcMouseState(comp, mx, my);
					comp.state.mstate.active = true;
					comp.invalidate();
					if ((['edge1', 'thumb', 'edge2']).indexOf(comp.state.mstate.over) >= 0){
						// draggable
						comp.state.dragStart = comp.state.horizontal ? mx : my;
						return true; // capture mouse
					}
					// TODO: handle click
				},
				mouseUp: function(comp, mx, my, cap, over){
					comp.state.calcMouseState(comp, mx, my);
					comp.invalidate();
				},
				mouseMove: function(comp, mx, my, cap, over){
					if (cap){
						var r = comp.state.regions(comp);
						var md = comp.state.horizontal ? mx : my;
						var vd = r.valuePerPix * (md - comp.state.dragStart);
						switch (comp.state.mstate.over){
							case 'edge1':
								var ov = comp.state.value;
								var os = comp.state.windowSize;
								var ns = os - vd;
								var nv = ov + vd;
								if (nv < comp.state.windowRange[0]){
									ns += nv - comp.state.windowRange[0];
									nv = comp.state.windowRange[0];
								}
								if (ns <= 0){
									nv += ns - os;
									ns = os;
								}
								else if (ns >
									comp.state.windowRange[1] - comp.state.windowRange[0]){
									ns = comp.state.windowRange[1] - comp.state.windowRange[0];
								}
								nv = Math.min(Math.max(comp.state.windowRange[0], nv),
									comp.state.windowRange[1] - ns);
								var u = comp.state.beforeUpdate(comp, nv, ns);
								if (typeof u === 'undefined')
									u = { value: nv, size: ns };
								if (u.size <= 0){
									u.value += u.size - os;
									u.size = os;
								}
								else if (u.size > comp.state.windowRange[1] -
										comp.state.windowRange[0]){
									u.size = comp.state.windowRange[1] - comp.state.windowRange[0];
								}
								u.value = Math.min(
									Math.max(comp.state.windowRange[0], u.value),
									comp.state.windowRange[1] - u.size);
								if (u !== false && (u.value !== ov || u.size !== os)){
									comp.state.dragStart += (u.value - ov) / r.valuePerPix;
									comp.state.set(comp, u.value, u.size);
								}
								break;
							case 'thumb':
								var ov = comp.state.value;
								var os = comp.state.windowSize;
								var nv = Math.min(
									Math.max(comp.state.windowRange[0], ov + vd),
									comp.state.windowRange[1] - comp.state.windowSize);
								var u = comp.state.beforeUpdate(comp, nv, comp.state.windowSize);
								if (typeof u === 'undefined')
									u = { value: nv, size: comp.state.windowSize };
								if (u.size <= 0)
									u.size = os;
								else if (u.size > comp.state.windowRange[1] -
										comp.state.windowRange[0]){
									u.size = comp.state.windowRange[1] - comp.state.windowRange[0];
								}
								u.value = Math.min(
									Math.max(comp.state.windowRange[0], u.value),
									comp.state.windowRange[1] - u.size);
								if (u !== false && (u.value !== ov || u.size !== os)){
									comp.state.dragStart += (u.value - ov) / r.valuePerPix;
									comp.state.set(comp, u.value, u.size);
								}
								break;
							case 'edge2':
								var ov = comp.state.value;
								var os = comp.state.windowSize;
								var ns = os + vd;
								if (ns <= 0)
									ns = os;
								else if (comp.state.value + ns > comp.state.windowRange[1])
									ns = comp.state.windowRange[1] - comp.state.value;
								var u = comp.state.beforeUpdate(comp, comp.state.value, ns);
								if (typeof u === 'undefined')
									u = { value: nv, size: ns };
								if (u.size <= 0)
									u.size = os;
								else if (u.size > comp.state.windowRange[1] -
										comp.state.windowRange[0]){
									u.size = comp.state.windowRange[1] - comp.state.windowRange[0];
								}
								u.value = Math.min(
									Math.max(comp.state.windowRange[0], u.value),
									comp.state.windowRange[1] - u.size);
								if (u !== false && (u.value !== ov || u.size !== os)){
									comp.state.dragStart += (u.size - os) / r.valuePerPix;
									comp.state.set(comp, u.value, u.size);
								}
								break;
						}
					}
					else{
						comp.state.calcMouseState(comp, mx, my);
						comp.invalidate();
					}
				},
				redraw: function(comp, style, ctx){
					var r = comp.state.regions(comp);
					function getst(cat, over){
						return style(comp.state.skin, cat,
							!comp.enabled ? 'disabled' :
							comp.state.mstate.over === over ?
								(comp.state.mstate.active ? 'active' : 'hover') : 'normal');
					}
					ctx.fillStyle = getst('gutter', 'gutter');
					ctx.fillRect(r.gutter.x, r.gutter.y, r.gutter.width, r.gutter.height);
					ctx.fillStyle = getst('button', 'arrow1');
					ctx.fillRect(r.arrow1.x, r.arrow1.y, r.arrow1.width, r.arrow1.height);
					ctx.fillStyle = getst('button', 'arrow2');
					ctx.fillRect(r.arrow2.x, r.arrow2.y, r.arrow2.width, r.arrow2.height);
					ctx.fillStyle = getst('edge', 'edge1');
					ctx.fillRect(r.edge1.x, r.edge1.y, r.edge1.width, r.edge1.height);
					ctx.fillStyle = getst('thumb', 'thumb');
					ctx.fillRect(r.thumb.x, r.thumb.y, r.thumb.width, r.thumb.height);
					ctx.fillStyle = getst('edge', 'edge2');
					ctx.fillRect(r.edge2.x, r.edge2.y, r.edge2.width, r.edge2.height);
				}
			});
			comp.state.set(comp,
				has(opts, 'value') ? opts.value : 0,
				has(opts, 'windowSize') ? opts.windowSize : 1);
			return comp;
		}
	};
	return my;
}
