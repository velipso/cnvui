// (c) Copyright 2017, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/cnvui

var CnvUI = {
	defaultSkin: {
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
	},
	create: function(ext){
		var my;
		var curover = false, curcapture = false;

		function mpos(e){
			var r = my.cnv.getBoundingClientRect();
			return [
				(e.clientX - r.left) * my.cnv.width / (r.right - r.left),
				(e.clientY - r.top) * my.cnv.height / (r.bottom - r.top)
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
					curover.mouseOut();
				curover = ret;
				if (curover)
					curover.mouseOver(mp[0], mp[1]);
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
			if (comp.mouseDown(mp[0], mp[1]) === true){ // capture mouse?
				if (my.cnv.setCapture)
					my.cnv.setCapture();
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
			comp.mouseUp(mp[0], mp[1], false, true);
		}

		function mouseMove(e){
			var mp = mpos(e);
			if (curcapture){
				var r = curcapture.rect();
				var over = mp[0] >= r.x && mp[0] < r.x + r.width &&
					mp[1] >= r.y && mp[1] < r.y + r.height;
				curcapture.mouseMove(mp[0], mp[1], true, over);
				return;
			}
			var comp = mhit(mp);
			if (comp === false)
				return;
			comp.mouseMove(mp[0], mp[1], false, true);
		}

		function keyDown(e){
		}

		function keyUp(e){
		}

		my = {
			components: [],
			skin: CnvUI.defaultSkin,
			cnv: null,
			ctx: null,
			invalidated: false,
			invalidate: function(){
				if (!this.invalidated){
					this.invalidated = true;
					var th = this;
					setTimeout(function(){ th.redraw(); }, 1);
				}
				return this;
			},
			redraw: function(){
				this.invalidated = false;

				var th = this;
				function style(){
					// perform a lookeyUp of a value in skin using the arguments
					var here = th.skin;
					function next(k){
						if (Object.prototype.toString.call(here) === '[object Object]' &&
							Object.prototype.hasOwnProperty.call(here, k))
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

				for (var i = 0; i < this.components.length; i++){
					var comp = this.components[i];
					if (comp.visible && comp.invalidated){
						comp.invalidated = false;
						comp.redraw(style, ctx);
					}
				}
				return this;
			},
			detach: function(){
				if (this.cnv){
					this.cnv.removeEventListener('mouseover', mouseOver);
					this.cnv.removeEventListener('mouseout' , mouseOut );
					this.cnv.removeEventListener('mousedown', mouseDown);
					this.cnv.removeEventListener('mouseup'  , mouseUp  );
					this.cnv.removeEventListener('mousemove', mouseMove);
					this.cnv.removeEventListener('keydown'  , keyDown  );
					this.cnv.removeEventListener('keyup'    , keyUp    );
					this.cnv = null;
					this.ctx = null;
				}
				return this;
			},
			attach: function(newcnv){
				this.detach();
				this.cnv = newcnv;
				this.ctx = this.cnv.getContext('2d');
				this.cnv.addEventListener('mouseover', mouseOver);
				this.cnv.addEventListener('mouseout' , mouseOut );
				this.cnv.addEventListener('mousedown', mouseDown);
				this.cnv.addEventListener('mouseup'  , mouseUp  );
				this.cnv.addEventListener('mousemove', mouseMove);
				this.cnv.addEventListener('keydown'  , keyDown  );
				this.cnv.addEventListener('keyup'    , keyUp    );
				return this;
			},
			add: function(comp){
				if (comp.parent)
					comp.parent.remove(comp);
				comp.parent = this;
				this.components.push(comp);
				comp.invalidate();
				return this;
			},
			remove: function(comp){
				var idx = this.components.indexOf(comp);
				if (idx >= 0){
					this.components.splice(idx, 1);
					comp.parent = null;
				}
				return this;
			},
			width: function(){
				return this.cnv ? this.cnv.width : 0;
			},
			height: function(){
				return this.cnv ? this.cnv.height : 0;
			}
		};
		return CnvUI.extend(my, ext);
	},
	component: function(ext){
		return CnvUI.extend({
			parent: null,
			pt1: { from: 'relative', x: 0, y: 0 },
			pt2: { from: 'relative', x: 0, y: 0 },
			canFocus: true,
			visible: true,
			enabled: true,
			invalidated: true,

			// event handlers
			redraw   : function(style, ctx){},
			mouseOver: function(mx, my){},
			mouseOut : function(){},
			mouseDown: function(mx, my){},
			mouseUp  : function(mx, my, cap, over){},
			mouseMove: function(mx, my, cap, over){},
			keyUp    : function(e){},
			keyDown  : function(e){},

			invalidate: function(){
				this.invalidated = true;
				if (this.parent)
					this.parent.invalidate();
				return this;
			},
			show: function(flag){
				if (typeof flag == 'undefined')
					flag = true;
				if (flag === this.visible)
					return this;
				this.visible = flag;
				if (flag)
					this.invalidate();
				return this;
			},
			enable: function(flag){
				if (typeof flag == 'undefined')
					flag = true;
				if (flag === this.enabled)
					return this;
				this.enabled = flag;
				return this.invalidate();
			},
			rect: function(){ // calculate bounding rectangle
				var w = this.parent ? this.parent.width() : 0;
				var h = this.parent ? this.parent.height() : 0;
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
				var p1 = calcpt([0, 0], this.pt1);
				var p2 = calcpt(p1, this.pt2);
				return {
					x: Math.min(p1[0], p2[0]),
					y: Math.min(p1[1], p2[1]),
					width: Math.abs(p1[0] - p2[0]),
					height: Math.abs(p1[1] - p2[1])
				};
			}
		}, ext);
	},
	extend: function(){
		// general purpose function to combine multiple objects into a single object, right to left
		// example:
		//   CnvUI.extend({ a: 1 }, { b: 2 }, { a: 3 })  =>  { a: 3, b: 2 }
		var args = Array.prototype.slice.call(arguments);
		var o = args.shift();
		while (args.length > 0){
			var a = args.shift();
			for (var k in a){
				if (!Object.prototype.hasOwnProperty.call(a, k))
					continue;
				o[k] = a[k];
			}
		}
		return o;
	},
	button: function(ext){
		return CnvUI.component(CnvUI.extend({
			state: 'normal',
			text: '',
			skin: ['button'],
			click: function(){},
			dx: 0,
			dy: 0,
			padding: 0,
			lineHeight: 1,
			fontSize: false,
			mouseOver: function(mx, my){
				this.state = 'hover';
				this.invalidate();
			},
			mouseOut: function(){
				this.state = 'normal';
				this.invalidate();
			},
			mouseDown: function(mx, my){
				this.state = 'active';
				this.invalidate();
				return true; // capture mouse
			},
			mouseUp: function(mx, my, cap, over){
				this.state = over ? 'hover' : 'normal';
				if (cap && over)
					this.click();
				this.invalidate();
			},
			mouseMove: function(mx, my, cap, over){
				if (cap){
					var st = over ? 'active' : 'normal';
					if (st !== this.state){
						this.state = st;
						this.invalidate();
					}
				}
			},
			redraw: function(style, ctx){
				var r = this.rect();
				var st = this.enabled ? this.state : 'disabled';
				ctx.save();
				ctx.fillStyle = style(this.skin, st, 'bg');
				ctx.fillRect(r.x, r.y, r.width, r.height);
				if (typeof this.text === 'function')
					this.text(style, ctx, st);
				else{
					var txt = this.text.split('\n');
					var lh = (r.height - this.padding * 2) / txt.length;
					var fs = this.fontSize;
					if (fs === false)
						fs = Math.round(lh / this.lineHeight) + 'px';
					ctx.font = fs + ' ' + style(this.skin, 'font');
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';
					ctx.fillStyle = style(this.skin, st, 'fg');
					var dx = st === 'active' ? this.dx : 0;
					var dy = st === 'active' ? this.dy : 0;
					for (var i = 0; i < txt.length; i++){
						ctx.fillText(txt[i],
							r.x + r.width * 0.5 + dx,
							r.y + this.padding + (i + 0.5) * lh + dy,
							r.width);
					}
				}
				ctx.restore();
			}
		}, ext));
	},
	scrollbar: function(ext){
		var comp = CnvUI.component(CnvUI.extend({
			state: { over: false, active: false },
			skin: ['scrollbar'],
			horizontal: true,
			dx: 0,
			dy: 0,
			edgeSize: 0,
			value: 0,
			size: 1,
			range: [0, 0],
			dragStart: 0,
			beforeUpdate: function(value, size){},
			update: function(){},
			set: function(value, size, force){
				if (size <= 0)
					size = 1;
				var rng = this.range[1] - this.range[0];
				if (size > rng)
					size = rng;
				value = Math.min(Math.max(this.range[0], value),
					this.range[1] - size);
				if (force || value !== this.value || size !== this.size){
					this.value = value;
					this.size = size;
					this.update();
					this.invalidate();
				}
			},
			regions: function(){
				var r = this.rect();
				var dwr = this.range[1] - this.range[0];
				var value1p = (this.value - this.range[0]) / dwr;
				var value2p = (this.value - this.range[0] + this.size) / dwr;
				if (this.horizontal){
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
							width: this.edgeSize,
							height: r.height
						},
						thumb: {
							x: r.x + r.height + thumb1pos + this.edgeSize,
							y: r.y,
							width: thumb2pos - thumb1pos - 2 * this.edgeSize,
							height: r.height
						},
						edge2: {
							x: r.x + r.height + thumb2pos - this.edgeSize,
							y: r.y,
							width: this.edgeSize,
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
							height: this.edgeSize
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
							height: this.edgeSize
						}
					};
				}
			},
			calcMouseState: function(mx, my){
				var r = this.regions();
				this.state.over = false;
				this.state.active = false;
				var th = this;
				function testr(ov){
					var rr = r[ov];
					if (mx >= rr.x && mx < rr.x + rr.width &&
						my >= rr.y && my < rr.y + rr.height)
						th.state.over = ov;
				}
				testr('gutter');
				testr('edge1');
				testr('edge2');
				testr('thumb');
				testr('arrow1');
				testr('arrow2');
			},
			mouseOver: function(mx, my){
				this.calcMouseState(mx, my);
				this.invalidate();
			},
			mouseOut: function(){
				this.state.over = false;
				this.state.active = false;
				this.invalidate();
			},
			mouseDown: function(mx, my){
				this.calcMouseState(mx, my);
				this.state.active = true;
				this.invalidate();
				if ((['edge1', 'thumb', 'edge2']).indexOf(this.state.over) >= 0){
					// draggable
					this.dragStart = this.horizontal ? mx : my;
					return true; // capture mouse
				}
				// TODO: handle click
			},
			mouseUp: function(mx, my, cap, over){
				this.calcMouseState(mx, my);
				this.invalidate();
			},
			mouseMove: function(mx, my, cap, over){
				if (cap){
					var r = this.regions();
					var md = this.horizontal ? mx : my;
					var vd = r.valuePerPix * (md - this.dragStart);
					switch (this.state.over){
						case 'edge1':
							var ov = this.value;
							var os = this.size;
							var ns = os - vd;
							var nv = ov + vd;
							if (nv < this.range[0]){
								ns += nv - this.range[0];
								nv = this.range[0];
							}
							if (ns <= 0){
								nv += ns - os;
								ns = os;
							}
							else if (ns >
								this.range[1] - this.range[0]){
								ns = this.range[1] - this.range[0];
							}
							nv = Math.min(Math.max(this.range[0], nv),
								this.range[1] - ns);
							var u = this.beforeUpdate(nv, ns);
							if (typeof u === 'undefined')
								u = { value: nv, size: ns };
							if (u.size <= 0){
								u.value += u.size - os;
								u.size = os;
							}
							else if (u.size > this.range[1] -
									this.range[0]){
								u.size = this.range[1] - this.range[0];
							}
							u.value = Math.min(
								Math.max(this.range[0], u.value),
								this.range[1] - u.size);
							if (u !== false && (u.value !== ov || u.size !== os)){
								this.dragStart += (u.value - ov) / r.valuePerPix;
								this.set(u.value, u.size);
							}
							break;
						case 'thumb':
							var ov = this.value;
							var os = this.size;
							var nv = Math.min(
								Math.max(this.range[0], ov + vd),
								this.range[1] - this.size);
							var u = this.beforeUpdate(nv, this.size);
							if (typeof u === 'undefined')
								u = { value: nv, size: this.size };
							if (u.size <= 0)
								u.size = os;
							else if (u.size > this.range[1] -
									this.range[0]){
								u.size = this.range[1] - this.range[0];
							}
							u.value = Math.min(
								Math.max(this.range[0], u.value),
								this.range[1] - u.size);
							if (u !== false && (u.value !== ov || u.size !== os)){
								this.dragStart += (u.value - ov) / r.valuePerPix;
								this.set(u.value, u.size);
							}
							break;
						case 'edge2':
							var ov = this.value;
							var os = this.size;
							var ns = os + vd;
							if (ns <= 0)
								ns = os;
							else if (this.value + ns > this.range[1])
								ns = this.range[1] - this.value;
							var u = this.beforeUpdate(this.value, ns);
							if (typeof u === 'undefined')
								u = { value: nv, size: ns };
							if (u.size <= 0)
								u.size = os;
							else if (u.size > this.range[1] -
									this.range[0]){
								u.size = this.range[1] - this.range[0];
							}
							u.value = Math.min(
								Math.max(this.range[0], u.value),
								this.range[1] - u.size);
							if (u !== false && (u.value !== ov || u.size !== os)){
								this.dragStart += (u.size - os) / r.valuePerPix;
								this.set(u.value, u.size);
							}
							break;
					}
				}
				else{
					this.calcMouseState(mx, my);
					this.invalidate();
				}
			},
			redraw: function(style, ctx){
				var r = this.regions();
				var th = this;
				function getst(cat, over){
					return style(th.skin, cat,
						!th.enabled ? 'disabled' :
						th.state.over === over ?
							(th.state.active ? 'active' : 'hover') : 'normal');
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
		}, ext));
		comp.set(comp.value, comp.size, true);
		return comp;
	}
};
