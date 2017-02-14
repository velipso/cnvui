// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/cnvui

function CnvUI(){
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
				curover.mout(curover);
			curover = ret;
			if (curover)
				curover.mover(curover, mp[0], mp[1]);
		}

		return ret;
	}

	function mover(e){
		var mp = mpos(e);
		var comp = mhit(mp);
		if (comp === false)
			return;
	}

	function mout(e){
		var mp = mpos(e);
		var comp = mhit(mp);
		if (comp === false)
			return;
	}

	function mdown(e){
		var mp = mpos(e);
		var comp = mhit(mp);
		if (comp === false)
			return;
		if (comp.mdown(comp, mp[0], mp[1]) === true){ // capture mouse?
			if (cnv.setCapture)
				cnv.setCapture();
			curcapture = comp;
		}
	}

	function mup(e){
		var mp = mpos(e);
		if (curcapture){
			var r = curcapture.rect();
			var over = mp[0] >= r.x && mp[0] < r.x + r.width &&
				mp[1] >= r.y && mp[1] < r.y + r.height;
			curcapture.mup(curcapture, mp[0], mp[1], true, over);
			curcapture = false;
			return;
		}
		var comp = mhit(mp);
		if (comp === false)
			return;
		comp.mup(comp, mp[0], mp[1], false, true);
	}

	function mmove(e){
		var mp = mpos(e);
		if (curcapture){
			var r = curcapture.rect();
			var over = mp[0] >= r.x && mp[0] < r.x + r.width &&
				mp[1] >= r.y && mp[1] < r.y + r.height;
			curcapture.mmove(curcapture, mp[0], mp[1], true, over);
			return;
		}
		var comp = mhit(mp);
		if (comp === false)
			return;
		comp.mmove(comp, mp[0], mp[1], false, true);
	}

	function kdown(e){
	}

	function kup(e){
	}

	my = {
		components: [],
		skin: {
			button: {
				font    : 'sans-serif',
				normal  : { bg: '#007', fg: '#fff' },
				disabled: { bg: '#777', fg: '#bbb' },
				hover   : { bg: '#33c', fg: '#fff' },
				active  : { bg: '#55f', fg: '#fff' }
			}
		},
		detach: function(){
			if (cnv){
				cnv.removeEventListener('mouseover', mover);
				cnv.removeEventListener('mouseout' , mout );
				cnv.removeEventListener('mousedown', mdown);
				cnv.removeEventListener('mouseup'  , mup  );
				cnv.removeEventListener('mousemove', mmove);
				cnv.removeEventListener('keydown'  , kdown);
				cnv.removeEventListener('keyup'    , kup  );
				cnv = null;
				ctx = null;
			}
			return my;
		},
		attach: function(newcnv){
			my.detach();
			cnv = newcnv;
			ctx = cnv.getContext('2d');
			cnv.addEventListener('mouseover', mover);
			cnv.addEventListener('mouseout' , mout );
			cnv.addEventListener('mousedown', mdown);
			cnv.addEventListener('mouseup'  , mup  );
			cnv.addEventListener('mousemove', mmove);
			cnv.addEventListener('keydown'  , kdown);
			cnv.addEventListener('keyup'    , kup  );
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
			//   mover: function(comp, mx, my){ ... }, // fired when mouse goes over component
			//   mout: function(comp){ ... }, // mouse out
			//   mdown: function(comp, mx, my){ ... }, // mouse down
			//   mup: function(comp, mx, my){ ... }, // mouse up
			//   mmove: function(comp, mx, my){ ... }, // mouse move
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
				mover: has(opts, 'mover') ? opts.mover : nop,
				mout : has(opts, 'mout' ) ? opts.mout  : nop,
				mdown: has(opts, 'mdown') ? opts.mdown : nop,
				mup  : has(opts, 'mup'  ) ? opts.mup   : nop,
				mmove: has(opts, 'mmove') ? opts.mmove : nop,
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
				// perform a lookup of a value in skin using the arguments
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
			//   click: function(){ ... called when button is clicked ... },
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
				mover: function(comp, mx, my){
					comp.state.mstate = 'hover';
					comp.invalidate();
				},
				mout: function(comp){
					comp.state.mstate = 'normal';
					comp.invalidate();
				},
				mdown: function(comp, mx, my){
					comp.state.mstate = 'active';
					comp.invalidate();
					return true; // capture mouse
				},
				mup: function(comp, mx, my, cap, over){
					comp.state.mstate = over ? 'hover' : 'normal';
					if (cap && over)
						comp.state.click(comp);
					comp.invalidate();
				},
				mmove: function(comp, mx, my, cap, over){
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
		}
	};
	return my;
}
