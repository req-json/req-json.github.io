var app = (function (Fa) {
	'use strict';

	Fa = Fa && Fa.hasOwnProperty('default') ? Fa['default'] : Fa;

	function noop() {}

	function assign(tar, src) {
		for (var k in src) { tar[k] = src[k]; }
		return tar;
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	function run_all(fns) {
		fns.forEach(run);
	}

	function is_function(thing) {
		return typeof thing === 'function';
	}

	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
	}

	function append(target, node) {
		target.appendChild(node);
	}

	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	function detach(node) {
		node.parentNode.removeChild(node);
	}

	function destroy_each(iterations, detaching) {
		for (var i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) { iterations[i].d(detaching); }
		}
	}

	function element(name) {
		return document.createElement(name);
	}

	function text(data) {
		return document.createTextNode(data);
	}

	function space() {
		return text(' ');
	}

	function empty() {
		return text('');
	}

	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return function () { return node.removeEventListener(event, handler, options); };
	}

	function children(element) {
		return Array.from(element.childNodes);
	}

	function set_data(text, data) {
		data = '' + data;
		if (text.data !== data) { text.data = data; }
	}

	function toggle_class(element, name, toggle) {
		element.classList[toggle ? 'add' : 'remove'](name);
	}

	var current_component;

	function set_current_component(component) {
		current_component = component;
	}

	function get_current_component() {
		if (!current_component) { throw new Error("Function called outside component initialization"); }
		return current_component;
	}

	function onMount(fn) {
		get_current_component().$$.on_mount.push(fn);
	}

	function onDestroy(fn) {
		get_current_component().$$.on_destroy.push(fn);
	}

	var dirty_components = [];

	var resolved_promise = Promise.resolve();
	var update_scheduled = false;
	var binding_callbacks = [];
	var render_callbacks = [];
	var flush_callbacks = [];

	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	function tick() {
		schedule_update();
		return resolved_promise;
	}

	function add_binding_callback(fn) {
		binding_callbacks.push(fn);
	}

	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	function add_flush_callback(fn) {
		flush_callbacks.push(fn);
	}

	function flush() {
		var seen_callbacks = new Set();

		do {
			// first, call beforeUpdate functions
			// and update components
			while (dirty_components.length) {
				var component = dirty_components.shift();
				set_current_component(component);
				update(component.$$);
			}

			while (binding_callbacks.length) { binding_callbacks.shift()(); }

			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			while (render_callbacks.length) {
				var callback = render_callbacks.pop();
				if (!seen_callbacks.has(callback)) {
					callback();

					// ...so guard against infinite loops
					seen_callbacks.add(callback);
				}
			}
		} while (dirty_components.length);

		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}

		update_scheduled = false;
	}

	function update($$) {
		if ($$.fragment) {
			$$.update($$.dirty);
			run_all($$.before_render);
			$$.fragment.p($$.dirty, $$.ctx);
			$$.dirty = null;

			$$.after_render.forEach(add_render_callback);
		}
	}

	var outros;

	function group_outros() {
		outros = {
			remaining: 0,
			callbacks: []
		};
	}

	function check_outros() {
		if (!outros.remaining) {
			run_all(outros.callbacks);
		}
	}

	function on_outro(callback) {
		outros.callbacks.push(callback);
	}

	function destroy_block(block, lookup) {
		block.d(1);
		lookup.delete(block.key);
	}

	function outro_and_destroy_block(block, lookup) {
		on_outro(function () {
			destroy_block(block, lookup);
		});

		block.o(1);
	}

	function update_keyed_each(old_blocks, changed, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
		var o = old_blocks.length;
		var n = list.length;

		var i = o;
		var old_indexes = {};
		while (i--) { old_indexes[old_blocks[i].key] = i; }

		var new_blocks = [];
		var new_lookup = new Map();
		var deltas = new Map();

		i = n;
		while (i--) {
			var child_ctx = get_context(ctx, list, i);
			var key = get_key(child_ctx);
			var block = lookup.get(key);

			if (!block) {
				block = create_each_block(key, child_ctx);
				block.c();
			} else if (dynamic) {
				block.p(changed, child_ctx);
			}

			new_lookup.set(key, new_blocks[i] = block);

			if (key in old_indexes) { deltas.set(key, Math.abs(i - old_indexes[key])); }
		}

		var will_move = new Set();
		var did_move = new Set();

		function insert(block) {
			if (block.i) { block.i(1); }
			block.m(node, next);
			lookup.set(block.key, block);
			next = block.first;
			n--;
		}

		while (o && n) {
			var new_block = new_blocks[n - 1];
			var old_block = old_blocks[o - 1];
			var new_key = new_block.key;
			var old_key = old_block.key;

			if (new_block === old_block) {
				// do nothing
				next = new_block.first;
				o--;
				n--;
			}

			else if (!new_lookup.has(old_key)) {
				// remove old block
				destroy(old_block, lookup);
				o--;
			}

			else if (!lookup.has(new_key) || will_move.has(new_key)) {
				insert(new_block);
			}

			else if (did_move.has(old_key)) {
				o--;

			} else if (deltas.get(new_key) > deltas.get(old_key)) {
				did_move.add(new_key);
				insert(new_block);

			} else {
				will_move.add(old_key);
				o--;
			}
		}

		while (o--) {
			var old_block$1 = old_blocks[o];
			if (!new_lookup.has(old_block$1.key)) { destroy(old_block$1, lookup); }
		}

		while (n) { insert(new_blocks[n - 1]); }

		return new_blocks;
	}

	function get_spread_update(levels, updates) {
		var update = {};

		var to_null_out = {};
		var accounted_for = { $$scope: 1 };

		var i = levels.length;
		while (i--) {
			var o = levels[i];
			var n = updates[i];

			if (n) {
				for (var key in o) {
					if (!(key in n)) { to_null_out[key] = 1; }
				}

				for (var key$1 in n) {
					if (!accounted_for[key$1]) {
						update[key$1] = n[key$1];
						accounted_for[key$1] = 1;
					}
				}

				levels[i] = n;
			} else {
				for (var key$2 in o) {
					accounted_for[key$2] = 1;
				}
			}
		}

		for (var key$3 in to_null_out) {
			if (!(key$3 in update)) { update[key$3] = undefined; }
		}

		return update;
	}

	function bind(component, name, callback) {
		if (component.$$.props.indexOf(name) === -1) { return; }
		component.$$.bound[name] = callback;
		callback(component.$$.ctx[name]);
	}

	function mount_component(component, target, anchor) {
		var ref = component.$$;
		var fragment = ref.fragment;
		var on_mount = ref.on_mount;
		var on_destroy = ref.on_destroy;
		var after_render = ref.after_render;

		fragment.m(target, anchor);

		// onMount happens after the initial afterUpdate. Because
		// afterUpdate callbacks happen in reverse order (inner first)
		// we schedule onMount callbacks before afterUpdate callbacks
		add_render_callback(function () {
			var new_on_destroy = on_mount.map(run).filter(is_function);
			if (on_destroy) {
				on_destroy.push.apply(on_destroy, new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});

		after_render.forEach(add_render_callback);
	}

	function destroy(component, detaching) {
		if (component.$$) {
			run_all(component.$$.on_destroy);
			component.$$.fragment.d(detaching);

			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			component.$$.on_destroy = component.$$.fragment = null;
			component.$$.ctx = {};
		}
	}

	function make_dirty(component, key) {
		if (!component.$$.dirty) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty = blank_object();
		}
		component.$$.dirty[key] = true;
	}

	function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
		var parent_component = current_component;
		set_current_component(component);

		var props = options.props || {};

		var $$ = component.$$ = {
			fragment: null,
			ctx: null,

			// state
			props: prop_names,
			update: noop,
			not_equal: not_equal$$1,
			bound: blank_object(),

			// lifecycle
			on_mount: [],
			on_destroy: [],
			before_render: [],
			after_render: [],
			context: new Map(parent_component ? parent_component.$$.context : []),

			// everything else
			callbacks: blank_object(),
			dirty: null
		};

		var ready = false;

		$$.ctx = instance
			? instance(component, props, function (key, value) {
				if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
					if ($$.bound[key]) { $$.bound[key](value); }
					if (ready) { make_dirty(component, key); }
				}
			})
			: props;

		$$.update();
		ready = true;
		run_all($$.before_render);
		$$.fragment = create_fragment($$.ctx);

		if (options.target) {
			if (options.hydrate) {
				$$.fragment.l(children(options.target));
			} else {
				$$.fragment.c();
			}

			if (options.intro && component.$$.fragment.i) { component.$$.fragment.i(); }
			mount_component(component, options.target, options.anchor);
			flush();
		}

		set_current_component(parent_component);
	}

	var SvelteComponent = function SvelteComponent () {};

	SvelteComponent.prototype.$destroy = function $destroy () {
		destroy(this, true);
		this.$destroy = noop;
	};

	SvelteComponent.prototype.$on = function $on (type, callback) {
		var callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
		callbacks.push(callback);

		return function () {
			var index = callbacks.indexOf(callback);
			if (index !== -1) { callbacks.splice(index, 1); }
		};
	};

	SvelteComponent.prototype.$set = function $set () {
		// overridden by instance, if it has props
	};

	var faChevronCircleRight = {
	  prefix: 'fas',
	  iconName: 'chevron-circle-right',
	  icon: [512, 512, [], "f138", "M256 8c137 0 248 111 248 248S393 504 256 504 8 393 8 256 119 8 256 8zm113.9 231L234.4 103.5c-9.4-9.4-24.6-9.4-33.9 0l-17 17c-9.4 9.4-9.4 24.6 0 33.9L285.1 256 183.5 357.6c-9.4 9.4-9.4 24.6 0 33.9l17 17c9.4 9.4 24.6 9.4 33.9 0L369.9 273c9.4-9.4 9.4-24.6 0-34z"]
	};
	var faExclamationCircle = {
	  prefix: 'fas',
	  iconName: 'exclamation-circle',
	  icon: [512, 512, [], "f06a", "M504 256c0 136.997-111.043 248-248 248S8 392.997 8 256C8 119.083 119.043 8 256 8s248 111.083 248 248zm-248 50c-25.405 0-46 20.595-46 46s20.595 46 46 46 46-20.595 46-46-20.595-46-46-46zm-43.673-165.346l7.418 136c.347 6.364 5.609 11.346 11.982 11.346h48.546c6.373 0 11.635-4.982 11.982-11.346l7.418-136c.375-6.874-5.098-12.654-11.982-12.654h-63.383c-6.884 0-12.356 5.78-11.981 12.654z"]
	};
	var faInfoCircle = {
	  prefix: 'fas',
	  iconName: 'info-circle',
	  icon: [512, 512, [], "f05a", "M256 8C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm0 110c23.196 0 42 18.804 42 42s-18.804 42-42 42-42-18.804-42-42 18.804-42 42-42zm56 254c0 6.627-5.373 12-12 12h-88c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h12v-64h-12c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h64c6.627 0 12 5.373 12 12v100h12c6.627 0 12 5.373 12 12v24z"]
	};
	var faLink = {
	  prefix: 'fas',
	  iconName: 'link',
	  icon: [512, 512, [], "f0c1", "M326.612 185.391c59.747 59.809 58.927 155.698.36 214.59-.11.12-.24.25-.36.37l-67.2 67.2c-59.27 59.27-155.699 59.262-214.96 0-59.27-59.26-59.27-155.7 0-214.96l37.106-37.106c9.84-9.84 26.786-3.3 27.294 10.606.648 17.722 3.826 35.527 9.69 52.721 1.986 5.822.567 12.262-3.783 16.612l-13.087 13.087c-28.026 28.026-28.905 73.66-1.155 101.96 28.024 28.579 74.086 28.749 102.325.51l67.2-67.19c28.191-28.191 28.073-73.757 0-101.83-3.701-3.694-7.429-6.564-10.341-8.569a16.037 16.037 0 0 1-6.947-12.606c-.396-10.567 3.348-21.456 11.698-29.806l21.054-21.055c5.521-5.521 14.182-6.199 20.584-1.731a152.482 152.482 0 0 1 20.522 17.197zM467.547 44.449c-59.261-59.262-155.69-59.27-214.96 0l-67.2 67.2c-.12.12-.25.25-.36.37-58.566 58.892-59.387 154.781.36 214.59a152.454 152.454 0 0 0 20.521 17.196c6.402 4.468 15.064 3.789 20.584-1.731l21.054-21.055c8.35-8.35 12.094-19.239 11.698-29.806a16.037 16.037 0 0 0-6.947-12.606c-2.912-2.005-6.64-4.875-10.341-8.569-28.073-28.073-28.191-73.639 0-101.83l67.2-67.19c28.239-28.239 74.3-28.069 102.325.51 27.75 28.3 26.872 73.934-1.155 101.96l-13.087 13.087c-4.35 4.35-5.769 10.79-3.783 16.612 5.864 17.194 9.042 34.999 9.69 52.721.509 13.906 17.454 20.446 27.294 10.606l37.106-37.106c59.271-59.259 59.271-155.699.001-214.959z"]
	};
	var faTimesCircle = {
	  prefix: 'fas',
	  iconName: 'times-circle',
	  icon: [512, 512, [], "f057", "M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm121.6 313.1c4.7 4.7 4.7 12.3 0 17L338 377.6c-4.7 4.7-12.3 4.7-17 0L256 312l-65.1 65.6c-4.7 4.7-12.3 4.7-17 0L134.4 338c-4.7-4.7-4.7-12.3 0-17l65.6-65-65.6-65.1c-4.7-4.7-4.7-12.3 0-17l39.6-39.6c4.7-4.7 12.3-4.7 17 0l65 65.7 65.1-65.6c4.7-4.7 12.3-4.7 17 0l39.6 39.6c4.7 4.7 4.7 12.3 0 17L312 256l65.6 65.1z"]
	};

	/* src\components\codemirror.svelte generated by Svelte v3.4.2 */

	function create_fragment(ctx) {
		var div;

		return {
			c: function c() {
				div = element("div");
				div.className = "codemirror rounded overflow-hidden";
			},

			m: function m(target, anchor) {
				insert(target, div, anchor);
				add_binding_callback(function () { return ctx.div_binding(div, null); });
			},

			p: function p(changed, ctx) {
				if (changed.items) {
					ctx.div_binding(null, div);
					ctx.div_binding(div, null);
				}
			},

			i: noop,
			o: noop,

			d: function d(detaching) {
				if (detaching) {
					detach(div);
				}

				ctx.div_binding(null, div);
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		var value = $$props.value;
		var height = $$props.height;
		var readOnly = $$props.readOnly; if ( readOnly === void 0 ) readOnly = false;

	var container;

	var cm;
	onMount(function () {
	  $$invalidate('cm', cm = CodeMirror(container, {
	    value: value,
	    mode: 'javascript',
	    theme: 'monokai',
	    lineNumbers: true,
	    readOnly: readOnly && 'nocursor',
	  }));
	  cm.on('blur', function () {
	    $$invalidate('value', value = cm.getValue());
	  });
	});

	onDestroy(function () {
	  cm.toTextArea();
	});

		function div_binding($$node, check) {
			container = $$node;
			$$invalidate('container', container);
		}

		$$self.$set = function ($$props) {
			if ('value' in $$props) { $$invalidate('value', value = $$props.value); }
			if ('height' in $$props) { $$invalidate('height', height = $$props.height); }
			if ('readOnly' in $$props) { $$invalidate('readOnly', readOnly = $$props.readOnly); }
		};

		$$self.$$.update = function ($$dirty) {
			if ( $$dirty === void 0 ) $$dirty = { cm: 1, height: 1 };

			if ($$dirty.cm || $$dirty.height) { if (cm && height) {
	      cm.setSize('100%', height);
	    } }
		};

		return {
			value: value,
			height: height,
			readOnly: readOnly,
			container: container,
			div_binding: div_binding
		};
	}

	var Codemirror = /*@__PURE__*/(function (SvelteComponent) {
		function Codemirror(options) {
			SvelteComponent.call(this);
			init(this, options, instance, create_fragment, safe_not_equal, ["value", "height", "readOnly"]);
		}

		if ( SvelteComponent ) Codemirror.__proto__ = SvelteComponent;
		Codemirror.prototype = Object.create( SvelteComponent && SvelteComponent.prototype );
		Codemirror.prototype.constructor = Codemirror;

		return Codemirror;
	}(SvelteComponent));

	/*!
	 * time-stamp <https://github.com/jonschlinkert/time-stamp>
	 *
	 * Copyright (c) 2015-2018, Jon Schlinkert.
	 * Released under the MIT License.
	 */

	var dateRegex = /(?=(YYYY|YY|MM|DD|HH|mm|ss|ms))\1([:\/]*)/g;
	var timespan = {
	  YYYY: ['getFullYear', 4],
	  YY: ['getFullYear', 2],
	  MM: ['getMonth', 2, 1], // getMonth is zero-based, thus the extra increment field
	  DD: ['getDate', 2],
	  HH: ['getHours', 2],
	  mm: ['getMinutes', 2],
	  ss: ['getSeconds', 2],
	  ms: ['getMilliseconds', 3]
	};

	var timestamp = function(str, date, utc) {
	  if (typeof str !== 'string') {
	    date = str;
	    str = 'YYYY-MM-DD';
	  }

	  if (!date) { date = new Date(); }
	  return str.replace(dateRegex, function(match, key, rest) {
	    var args = timespan[key];
	    var name = args[0];
	    var chars = args[1];
	    if (utc === true) { name = 'getUTC' + name.slice(3); }
	    var val = '00' + String(date[name]() + (args[2] || 0));
	    return val.slice(-chars) + (rest || '');
	  });
	};

	timestamp.utc = function(str, date) {
	  return timestamp(str, date, true);
	};

	var timeStamp = timestamp;

	/* src\components\console.svelte generated by Svelte v3.4.2 */

	function get_each_context(ctx, list, i) {
		var child_ctx = Object.create(ctx);
		child_ctx.log = list[i];
		child_ctx.i = i;
		return child_ctx;
	}

	// (77:6) {:else}
	function create_else_block(ctx) {
		var pre, t_value = ctx.log.str, t;

		return {
			c: function c() {
				pre = element("pre");
				t = text(t_value);
			},

			m: function m(target, anchor) {
				insert(target, pre, anchor);
				append(pre, t);
			},

			p: function p(changed, ctx) {
				if ((changed.logs) && t_value !== (t_value = ctx.log.str)) {
					set_data(t, t_value);
				}
			},

			d: function d(detaching) {
				if (detaching) {
					detach(pre);
				}
			}
		};
	}

	// (75:6) {#if log.collapse}
	function create_if_block(ctx) {
		var t_value = ctx.log.str, t;

		return {
			c: function c() {
				t = text(t_value);
			},

			m: function m(target, anchor) {
				insert(target, t, anchor);
			},

			p: function p(changed, ctx) {
				if ((changed.logs) && t_value !== (t_value = ctx.log.str)) {
					set_data(t, t_value);
				}
			},

			d: function d(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (66:2) {#each logs as log, i (log.t)}
	function create_each_block(key_1, ctx) {
		var li_1, small, t0, t1_value = ctx.log.t, t1, t2, t3, i = ctx.i, li_1_class_value, current, dispose;

		var fa = new Fa({
			props: {
			icon: ctx.icons[ctx.log.level],
			rotate: ctx.log.collapse ? 0 : 90
		}
		});

		function select_block_type(ctx) {
			if (ctx.log.collapse) { return create_if_block; }
			return create_else_block;
		}

		var current_block_type = select_block_type(ctx);
		var if_block = current_block_type(ctx);

		function click_handler() {
			return ctx.click_handler(ctx);
		}

		return {
			key: key_1,

			first: null,

			c: function c() {
				li_1 = element("li");
				small = element("small");
				fa.$$.fragment.c();
				t0 = space();
				t1 = text(t1_value);
				t2 = space();
				if_block.c();
				t3 = space();
				li_1.className = li_1_class_value = "" + (("list-group-item p-1 text-" + (ctx.colors[ctx.log.level]))) + " svelte-f1vacx";
				dispose = listen(li_1, "click", click_handler);
				this.first = li_1;
			},

			m: function m(target, anchor) {
				insert(target, li_1, anchor);
				append(li_1, small);
				mount_component(fa, small, null);
				append(li_1, t0);
				append(li_1, t1);
				append(li_1, t2);
				if_block.m(li_1, null);
				append(li_1, t3);
				add_binding_callback(function () { return ctx.li_1_binding(li_1, null, i); });
				current = true;
			},

			p: function p(changed, new_ctx) {
				ctx = new_ctx;
				var fa_changes = {};
				if (changed.icons || changed.logs) { fa_changes.icon = ctx.icons[ctx.log.level]; }
				if (changed.logs) { fa_changes.rotate = ctx.log.collapse ? 0 : 90; }
				fa.$set(fa_changes);

				if ((!current || changed.logs) && t1_value !== (t1_value = ctx.log.t)) {
					set_data(t1, t1_value);
				}

				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
					if_block.p(changed, ctx);
				} else {
					if_block.d(1);
					if_block = current_block_type(ctx);
					if (if_block) {
						if_block.c();
						if_block.m(li_1, t3);
					}
				}

				if (changed.items) {
					ctx.li_1_binding(null, li_1, i);
					i = ctx.i;
					ctx.li_1_binding(li_1, null, i);
				}

				if ((!current || changed.logs) && li_1_class_value !== (li_1_class_value = "" + (("list-group-item p-1 text-" + (ctx.colors[ctx.log.level]))) + " svelte-f1vacx")) {
					li_1.className = li_1_class_value;
				}
			},

			i: function i(local) {
				if (current) { return; }
				fa.$$.fragment.i(local);

				current = true;
			},

			o: function o(local) {
				fa.$$.fragment.o(local);
				current = false;
			},

			d: function d(detaching) {
				if (detaching) {
					detach(li_1);
				}

				fa.$destroy();

				if_block.d();
				ctx.li_1_binding(null, li_1, i);
				dispose();
			}
		};
	}

	function create_fragment$1(ctx) {
		var ul_1, each_blocks = [], each_1_lookup = new Map(), current;

		var each_value = ctx.logs;

		var get_key = function (ctx) { return ctx.log.t; };

		for (var i = 0; i < each_value.length; i += 1) {
			var child_ctx = get_each_context(ctx, each_value, i);
			var key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
		}

		return {
			c: function c() {
				ul_1 = element("ul");

				for (i = 0; i < each_blocks.length; i += 1) { each_blocks[i].c(); }
				ul_1.className = "list-group list-group-flush overflow-auto svelte-f1vacx";
			},

			m: function m(target, anchor) {
				insert(target, ul_1, anchor);

				for (i = 0; i < each_blocks.length; i += 1) { each_blocks[i].m(ul_1, null); }

				add_binding_callback(function () { return ctx.ul_1_binding(ul_1, null); });
				current = true;
			},

			p: function p(changed, ctx) {
				var each_value = ctx.logs;

				group_outros();
				each_blocks = update_keyed_each(each_blocks, changed, get_key, 1, ctx, each_value, each_1_lookup, ul_1, outro_and_destroy_block, create_each_block, null, get_each_context);
				check_outros();

				if (changed.items) {
					ctx.ul_1_binding(null, ul_1);
					ctx.ul_1_binding(ul_1, null);
				}
			},

			i: function i(local) {
				if (current) { return; }
				for (var i = 0; i < each_value.length; i += 1) { each_blocks[i].i(); }

				current = true;
			},

			o: function o(local) {
				for (i = 0; i < each_blocks.length; i += 1) { each_blocks[i].o(); }

				current = false;
			},

			d: function d(detaching) {
				if (detaching) {
					detach(ul_1);
				}

				for (i = 0; i < each_blocks.length; i += 1) { each_blocks[i].d(); }

				ctx.ul_1_binding(null, ul_1);
			}
		};
	}

	function instance$1($$self, $$props, $$invalidate) {
		

	var clear = $$props.clear;
	var log = $$props.log;

	var colors = {
	  log: 'secondary',
	  info: 'info',
	  warn: 'warning',
	  error: 'danger',
	};
	var icons = {
	  log: faChevronCircleRight,
	  info: faInfoCircle,
	  warn: faExclamationCircle,
	  error: faTimesCircle,
	};

	var scroll;
	var ul;
	var li = [];
	var logs = [];

	function scrollToLog(i) {
	  tick().then(function () {
	    scroll.intoView(li[i]);
	  });
	}

	onMount(function () {
	  $$invalidate('scroll', scroll = zenscroll.createScroller(ul));
	});

		function li_1_binding($$node, check, i) {
			if ($$node || (!$$node && li[i] === check)) { li[i] = $$node; }
			$$invalidate('li', li);
		}

		function click_handler(ref) {
			var i = ref.i;
			var log = ref.log;

			var $$result = scrollToLog(i, log.collapse = !log.collapse);
			$$invalidate('logs', logs), $$invalidate('log', log), $$invalidate('clear', clear);
			return $$result;
		}

		function ul_1_binding($$node, check) {
			ul = $$node;
			$$invalidate('ul', ul);
		}

		$$self.$set = function ($$props) {
			if ('clear' in $$props) { $$invalidate('clear', clear = $$props.clear); }
			if ('log' in $$props) { $$invalidate('log', log = $$props.log); }
		};

		$$self.$$.update = function ($$dirty) {
			if ( $$dirty === void 0 ) $$dirty = { log: 1, logs: 1, clear: 1 };

			if ($$dirty.log || $$dirty.logs) { if (log) {
	      $$invalidate('logs', logs = logs.concat({
	        t: timeStamp('HH:mm:ss.ms'),
	        level: log.level,
	        str: log.args.map(function (l) { return (typeof l === 'string' ? l : JSON.stringify(l, null, 2)); }).join(' '),
	        collapse: true,
	      }));
	      $$invalidate('log', log = undefined);
	      scrollToLog(logs.length - 1);
	    } }
			if ($$dirty.clear) { if (clear) {
	      $$invalidate('logs', logs = []);
	    } }
		};

		return {
			clear: clear,
			log: log,
			colors: colors,
			icons: icons,
			ul: ul,
			li: li,
			logs: logs,
			scrollToLog: scrollToLog,
			li_1_binding: li_1_binding,
			click_handler: click_handler,
			ul_1_binding: ul_1_binding
		};
	}

	var Console = /*@__PURE__*/(function (SvelteComponent) {
		function Console(options) {
			SvelteComponent.call(this);
			init(this, options, instance$1, create_fragment$1, safe_not_equal, ["clear", "log"]);
		}

		if ( SvelteComponent ) Console.__proto__ = SvelteComponent;
		Console.prototype = Object.create( SvelteComponent && SvelteComponent.prototype );
		Console.prototype.constructor = Console;

		return Console;
	}(SvelteComponent));

	/* global loadScripts Babel */

	var transfrom = function (c) { return c; };

	function run$1(code, console) {
	  try {
	    (new Function(
	      'console',
	      transfrom(code)
	    ))(console);
	  } catch (e) {
	    if (typeof Babel === 'undefined') {
	      loadScripts('https://cdn.jsdelivr.net/gh/req-json/req-json.github.io@v0.0.1/public/babel.js')
	        .then(function () {
	          transfrom = function (c) { return Babel.transform(
	            c,
	            { presets: ['es2015', 'es2016', 'es2017'] }
	          ).code; };
	          run$1(code, console);
	        });
	    } else {
	      console.error(((e.name) + ": " + (e.message)));
	    }
	  }
	}

	/* src\components\section.svelte generated by Svelte v3.4.2 */

	// (37:0) {#if title}
	function create_if_block_5(ctx) {
		var h3, t0, t1, a, a_href_value, h3_id_value, current;

		var fa = new Fa({
			props: {
			icon: faLink,
			class: "link",
			size: "xs"
		}
		});

		return {
			c: function c() {
				h3 = element("h3");
				t0 = text(ctx.title);
				t1 = space();
				a = element("a");
				fa.$$.fragment.c();
				a.href = a_href_value = "#" + (ctx.title.toLowerCase().replace(/ /g, '-'));
				h3.id = h3_id_value = ctx.title.toLowerCase().replace(/ /g, '-');
				h3.className = "p-1 pt-3 svelte-7p0rve";
			},

			m: function m(target, anchor) {
				insert(target, h3, anchor);
				append(h3, t0);
				append(h3, t1);
				append(h3, a);
				mount_component(fa, a, null);
				current = true;
			},

			p: function p(changed, ctx) {
				if (!current || changed.title) {
					set_data(t0, ctx.title);
				}

				var fa_changes = {};
				if (changed.faLink) { fa_changes.icon = faLink; }
				fa.$set(fa_changes);

				if ((!current || changed.title) && a_href_value !== (a_href_value = "#" + (ctx.title.toLowerCase().replace(/ /g, '-')))) {
					a.href = a_href_value;
				}

				if ((!current || changed.title) && h3_id_value !== (h3_id_value = ctx.title.toLowerCase().replace(/ /g, '-'))) {
					h3.id = h3_id_value;
				}
			},

			i: function i(local) {
				if (current) { return; }
				fa.$$.fragment.i(local);

				current = true;
			},

			o: function o(local) {
				fa.$$.fragment.o(local);
				current = false;
			},

			d: function d(detaching) {
				if (detaching) {
					detach(h3);
				}

				fa.$destroy();
			}
		};
	}

	// (43:0) {#if description}
	function create_if_block_4(ctx) {
		var div;

		return {
			c: function c() {
				div = element("div");
				div.className = "px-1 py-2 rounded";
			},

			m: function m(target, anchor) {
				insert(target, div, anchor);
				div.innerHTML = ctx.description;
			},

			p: function p(changed, ctx) {
				if (changed.description) {
					div.innerHTML = ctx.description;
				}
			},

			d: function d(detaching) {
				if (detaching) {
					detach(div);
				}
			}
		};
	}

	// (46:0) {#if code}
	function create_if_block_1(ctx) {
		var div1, div0, t0, updating_value, t1, current;

		var if_block0 = (ctx.mock) && create_if_block_3(ctx);

		function codemirror_value_binding(value) {
			ctx.codemirror_value_binding.call(null, value);
			updating_value = true;
			add_flush_callback(function () { return updating_value = false; });
		}

		var codemirror_props = {
			height: ctx.height,
			readOnly: !ctx.mock
		};
		if (ctx.code !== void 0) {
			codemirror_props.value = ctx.code;
		}
		var codemirror = new Codemirror({ props: codemirror_props });

		add_binding_callback(function () { return bind(codemirror, 'value', codemirror_value_binding); });

		var if_block1 = (ctx.mock) && create_if_block_2(ctx);

		return {
			c: function c() {
				div1 = element("div");
				div0 = element("div");
				if (if_block0) { if_block0.c(); }
				t0 = space();
				codemirror.$$.fragment.c();
				t1 = space();
				if (if_block1) { if_block1.c(); }
				div0.className = "col-sm-6 px-1";
				toggle_class(div0, "col-sm-12", !ctx.mock);
				div1.className = "row mx-0 mb-2";
			},

			m: function m(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);
				if (if_block0) { if_block0.m(div0, null); }
				append(div0, t0);
				mount_component(codemirror, div0, null);
				append(div1, t1);
				if (if_block1) { if_block1.m(div1, null); }
				current = true;
			},

			p: function p(changed, ctx) {
				if (ctx.mock) {
					if (!if_block0) {
						if_block0 = create_if_block_3(ctx);
						if_block0.c();
						if_block0.m(div0, t0);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				var codemirror_changes = {};
				if (changed.height) { codemirror_changes.height = ctx.height; }
				if (changed.mock) { codemirror_changes.readOnly = !ctx.mock; }
				if (!updating_value && changed.code) {
					codemirror_changes.value = ctx.code;
				}
				codemirror.$set(codemirror_changes);

				if (changed.mock) {
					toggle_class(div0, "col-sm-12", !ctx.mock);
				}

				if (ctx.mock) {
					if (if_block1) {
						if_block1.p(changed, ctx);
						if_block1.i(1);
					} else {
						if_block1 = create_if_block_2(ctx);
						if_block1.c();
						if_block1.i(1);
						if_block1.m(div1, null);
					}
				} else if (if_block1) {
					group_outros();
					on_outro(function () {
						if_block1.d(1);
						if_block1 = null;
					});

					if_block1.o(1);
					check_outros();
				}
			},

			i: function i(local) {
				if (current) { return; }
				codemirror.$$.fragment.i(local);

				if (if_block1) { if_block1.i(); }
				current = true;
			},

			o: function o(local) {
				codemirror.$$.fragment.o(local);
				if (if_block1) { if_block1.o(); }
				current = false;
			},

			d: function d(detaching) {
				if (detaching) {
					detach(div1);
				}

				if (if_block0) { if_block0.d(); }

				codemirror.$destroy();

				if (if_block1) { if_block1.d(); }
			}
		};
	}

	// (49:4) {#if mock}
	function create_if_block_3(ctx) {
		var h5;

		return {
			c: function c() {
				h5 = element("h5");
				h5.innerHTML = "<a href=\"https://github.com/cweili/req-json#readme\" target=\"_blank\">ReqJSON</a>";
			},

			m: function m(target, anchor) {
				insert(target, h5, anchor);
			},

			d: function d(detaching) {
				if (detaching) {
					detach(h5);
				}
			}
		};
	}

	// (54:2) {#if mock}
	function create_if_block_2(ctx) {
		var div, h5, t_1, updating_value, current;

		function codemirror_value_binding_1(value) {
			ctx.codemirror_value_binding_1.call(null, value);
			updating_value = true;
			add_flush_callback(function () { return updating_value = false; });
		}

		var codemirror_props = {
			height: ctx.height,
			height: ctx.height,
			readOnly: !ctx.mock
		};
		if (ctx.mock !== void 0) {
			codemirror_props.value = ctx.mock;
		}
		var codemirror = new Codemirror({ props: codemirror_props });

		add_binding_callback(function () { return bind(codemirror, 'value', codemirror_value_binding_1); });

		return {
			c: function c() {
				div = element("div");
				h5 = element("h5");
				h5.innerHTML = "<a href=\"https://github.com/jameslnewell/xhr-mock#readme\" target=\"_blank\">XHRMock</a>";
				t_1 = space();
				codemirror.$$.fragment.c();
				div.className = "col-sm-6 px-1";
			},

			m: function m(target, anchor) {
				insert(target, div, anchor);
				append(div, h5);
				append(div, t_1);
				mount_component(codemirror, div, null);
				current = true;
			},

			p: function p(changed, ctx) {
				var codemirror_changes = {};
				if (changed.height) { codemirror_changes.height = ctx.height; }
				if (changed.height) { codemirror_changes.height = ctx.height; }
				if (changed.mock) { codemirror_changes.readOnly = !ctx.mock; }
				if (!updating_value && changed.mock) {
					codemirror_changes.value = ctx.mock;
				}
				codemirror.$set(codemirror_changes);
			},

			i: function i(local) {
				if (current) { return; }
				codemirror.$$.fragment.i(local);

				current = true;
			},

			o: function o(local) {
				codemirror.$$.fragment.o(local);
				current = false;
			},

			d: function d(detaching) {
				if (detaching) {
					detach(div);
				}

				codemirror.$destroy();
			}
		};
	}

	// (62:0) {#if mock}
	function create_if_block$1(ctx) {
		var div, button0, t1, button1, t2, t3, current, dispose;

		var fa = new Fa({ props: { icon: faChevronCircleRight } });

		var console_1 = new Console({
			props: { log: ctx.log, clear: ctx.clear }
		});

		return {
			c: function c() {
				div = element("div");
				button0 = element("button");
				button0.textContent = "CLEAR";
				t1 = space();
				button1 = element("button");
				t2 = text("RUN CODE ");
				fa.$$.fragment.c();
				t3 = space();
				console_1.$$.fragment.c();
				button0.className = "btn btn-outline-secondary btn-sm";
				button1.className = "btn btn-outline-primary btn-sm";
				div.className = "text-right px-1 py-2";

				dispose = [
					listen(button0, "click", ctx.click_handler),
					listen(button1, "click", ctx.run)
				];
			},

			m: function m(target, anchor) {
				insert(target, div, anchor);
				append(div, button0);
				append(div, t1);
				append(div, button1);
				append(button1, t2);
				mount_component(fa, button1, null);
				insert(target, t3, anchor);
				mount_component(console_1, target, anchor);
				current = true;
			},

			p: function p(changed, ctx) {
				var fa_changes = {};
				if (changed.faChevronCircleRight) { fa_changes.icon = faChevronCircleRight; }
				fa.$set(fa_changes);

				var console_1_changes = {};
				if (changed.log) { console_1_changes.log = ctx.log; }
				if (changed.clear) { console_1_changes.clear = ctx.clear; }
				console_1.$set(console_1_changes);
			},

			i: function i(local) {
				if (current) { return; }
				fa.$$.fragment.i(local);

				console_1.$$.fragment.i(local);

				current = true;
			},

			o: function o(local) {
				fa.$$.fragment.o(local);
				console_1.$$.fragment.o(local);
				current = false;
			},

			d: function d(detaching) {
				if (detaching) {
					detach(div);
				}

				fa.$destroy();

				if (detaching) {
					detach(t3);
				}

				console_1.$destroy(detaching);

				run_all(dispose);
			}
		};
	}

	function create_fragment$2(ctx) {
		var t0, t1, t2, if_block3_anchor, current;

		var if_block0 = (ctx.title) && create_if_block_5(ctx);

		var if_block1 = (ctx.description) && create_if_block_4(ctx);

		var if_block2 = (ctx.code) && create_if_block_1(ctx);

		var if_block3 = (ctx.mock) && create_if_block$1(ctx);

		return {
			c: function c() {
				if (if_block0) { if_block0.c(); }
				t0 = space();
				if (if_block1) { if_block1.c(); }
				t1 = space();
				if (if_block2) { if_block2.c(); }
				t2 = space();
				if (if_block3) { if_block3.c(); }
				if_block3_anchor = empty();
			},

			m: function m(target, anchor) {
				if (if_block0) { if_block0.m(target, anchor); }
				insert(target, t0, anchor);
				if (if_block1) { if_block1.m(target, anchor); }
				insert(target, t1, anchor);
				if (if_block2) { if_block2.m(target, anchor); }
				insert(target, t2, anchor);
				if (if_block3) { if_block3.m(target, anchor); }
				insert(target, if_block3_anchor, anchor);
				current = true;
			},

			p: function p(changed, ctx) {
				if (ctx.title) {
					if (if_block0) {
						if_block0.p(changed, ctx);
						if_block0.i(1);
					} else {
						if_block0 = create_if_block_5(ctx);
						if_block0.c();
						if_block0.i(1);
						if_block0.m(t0.parentNode, t0);
					}
				} else if (if_block0) {
					group_outros();
					on_outro(function () {
						if_block0.d(1);
						if_block0 = null;
					});

					if_block0.o(1);
					check_outros();
				}

				if (ctx.description) {
					if (if_block1) {
						if_block1.p(changed, ctx);
					} else {
						if_block1 = create_if_block_4(ctx);
						if_block1.c();
						if_block1.m(t1.parentNode, t1);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}

				if (ctx.code) {
					if (if_block2) {
						if_block2.p(changed, ctx);
						if_block2.i(1);
					} else {
						if_block2 = create_if_block_1(ctx);
						if_block2.c();
						if_block2.i(1);
						if_block2.m(t2.parentNode, t2);
					}
				} else if (if_block2) {
					group_outros();
					on_outro(function () {
						if_block2.d(1);
						if_block2 = null;
					});

					if_block2.o(1);
					check_outros();
				}

				if (ctx.mock) {
					if (if_block3) {
						if_block3.p(changed, ctx);
						if_block3.i(1);
					} else {
						if_block3 = create_if_block$1(ctx);
						if_block3.c();
						if_block3.i(1);
						if_block3.m(if_block3_anchor.parentNode, if_block3_anchor);
					}
				} else if (if_block3) {
					group_outros();
					on_outro(function () {
						if_block3.d(1);
						if_block3 = null;
					});

					if_block3.o(1);
					check_outros();
				}
			},

			i: function i(local) {
				if (current) { return; }
				if (if_block0) { if_block0.i(); }
				if (if_block2) { if_block2.i(); }
				if (if_block3) { if_block3.i(); }
				current = true;
			},

			o: function o(local) {
				if (if_block0) { if_block0.o(); }
				if (if_block2) { if_block2.o(); }
				if (if_block3) { if_block3.o(); }
				current = false;
			},

			d: function d(detaching) {
				if (if_block0) { if_block0.d(detaching); }

				if (detaching) {
					detach(t0);
				}

				if (if_block1) { if_block1.d(detaching); }

				if (detaching) {
					detach(t1);
				}

				if (if_block2) { if_block2.d(detaching); }

				if (detaching) {
					detach(t2);
				}

				if (if_block3) { if_block3.d(detaching); }

				if (detaching) {
					detach(if_block3_anchor);
				}
			}
		};
	}

	var LF = '\n\n\n\n\n';

	function instance$2($$self, $$props, $$invalidate) {
		

	var title = $$props.title; if ( title === void 0 ) title = '';
	var description = $$props.description; if ( description === void 0 ) description = '';
	var code = $$props.code; if ( code === void 0 ) code = '';
	var mock = $$props.mock; if ( mock === void 0 ) mock = '';
	var height = $$props.height; if ( height === void 0 ) height = 320;

	var clear = 0;
	var log;
	var cons = {};
	var loop = function ( level ) {
	  cons[level] = function () {
	    var args = [], len = arguments.length;
	    while ( len-- ) args[ len ] = arguments[ len ];

	    $$invalidate('log', log = {
	      level: level,
	      args: args,
	    });
	  }; $$invalidate('cons', cons);
	};

	for (var level in console) loop( level );
	function run() {
	  run$1(("XHRMock.reset();" + LF + mock + LF + ";(async()=>{" + LF + code + LF + "})().catch(e=>console.error(e.name+': '+e.message))"), cons);
	}

		function codemirror_value_binding(value) {
			code = value;
			$$invalidate('code', code);
		}

		function codemirror_value_binding_1(value) {
			mock = value;
			$$invalidate('mock', mock);
		}

		function click_handler() {
			var $$result = clear++;
			$$invalidate('clear', clear);
			return $$result;
		}

		$$self.$set = function ($$props) {
			if ('title' in $$props) { $$invalidate('title', title = $$props.title); }
			if ('description' in $$props) { $$invalidate('description', description = $$props.description); }
			if ('code' in $$props) { $$invalidate('code', code = $$props.code); }
			if ('mock' in $$props) { $$invalidate('mock', mock = $$props.mock); }
			if ('height' in $$props) { $$invalidate('height', height = $$props.height); }
		};

		return {
			title: title,
			description: description,
			code: code,
			mock: mock,
			height: height,
			clear: clear,
			log: log,
			run: run,
			codemirror_value_binding: codemirror_value_binding,
			codemirror_value_binding_1: codemirror_value_binding_1,
			click_handler: click_handler
		};
	}

	var Section = /*@__PURE__*/(function (SvelteComponent) {
		function Section(options) {
			SvelteComponent.call(this);
			init(this, options, instance$2, create_fragment$2, safe_not_equal, ["title", "description", "code", "mock", "height"]);
		}

		if ( SvelteComponent ) Section.__proto__ = SvelteComponent;
		Section.prototype = Object.create( SvelteComponent && SvelteComponent.prototype );
		Section.prototype.constructor = Section;

		return Section;
	}(SvelteComponent));

	/* src\components\showcase.svelte generated by Svelte v3.4.2 */

	function get_each_context$1(ctx, list, i) {
		var child_ctx = Object.create(ctx);
		child_ctx.section = list[i];
		return child_ctx;
	}

	// (12:2) {:else}
	function create_else_block$1(ctx) {
		var current;

		var section_spread_levels = [
			ctx.sections
		];

		var section_props = {};
		for (var i = 0; i < section_spread_levels.length; i += 1) {
			section_props = assign(section_props, section_spread_levels[i]);
		}
		var section = new Section({ props: section_props });

		return {
			c: function c() {
				section.$$.fragment.c();
			},

			m: function m(target, anchor) {
				mount_component(section, target, anchor);
				current = true;
			},

			p: function p(changed, ctx) {
				var section_changes = changed.sections ? get_spread_update(section_spread_levels, [
					ctx.sections
				]) : {};
				section.$set(section_changes);
			},

			i: function i(local) {
				if (current) { return; }
				section.$$.fragment.i(local);

				current = true;
			},

			o: function o(local) {
				section.$$.fragment.o(local);
				current = false;
			},

			d: function d(detaching) {
				section.$destroy(detaching);
			}
		};
	}

	// (8:2) {#if sections.length}
	function create_if_block$2(ctx) {
		var each_1_anchor, current;

		var each_value = ctx.sections;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
		}

		function outro_block(i, detaching, local) {
			if (each_blocks[i]) {
				if (detaching) {
					on_outro(function () {
						each_blocks[i].d(detaching);
						each_blocks[i] = null;
					});
				}

				each_blocks[i].o(local);
			}
		}

		return {
			c: function c() {
				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				each_1_anchor = empty();
			},

			m: function m(target, anchor) {
				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(target, anchor);
				}

				insert(target, each_1_anchor, anchor);
				current = true;
			},

			p: function p(changed, ctx) {
				if (changed.sections) {
					each_value = ctx.sections;

					for (var i = 0; i < each_value.length; i += 1) {
						var child_ctx = get_each_context$1(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
							each_blocks[i].i(1);
						} else {
							each_blocks[i] = create_each_block$1(child_ctx);
							each_blocks[i].c();
							each_blocks[i].i(1);
							each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
						}
					}

					group_outros();
					for (; i < each_blocks.length; i += 1) { outro_block(i, 1, 1); }
					check_outros();
				}
			},

			i: function i(local) {
				if (current) { return; }
				for (var i = 0; i < each_value.length; i += 1) { each_blocks[i].i(); }

				current = true;
			},

			o: function o(local) {
				each_blocks = each_blocks.filter(Boolean);
				for (var i = 0; i < each_blocks.length; i += 1) { outro_block(i, 0); }

				current = false;
			},

			d: function d(detaching) {
				destroy_each(each_blocks, detaching);

				if (detaching) {
					detach(each_1_anchor);
				}
			}
		};
	}

	// (9:4) {#each sections as section}
	function create_each_block$1(ctx) {
		var current;

		var section_spread_levels = [
			ctx.section
		];

		var section_props = {};
		for (var i = 0; i < section_spread_levels.length; i += 1) {
			section_props = assign(section_props, section_spread_levels[i]);
		}
		var section = new Section({ props: section_props });

		return {
			c: function c() {
				section.$$.fragment.c();
			},

			m: function m(target, anchor) {
				mount_component(section, target, anchor);
				current = true;
			},

			p: function p(changed, ctx) {
				var section_changes = changed.sections ? get_spread_update(section_spread_levels, [
					ctx.section
				]) : {};
				section.$set(section_changes);
			},

			i: function i(local) {
				if (current) { return; }
				section.$$.fragment.i(local);

				current = true;
			},

			o: function o(local) {
				section.$$.fragment.o(local);
				current = false;
			},

			d: function d(detaching) {
				section.$destroy(detaching);
			}
		};
	}

	function create_fragment$3(ctx) {
		var div, current_block_type_index, if_block, current;

		var if_block_creators = [
			create_if_block$2,
			create_else_block$1
		];

		var if_blocks = [];

		function select_block_type(ctx) {
			if (ctx.sections.length) { return 0; }
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		return {
			c: function c() {
				div = element("div");
				if_block.c();
				div.className = "shadow-sm p-2 my-4 rounded";
			},

			m: function m(target, anchor) {
				insert(target, div, anchor);
				if_blocks[current_block_type_index].m(div, null);
				current = true;
			},

			p: function p(changed, ctx) {
				var previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);
				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(changed, ctx);
				} else {
					group_outros();
					on_outro(function () {
						if_blocks[previous_block_index].d(1);
						if_blocks[previous_block_index] = null;
					});
					if_block.o(1);
					check_outros();

					if_block = if_blocks[current_block_type_index];
					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					}
					if_block.i(1);
					if_block.m(div, null);
				}
			},

			i: function i(local) {
				if (current) { return; }
				if (if_block) { if_block.i(); }
				current = true;
			},

			o: function o(local) {
				if (if_block) { if_block.o(); }
				current = false;
			},

			d: function d(detaching) {
				if (detaching) {
					detach(div);
				}

				if_blocks[current_block_type_index].d();
			}
		};
	}

	function instance$3($$self, $$props, $$invalidate) {
		var sections = $$props.sections; if ( sections === void 0 ) sections = [];

		$$self.$set = function ($$props) {
			if ('sections' in $$props) { $$invalidate('sections', sections = $$props.sections); }
		};

		return { sections: sections };
	}

	var Showcase = /*@__PURE__*/(function (SvelteComponent) {
		function Showcase(options) {
			SvelteComponent.call(this);
			init(this, options, instance$3, create_fragment$3, safe_not_equal, ["sections"]);
		}

		if ( SvelteComponent ) Showcase.__proto__ = SvelteComponent;
		Showcase.prototype = Object.create( SvelteComponent && SvelteComponent.prototype );
		Showcase.prototype.constructor = Showcase;

		return Showcase;
	}(SvelteComponent));

	/* src\docs.svelte generated by Svelte v3.4.2 */

	function get_each_context$2(ctx, list, i) {
		var child_ctx = Object.create(ctx);
		child_ctx.sections = list[i];
		return child_ctx;
	}

	// (319:0) {#each showcases as sections}
	function create_each_block$2(ctx) {
		var current;

		var showcase = new Showcase({ props: { sections: ctx.sections } });

		return {
			c: function c() {
				showcase.$$.fragment.c();
			},

			m: function m(target, anchor) {
				mount_component(showcase, target, anchor);
				current = true;
			},

			p: function p(changed, ctx) {
				var showcase_changes = {};
				if (changed.showcases) { showcase_changes.sections = ctx.sections; }
				showcase.$set(showcase_changes);
			},

			i: function i(local) {
				if (current) { return; }
				showcase.$$.fragment.i(local);

				current = true;
			},

			o: function o(local) {
				showcase.$$.fragment.o(local);
				current = false;
			},

			d: function d(detaching) {
				showcase.$destroy(detaching);
			}
		};
	}

	function create_fragment$4(ctx) {
		var each_1_anchor, current;

		var each_value = ctx.showcases;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
		}

		function outro_block(i, detaching, local) {
			if (each_blocks[i]) {
				if (detaching) {
					on_outro(function () {
						each_blocks[i].d(detaching);
						each_blocks[i] = null;
					});
				}

				each_blocks[i].o(local);
			}
		}

		return {
			c: function c() {
				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				each_1_anchor = empty();
			},

			m: function m(target, anchor) {
				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(target, anchor);
				}

				insert(target, each_1_anchor, anchor);
				current = true;
			},

			p: function p(changed, ctx) {
				if (changed.showcases) {
					each_value = ctx.showcases;

					for (var i = 0; i < each_value.length; i += 1) {
						var child_ctx = get_each_context$2(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
							each_blocks[i].i(1);
						} else {
							each_blocks[i] = create_each_block$2(child_ctx);
							each_blocks[i].c();
							each_blocks[i].i(1);
							each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
						}
					}

					group_outros();
					for (; i < each_blocks.length; i += 1) { outro_block(i, 1, 1); }
					check_outros();
				}
			},

			i: function i(local) {
				if (current) { return; }
				for (var i = 0; i < each_value.length; i += 1) { each_blocks[i].i(); }

				current = true;
			},

			o: function o(local) {
				each_blocks = each_blocks.filter(Boolean);
				for (var i = 0; i < each_blocks.length; i += 1) { outro_block(i, 0); }

				current = false;
			},

			d: function d(detaching) {
				destroy_each(each_blocks, detaching);

				if (detaching) {
					detach(each_1_anchor);
				}
			}
		};
	}

	function instance$4($$self) {
		var showcases = [
	  [
	    {
	      title: 'Installation',
	    },
	    {
	      title: 'NPM',
	      code: 'npm install req-json --save',
	      height: 28,
	    },
	    {
	      description: 'ES modules for Webpack 2+ or Rollup',
	      code: 'import ReqJSON from \'req-json\';',
	      height: 28,
	    },
	    {
	      description: 'CommonJS for Webpack 1 or Browserify',
	      code: 'const ReqJSON = require(\'req-json\');',
	      height: 28,
	    },
	    {
	      title: 'Browser',
	      description: 'Direct <code>&lt;script&gt;</code> include',
	      // eslint-disable-next-line no-useless-concat
	      code: '<' + 'script src="https://cdn.jsdelivr.net/npm/req-json@2">' + '<' + '/script>',
	      height: 28,
	    },
	    {
	      title: 'Wechat mini program (weapp)',
	      description: 'It also supports wechat mini program (weapp).',
	      code: 'const ReqJSON = require(\'req-json/dist/req-json.wx\');',
	      height: 28,
	    },
	    {
	      description: 'or just <a href=https://cdn.jsdelivr.net/npm/req-json@2/dist/req-json.wx.js target=_blank>download</a> and copy to your project.',
	    } ],
	  {
	    title: 'Basic Usage',
	    code: "const reqJSON = new ReqJSON();\n\nreqJSON.get('/api/item/:id', 1)\n  .then(res => console.log(res));",
	    mock: "XHRMock.get('/api/item/1', {\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({\n    hello: 'world',\n    date: new Date()\n  }),\n});",
	  },
	  {
	    title: 'Shorthand methods',
	    code: "const reqJSON = new ReqJSON();\n\nconst item = await reqJSON.get('/api/item/:id', { id: 1 });\nconsole.log('client get', item);\n\nconst res = await reqJSON.post('/api/item/:id', item);\nconsole.log('client post', res);",
	    mock: "XHRMock.get('/api/item/1', {\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({\n    id: 1,\n    date: new Date(),\n  }),\n});\n\nXHRMock.post('/api/item/1', (req, res) => {\n  console.info('server receive', JSON.parse(req.body()));\n  return res\n    .status(200)\n    .header('Content-Type', 'application/json')\n    .body(JSON.stringify({\n      updateAt: new Date(),\n    }));\n});",
	  },
	  {
	    title: 'RESTful API',
	    code: "const reqJSON = new ReqJSON();\nconst resource = reqJSON.resource('/api/item/:id');\n\nconst item = await resource.get({ id: 1 });\nconsole.log('client get', item);\n\nconst res = await resource.post(item);\nconsole.log('client post', res);",
	    mock: "XHRMock.get('/api/item/1', {\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({\n    id: 1,\n    date: new Date(),\n  }),\n});\n\nXHRMock.post('/api/item/1', (req, res) => {\n  console.info('server receive', JSON.parse(req.body()));\n  return res\n    .status(200)\n    .header('Content-Type', 'application/json')\n    .body(JSON.stringify({\n      updateAt: new Date(),\n    }));\n});",
	  },
	  {
	    title: 'Methods',
	    description: 'Supports GET POST PUT DELETE methods.',
	    code: "const reqJSON = new ReqJSON();\nconst resource = reqJSON.resource('/api/item/:id');\n\nconst id = 1;\nlet item;\nconsole.log({\n  get: item = await resource.get(id),\n  post: await resource.post(item),\n  put: await resource.put(item),\n  delete: await resource.delete(id),\n});",
	    mock: "const mock = (method, body) => XHRMock[method]('/api/item/1', {\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify(body),\n});\n\n[ 'get', 'delete' ].forEach(method => mock(method, {\n  id: 1,\n  date: new Date(),\n}));\n\n[ 'post', 'put' ].forEach(method => mock(method, {\n  updateAt: new Date(),\n}));",
	  },
	  [
	    {
	      title: 'Options',
	      description: 'Customized request headers for single request.',
	      code: "const reqJSON = new ReqJSON();\n\nconsole.warn(await reqJSON.get('/api/item/:id', 1));\n\nconsole.log(await reqJSON.get('/api/item/:id', 1, {\n  headers: {\n    Authorization: 'abc'\n  }\n}));",
	      mock: "XHRMock.get('/api/item/1', (req, res) =>\n  req.header('Authorization') == 'abc'\n    ? res\n      .status(200)\n      .header('Content-Type', 'application/json')\n      .body(JSON.stringify({\n        updateAt: new Date(),\n      }))\n    : res\n      .status(401)\n      .body('Unauthorized')\n);",
	    },
	    {
	      description: 'Or for resource defination.',
	      code: "const reqJSON = new ReqJSON();\n\nconst resource = reqJSON.resource('/api/item/:id', {\n  headers: {\n    Authorization: 'abc'\n  }\n})\n\nconsole.log(await resource.get(1));",
	      mock: "XHRMock.get('/api/item/1', (req, res) =>\n  req.header('Authorization') == 'abc'\n    ? res\n      .status(200)\n      .header('Content-Type', 'application/json')\n      .body(JSON.stringify({\n        updateAt: new Date(),\n      }))\n    : res\n      .status(401)\n      .body('Unauthorized')\n);",
	    } ],
	  {
	    title: 'Middlewares',
	    description: 'Supports koa-like middlewares',
	    code: "const reqJSON = new ReqJSON();\n\nreqJSON.use(async(context, next) => {\n  const start = Date.now();\n  await next();\n  const ms = Date.now() - start;\n  console.log(`${context.method} ${context.url} ${ms}ms`);\n});\n\nawait reqJSON.get('/api/item/:id', 1);",
	    mock: "XHRMock.get('/api/item/1', (req, res) => new Promise(resolve =>\n  setTimeout(() => resolve(res.status(200)), 500)\n));",
	  },
	  {
	    title: 'Context',
	    description: 'Context contains these attributes:',
	    code: "/**\n * The path to use for the request, with parameters defined.\n */\npath: string\n\n/**\n * The HTTP method to use for the request (e.g. \"POST\", \"GET\", \"PUT\", \"DELETE\").\n */\nmethod: string\n\n/**\n * The URL to which the request is sent.\n */\nurl: string\n\n/**\n * The data to be sent.\n */\ndata: any\n\n/**\n * The options to use for the request.\n */\noptions: object\n\n/**\n * The HTTP status of the response. Only available when the request completes.\n */\nstatus?: number\n\n/**\n * The parsed response. Only available when the request completes.\n */\nresponse?: string | object\n\n/**\n * The request headers before the request is sent, the response headers when the request completes.\n */\nheaders: object\n\n/**\n * Alias to `headers`\n */\nheader: object\n\n/**\n * The original XMLHttpRequest object.\n */\nxhr: XMLHttpRequest",
	  },
	  [
	    {
	      title: 'Examples',
	      description: 'Reject when status 4xx or 5xx',
	      code: "const reqJSON = new ReqJSON();\n\nreqJSON.use(async(context, next) => {\n  await next();\n  if (context.status >= 400) {\n    throw new Error(context.response);\n  }\n});\n\nawait reqJSON.post('/api/item/:id', 1);",
	      mock: "XHRMock.post('/api/item/1', (req, res) =>\n  req.header('Authorization') == 'abc'\n    ? res\n      .status(200)\n      .header('Content-Type', 'application/json')\n      .body(JSON.stringify({\n        updateAt: new Date(),\n      }))\n    : res\n      .status(401)\n      .body('Unauthorized')\n);",
	    },
	    {
	      description: 'Set request headers and get response headers',
	      code: "const reqJSON = new ReqJSON();\n\nreqJSON.use(async(context, next) => {\n  // set request headers\n  context.headers = {\n    'If-None-Match': 'abcdefg'\n  };\n  await next();\n  // get response headers\n  console.log(context.status, context.headers.etag);\n});\n\nawait reqJSON.post('/api/item/:id', 1);",
	      mock: "XHRMock.post('/api/item/1', (req, res) =>\n  req.header('If-None-Match') != 'abcdefg'\n    ? res\n      .status(200)\n      .header('Content-Type', 'application/json')\n      .header('Etag', 'abcdefg')\n      .body(JSON.stringify({\n        updateAt: new Date(),\n      }))\n    : res\n      .status(304)\n      .header('Etag', 'abcdefg')\n);",
	    } ] ];

		return { showcases: showcases };
	}

	var Docs = /*@__PURE__*/(function (SvelteComponent) {
	  function Docs(options) {
			SvelteComponent.call(this);
			init(this, options, instance$4, create_fragment$4, safe_not_equal, []);
		}

	  if ( SvelteComponent ) Docs.__proto__ = SvelteComponent;
	  Docs.prototype = Object.create( SvelteComponent && SvelteComponent.prototype );
	  Docs.prototype.constructor = Docs;

	  return Docs;
	}(SvelteComponent));

	/* src\app.svelte generated by Svelte v3.4.2 */

	function create_fragment$5(ctx) {
		var div, h1, t_1, current;

		var docs = new Docs({});

		return {
			c: function c() {
				div = element("div");
				h1 = element("h1");
				h1.innerHTML = "<span></span>REQ-JSON";
				t_1 = space();
				docs.$$.fragment.c();
				h1.className = "my-4 text-center svelte-1sz5h2k";
				div.className = "container";
			},

			m: function m(target, anchor) {
				insert(target, div, anchor);
				append(div, h1);
				append(div, t_1);
				mount_component(docs, div, null);
				current = true;
			},

			p: noop,

			i: function i(local) {
				if (current) { return; }
				docs.$$.fragment.i(local);

				current = true;
			},

			o: function o(local) {
				docs.$$.fragment.o(local);
				current = false;
			},

			d: function d(detaching) {
				if (detaching) {
					detach(div);
				}

				docs.$destroy();
			}
		};
	}

	var App = /*@__PURE__*/(function (SvelteComponent) {
		function App(options) {
			SvelteComponent.call(this);
			init(this, options, null, create_fragment$5, safe_not_equal, []);
		}

		if ( SvelteComponent ) App.__proto__ = SvelteComponent;
		App.prototype = Object.create( SvelteComponent && SvelteComponent.prototype );
		App.prototype.constructor = App;

		return App;
	}(SvelteComponent));

	/* global XHRMock */

	XHRMock.setup();

	var app = new App({
	  target: document.getElementById('app'),
	});

	return app;

}(SvelteFa));
