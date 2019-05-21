var app = (function () {
	'use strict';

	function noop() {}

	function assign(tar, src) {
		for (const k in src) tar[k] = src[k];
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

	function exclude_internal_props(props) {
		const result = {};
		for (const k in props) if (k[0] !== '$') result[k] = props[k];
		return result;
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
		for (let i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detaching);
		}
	}

	function element(name) {
		return document.createElement(name);
	}

	function svg_element(name) {
		return document.createElementNS('http://www.w3.org/2000/svg', name);
	}

	function text(data) {
		return document.createTextNode(data);
	}

	function space() {
		return text(' ');
	}

	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
	}

	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else node.setAttribute(attribute, value);
	}

	function children(element) {
		return Array.from(element.childNodes);
	}

	function set_data(text, data) {
		data = '' + data;
		if (text.data !== data) text.data = data;
	}

	let current_component;

	function set_current_component(component) {
		current_component = component;
	}

	function get_current_component() {
		if (!current_component) throw new Error(`Function called outside component initialization`);
		return current_component;
	}

	function beforeUpdate(fn) {
		get_current_component().$$.before_render.push(fn);
	}

	function onMount(fn) {
		get_current_component().$$.on_mount.push(fn);
	}

	function afterUpdate(fn) {
		get_current_component().$$.after_render.push(fn);
	}

	function onDestroy(fn) {
		get_current_component().$$.on_destroy.push(fn);
	}

	const dirty_components = [];

	const resolved_promise = Promise.resolve();
	let update_scheduled = false;
	const binding_callbacks = [];
	const render_callbacks = [];
	const flush_callbacks = [];

	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
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
		const seen_callbacks = new Set();

		do {
			// first, call beforeUpdate functions
			// and update components
			while (dirty_components.length) {
				const component = dirty_components.shift();
				set_current_component(component);
				update(component.$$);
			}

			while (binding_callbacks.length) binding_callbacks.shift()();

			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			while (render_callbacks.length) {
				const callback = render_callbacks.pop();
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

	let outros;

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
		on_outro(() => {
			destroy_block(block, lookup);
		});

		block.o(1);
	}

	function update_keyed_each(old_blocks, changed, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
		let o = old_blocks.length;
		let n = list.length;

		let i = o;
		const old_indexes = {};
		while (i--) old_indexes[old_blocks[i].key] = i;

		const new_blocks = [];
		const new_lookup = new Map();
		const deltas = new Map();

		i = n;
		while (i--) {
			const child_ctx = get_context(ctx, list, i);
			const key = get_key(child_ctx);
			let block = lookup.get(key);

			if (!block) {
				block = create_each_block(key, child_ctx);
				block.c();
			} else if (dynamic) {
				block.p(changed, child_ctx);
			}

			new_lookup.set(key, new_blocks[i] = block);

			if (key in old_indexes) deltas.set(key, Math.abs(i - old_indexes[key]));
		}

		const will_move = new Set();
		const did_move = new Set();

		function insert(block) {
			if (block.i) block.i(1);
			block.m(node, next);
			lookup.set(block.key, block);
			next = block.first;
			n--;
		}

		while (o && n) {
			const new_block = new_blocks[n - 1];
			const old_block = old_blocks[o - 1];
			const new_key = new_block.key;
			const old_key = old_block.key;

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
			const old_block = old_blocks[o];
			if (!new_lookup.has(old_block.key)) destroy(old_block, lookup);
		}

		while (n) insert(new_blocks[n - 1]);

		return new_blocks;
	}

	function get_spread_update(levels, updates) {
		const update = {};

		const to_null_out = {};
		const accounted_for = { $$scope: 1 };

		let i = levels.length;
		while (i--) {
			const o = levels[i];
			const n = updates[i];

			if (n) {
				for (const key in o) {
					if (!(key in n)) to_null_out[key] = 1;
				}

				for (const key in n) {
					if (!accounted_for[key]) {
						update[key] = n[key];
						accounted_for[key] = 1;
					}
				}

				levels[i] = n;
			} else {
				for (const key in o) {
					accounted_for[key] = 1;
				}
			}
		}

		for (const key in to_null_out) {
			if (!(key in update)) update[key] = undefined;
		}

		return update;
	}

	function bind(component, name, callback) {
		if (component.$$.props.indexOf(name) === -1) return;
		component.$$.bound[name] = callback;
		callback(component.$$.ctx[name]);
	}

	function mount_component(component, target, anchor) {
		const { fragment, on_mount, on_destroy, after_render } = component.$$;

		fragment.m(target, anchor);

		// onMount happens after the initial afterUpdate. Because
		// afterUpdate callbacks happen in reverse order (inner first)
		// we schedule onMount callbacks before afterUpdate callbacks
		add_render_callback(() => {
			const new_on_destroy = on_mount.map(run).filter(is_function);
			if (on_destroy) {
				on_destroy.push(...new_on_destroy);
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
		const parent_component = current_component;
		set_current_component(component);

		const props = options.props || {};

		const $$ = component.$$ = {
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

		let ready = false;

		$$.ctx = instance
			? instance(component, props, (key, value) => {
				if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
					if ($$.bound[key]) $$.bound[key](value);
					if (ready) make_dirty(component, key);
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

			if (options.intro && component.$$.fragment.i) component.$$.fragment.i();
			mount_component(component, options.target, options.anchor);
			flush();
		}

		set_current_component(parent_component);
	}

	class SvelteComponent {
		$destroy() {
			destroy(this, true);
			this.$destroy = noop;
		}

		$on(type, callback) {
			const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
			callbacks.push(callback);

			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		$set() {
			// overridden by instance, if it has props
		}
	}

	/* src\codemirror.svelte generated by Svelte v3.4.1 */

	function create_fragment(ctx) {
		var div;

		return {
			c() {
				div = element("div");
				div.className = "codemirror rounded overflow-hidden";
			},

			m(target, anchor) {
				insert(target, div, anchor);
				add_binding_callback(() => ctx.div_binding(div, null));
			},

			p(changed, ctx) {
				if (changed.items) {
					ctx.div_binding(null, div);
					ctx.div_binding(div, null);
				}
			},

			i: noop,
			o: noop,

			d(detaching) {
				if (detaching) {
					detach(div);
				}

				ctx.div_binding(null, div);
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		let { value } = $$props;

	let container;

	let cm;
	onMount(() => {
	  $$invalidate('cm', cm = CodeMirror(container, {
	    value,
	    mode: 'javascript',
	    lineNumbers: true,
	    theme: 'monokai',
	  }));
	  cm.on('blur', () => {
	    $$invalidate('value', value = cm.getValue());
	  });
	});

	onDestroy(() => {
	  cm.toTextArea();
	});

		function div_binding($$node, check) {
			container = $$node;
			$$invalidate('container', container);
		}

		$$self.$set = $$props => {
			if ('value' in $$props) $$invalidate('value', value = $$props.value);
		};

		return { value, container, div_binding };
	}

	class Codemirror extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance, create_fragment, safe_not_equal, ["value"]);
		}
	}

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

	  if (!date) date = new Date();
	  return str.replace(dateRegex, function(match, key, rest) {
	    var args = timespan[key];
	    var name = args[0];
	    var chars = args[1];
	    if (utc === true) name = 'getUTC' + name.slice(3);
	    var val = '00' + String(date[name]() + (args[2] || 0));
	    return val.slice(-chars) + (rest || '');
	  });
	};

	timestamp.utc = function(str, date) {
	  return timestamp(str, date, true);
	};

	var timeStamp = timestamp;

	/* node_modules\fa-svelte\src\Icon.html generated by Svelte v3.4.1 */

	function create_fragment$1(ctx) {
		var svg, path_1;

		return {
			c() {
				svg = svg_element("svg");
				path_1 = svg_element("path");
				attr(path_1, "fill", "currentColor");
				attr(path_1, "d", ctx.path);
				attr(svg, "aria-hidden", "true");
				attr(svg, "class", "" + ctx.classes + " svelte-p8vizn");
				attr(svg, "role", "img");
				attr(svg, "xmlns", "http://www.w3.org/2000/svg");
				attr(svg, "viewBox", ctx.viewBox);
			},

			m(target, anchor) {
				insert(target, svg, anchor);
				append(svg, path_1);
			},

			p(changed, ctx) {
				if (changed.path) {
					attr(path_1, "d", ctx.path);
				}

				if (changed.classes) {
					attr(svg, "class", "" + ctx.classes + " svelte-p8vizn");
				}

				if (changed.viewBox) {
					attr(svg, "viewBox", ctx.viewBox);
				}
			},

			i: noop,
			o: noop,

			d(detaching) {
				if (detaching) {
					detach(svg);
				}
			}
		};
	}

	function instance$1($$self, $$props, $$invalidate) {
		let { icon } = $$props;

	  let path = [];
	  let classes = "";
	  let viewBox = "";

		$$self.$set = $$new_props => {
			$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
			if ('icon' in $$props) $$invalidate('icon', icon = $$props.icon);
		};

		$$self.$$.update = ($$dirty = { icon: 1, $$props: 1 }) => {
			if ($$dirty.icon) { $$invalidate('viewBox', viewBox = "0 0 " + icon.icon[0] + " " + icon.icon[1]); }
			$$invalidate('classes', classes = "fa-svelte " + ($$props.class ? $$props.class : ""));
			if ($$dirty.icon) { $$invalidate('path', path = icon.icon[4]); }
		};

		return {
			icon,
			path,
			classes,
			viewBox,
			$$props: $$props = exclude_internal_props($$props)
		};
	}

	class Icon extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$1, create_fragment$1, safe_not_equal, ["icon"]);
		}
	}

	var faChevronRight = {
	  prefix: 'fas',
	  iconName: 'chevron-right',
	  icon: [320, 512, [], "f054", "M285.476 272.971L91.132 467.314c-9.373 9.373-24.569 9.373-33.941 0l-22.667-22.667c-9.357-9.357-9.375-24.522-.04-33.901L188.505 256 34.484 101.255c-9.335-9.379-9.317-24.544.04-33.901l22.667-22.667c9.373-9.373 24.569-9.373 33.941 0L285.475 239.03c9.373 9.372 9.373 24.568.001 33.941z"]
	};

	/* src\console.svelte generated by Svelte v3.4.1 */

	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.log = list[i];
		return child_ctx;
	}

	// (44:2) {#each logs as log (log.t)}
	function create_each_block(key_1, ctx) {
		var li, small, small_class_value, t0, span, t1_value = ctx.log.t, t1, span_class_value, t2, t3_value = ctx.log.str, t3, t4, current;

		var fa = new Icon({ props: { icon: faChevronRight } });

		return {
			key: key_1,

			first: null,

			c() {
				li = element("li");
				small = element("small");
				fa.$$.fragment.c();
				t0 = space();
				span = element("span");
				t1 = text(t1_value);
				t2 = space();
				t3 = text(t3_value);
				t4 = space();
				small.className = small_class_value = `text-${ctx.log.level}`;
				span.className = span_class_value = `text-${ctx.log.level}`;
				li.className = "list-group-item p-1";
				this.first = li;
			},

			m(target, anchor) {
				insert(target, li, anchor);
				append(li, small);
				mount_component(fa, small, null);
				append(li, t0);
				append(li, span);
				append(span, t1);
				append(li, t2);
				append(li, t3);
				append(li, t4);
				current = true;
			},

			p(changed, ctx) {
				var fa_changes = {};
				if (changed.faChevronRight) fa_changes.icon = faChevronRight;
				fa.$set(fa_changes);

				if ((!current || changed.logs) && small_class_value !== (small_class_value = `text-${ctx.log.level}`)) {
					small.className = small_class_value;
				}

				if ((!current || changed.logs) && t1_value !== (t1_value = ctx.log.t)) {
					set_data(t1, t1_value);
				}

				if ((!current || changed.logs) && span_class_value !== (span_class_value = `text-${ctx.log.level}`)) {
					span.className = span_class_value;
				}

				if ((!current || changed.logs) && t3_value !== (t3_value = ctx.log.str)) {
					set_data(t3, t3_value);
				}
			},

			i(local) {
				if (current) return;
				fa.$$.fragment.i(local);

				current = true;
			},

			o(local) {
				fa.$$.fragment.o(local);
				current = false;
			},

			d(detaching) {
				if (detaching) {
					detach(li);
				}

				fa.$destroy();
			}
		};
	}

	function create_fragment$2(ctx) {
		var ul_1, each_blocks = [], each_1_lookup = new Map(), ul_1_style_value, current;

		var each_value = ctx.logs;

		const get_key = ctx => ctx.log.t;

		for (var i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
		}

		return {
			c() {
				ul_1 = element("ul");

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].c();
				ul_1.style.cssText = ul_1_style_value = `max-height: ${height}px`;
				ul_1.className = "list-group list-group-flush overflow-auto";
			},

			m(target, anchor) {
				insert(target, ul_1, anchor);

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].m(ul_1, null);

				add_binding_callback(() => ctx.ul_1_binding(ul_1, null));
				current = true;
			},

			p(changed, ctx) {
				const each_value = ctx.logs;

				group_outros();
				each_blocks = update_keyed_each(each_blocks, changed, get_key, 1, ctx, each_value, each_1_lookup, ul_1, outro_and_destroy_block, create_each_block, null, get_each_context);
				check_outros();

				if (changed.items) {
					ctx.ul_1_binding(null, ul_1);
					ctx.ul_1_binding(ul_1, null);
				}
			},

			i(local) {
				if (current) return;
				for (var i = 0; i < each_value.length; i += 1) each_blocks[i].i();

				current = true;
			},

			o(local) {
				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].o();

				current = false;
			},

			d(detaching) {
				if (detaching) {
					detach(ul_1);
				}

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].d();

				ctx.ul_1_binding(null, ul_1);
			}
		};
	}

	const height = 160;

	function instance$2($$self, $$props, $$invalidate) {
		

	let { log } = $$props;

	const levels = {
	  log: 'secondary',
	  info: 'info',
	  warn: 'warning',
	  error: 'danger',
	};
	let logs = [];
	let ul;
	let autoscroll;
	beforeUpdate(() => {
	  $$invalidate('autoscroll', autoscroll = ul && (ul.offsetHeight + ul.scrollTop) > (ul.scrollHeight - height));
	});
	afterUpdate(() => {
	  autoscroll && ul.scrollTo(0, ul.scrollHeight);
	});

		function ul_1_binding($$node, check) {
			ul = $$node;
			$$invalidate('ul', ul);
		}

		$$self.$set = $$props => {
			if ('log' in $$props) $$invalidate('log', log = $$props.log);
		};

		$$self.$$.update = ($$dirty = { log: 1, logs: 1 }) => {
			if ($$dirty.log || $$dirty.logs) { log && (logs = logs.concat({
	      t: timeStamp('HH:mm:ss.ms'),
	      level: levels[log.level],
	      str: log.args.map(l => JSON.stringify(l, null, 2)).join(' '),
	    })); $$invalidate('logs', logs), $$invalidate('log', log); }
			if ($$dirty.log) { console.log(log); }
		};

		return { log, logs, ul, ul_1_binding };
	}

	class Console extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$2, create_fragment$2, safe_not_equal, ["log"]);
		}
	}

	/* src\showcase.svelte generated by Svelte v3.4.1 */

	// (35:2) {#if description}
	function create_if_block(ctx) {
		var div, t;

		return {
			c() {
				div = element("div");
				t = text(ctx.description);
				div.className = "px-1 py-2 rounded";
			},

			m(target, anchor) {
				insert(target, div, anchor);
				append(div, t);
			},

			p(changed, ctx) {
				if (changed.description) {
					set_data(t, ctx.description);
				}
			},

			d(detaching) {
				if (detaching) {
					detach(div);
				}
			}
		};
	}

	function create_fragment$3(ctx) {
		var div4, h3, t0, t1, t2, div2, div0, h50, t4, updating_value, t5, div1, h51, t7, updating_value_1, t8, div3, button, t10, current, dispose;

		var if_block = (ctx.description) && create_if_block(ctx);

		function codemirror0_value_binding(value) {
			ctx.codemirror0_value_binding.call(null, value);
			updating_value = true;
			add_flush_callback(() => updating_value = false);
		}

		let codemirror0_props = {};
		if (ctx.code !== void 0) {
			codemirror0_props.value = ctx.code;
		}
		var codemirror0 = new Codemirror({ props: codemirror0_props });

		add_binding_callback(() => bind(codemirror0, 'value', codemirror0_value_binding));

		function codemirror1_value_binding(value_1) {
			ctx.codemirror1_value_binding.call(null, value_1);
			updating_value_1 = true;
			add_flush_callback(() => updating_value_1 = false);
		}

		let codemirror1_props = {};
		if (ctx.mock !== void 0) {
			codemirror1_props.value = ctx.mock;
		}
		var codemirror1 = new Codemirror({ props: codemirror1_props });

		add_binding_callback(() => bind(codemirror1, 'value', codemirror1_value_binding));

		var console_1 = new Console({ props: { log: ctx.log } });

		return {
			c() {
				div4 = element("div");
				h3 = element("h3");
				t0 = text(ctx.title);
				t1 = space();
				if (if_block) if_block.c();
				t2 = space();
				div2 = element("div");
				div0 = element("div");
				h50 = element("h5");
				h50.innerHTML = `<a href="https://github.com/cweili/req-json#readme" target="_blank">ReqJSON</a>`;
				t4 = space();
				codemirror0.$$.fragment.c();
				t5 = space();
				div1 = element("div");
				h51 = element("h5");
				h51.innerHTML = `<a href="https://github.com/jameslnewell/xhr-mock#readme" target="_blank">XHRMock</a>`;
				t7 = space();
				codemirror1.$$.fragment.c();
				t8 = space();
				div3 = element("div");
				button = element("button");
				button.textContent = "RUN";
				t10 = space();
				console_1.$$.fragment.c();
				h3.className = "p-1";
				div0.className = "col-sm-6 px-1";
				div1.className = "col-sm-6 px-1";
				div2.className = "row m-0";
				button.className = "btn btn-outline-primary btn-sm";
				div3.className = "text-right px-1 py-2";
				div4.className = "shadow-sm p-2 my-4 rounded";
				dispose = listen(button, "click", ctx.run);
			},

			m(target, anchor) {
				insert(target, div4, anchor);
				append(div4, h3);
				append(h3, t0);
				append(div4, t1);
				if (if_block) if_block.m(div4, null);
				append(div4, t2);
				append(div4, div2);
				append(div2, div0);
				append(div0, h50);
				append(div0, t4);
				mount_component(codemirror0, div0, null);
				append(div2, t5);
				append(div2, div1);
				append(div1, h51);
				append(div1, t7);
				mount_component(codemirror1, div1, null);
				append(div4, t8);
				append(div4, div3);
				append(div3, button);
				append(div4, t10);
				mount_component(console_1, div4, null);
				current = true;
			},

			p(changed, ctx) {
				if (!current || changed.title) {
					set_data(t0, ctx.title);
				}

				if (ctx.description) {
					if (if_block) {
						if_block.p(changed, ctx);
					} else {
						if_block = create_if_block(ctx);
						if_block.c();
						if_block.m(div4, t2);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				var codemirror0_changes = {};
				if (!updating_value && changed.code) {
					codemirror0_changes.value = ctx.code;
				}
				codemirror0.$set(codemirror0_changes);

				var codemirror1_changes = {};
				if (!updating_value_1 && changed.mock) {
					codemirror1_changes.value = ctx.mock;
				}
				codemirror1.$set(codemirror1_changes);

				var console_1_changes = {};
				if (changed.log) console_1_changes.log = ctx.log;
				console_1.$set(console_1_changes);
			},

			i(local) {
				if (current) return;
				codemirror0.$$.fragment.i(local);

				codemirror1.$$.fragment.i(local);

				console_1.$$.fragment.i(local);

				current = true;
			},

			o(local) {
				codemirror0.$$.fragment.o(local);
				codemirror1.$$.fragment.o(local);
				console_1.$$.fragment.o(local);
				current = false;
			},

			d(detaching) {
				if (detaching) {
					detach(div4);
				}

				if (if_block) if_block.d();

				codemirror0.$destroy();

				codemirror1.$destroy();

				console_1.$destroy();

				dispose();
			}
		};
	}

	function instance$3($$self, $$props, $$invalidate) {
		

	let { title, description, code, mock } = $$props;

	let log;
	const cons = {};
	for (const level in console) {
	  cons[level] = (...args) => {
	    $$invalidate('log', log = {
	      level,
	      args,
	    });
	  }; $$invalidate('cons', cons);
	}

	function run() {
	  (new Function(
	    'console',
	    Babel.transform(
	      `XHRMock.reset();${mock};(async()=>{${code}})()`,
	      { presets: ['es2017', 'es2016', 'es2015'] },
	    ).code,
	  ))(cons);
	}

		function codemirror0_value_binding(value) {
			code = value;
			$$invalidate('code', code);
		}

		function codemirror1_value_binding(value_1) {
			mock = value_1;
			$$invalidate('mock', mock);
		}

		$$self.$set = $$props => {
			if ('title' in $$props) $$invalidate('title', title = $$props.title);
			if ('description' in $$props) $$invalidate('description', description = $$props.description);
			if ('code' in $$props) $$invalidate('code', code = $$props.code);
			if ('mock' in $$props) $$invalidate('mock', mock = $$props.mock);
		};

		return {
			title,
			description,
			code,
			mock,
			log,
			run,
			codemirror0_value_binding,
			codemirror1_value_binding
		};
	}

	class Showcase extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$3, create_fragment$3, safe_not_equal, ["title", "description", "code", "mock"]);
		}
	}

	/* src\app.svelte generated by Svelte v3.4.1 */

	function get_each_context$1(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.section = list[i];
		return child_ctx;
	}

	// (58:2) {#each sections as section}
	function create_each_block$1(ctx) {
		var current;

		var showcase_spread_levels = [
			ctx.section
		];

		let showcase_props = {};
		for (var i = 0; i < showcase_spread_levels.length; i += 1) {
			showcase_props = assign(showcase_props, showcase_spread_levels[i]);
		}
		var showcase = new Showcase({ props: showcase_props });

		return {
			c() {
				showcase.$$.fragment.c();
			},

			m(target, anchor) {
				mount_component(showcase, target, anchor);
				current = true;
			},

			p(changed, ctx) {
				var showcase_changes = changed.sections ? get_spread_update(showcase_spread_levels, [
					ctx.section
				]) : {};
				showcase.$set(showcase_changes);
			},

			i(local) {
				if (current) return;
				showcase.$$.fragment.i(local);

				current = true;
			},

			o(local) {
				showcase.$$.fragment.o(local);
				current = false;
			},

			d(detaching) {
				showcase.$destroy(detaching);
			}
		};
	}

	function create_fragment$4(ctx) {
		var div, h1, t_1, current;

		var each_value = ctx.sections;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
		}

		function outro_block(i, detaching, local) {
			if (each_blocks[i]) {
				if (detaching) {
					on_outro(() => {
						each_blocks[i].d(detaching);
						each_blocks[i] = null;
					});
				}

				each_blocks[i].o(local);
			}
		}

		return {
			c() {
				div = element("div");
				h1 = element("h1");
				h1.textContent = "REQ-JSON";
				t_1 = space();

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				h1.className = "text-center";
				div.className = "container";
			},

			m(target, anchor) {
				insert(target, div, anchor);
				append(div, h1);
				append(div, t_1);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div, null);
				}

				current = true;
			},

			p(changed, ctx) {
				if (changed.sections) {
					each_value = ctx.sections;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$1(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
							each_blocks[i].i(1);
						} else {
							each_blocks[i] = create_each_block$1(child_ctx);
							each_blocks[i].c();
							each_blocks[i].i(1);
							each_blocks[i].m(div, null);
						}
					}

					group_outros();
					for (; i < each_blocks.length; i += 1) outro_block(i, 1, 1);
					check_outros();
				}
			},

			i(local) {
				if (current) return;
				for (var i = 0; i < each_value.length; i += 1) each_blocks[i].i();

				current = true;
			},

			o(local) {
				each_blocks = each_blocks.filter(Boolean);
				for (let i = 0; i < each_blocks.length; i += 1) outro_block(i, 0);

				current = false;
			},

			d(detaching) {
				if (detaching) {
					detach(div);
				}

				destroy_each(each_blocks, detaching);
			}
		};
	}

	function instance$4($$self) {
		const sections = [
	  {
	    title: 'Basic Usage',
	    code: `const reqJSON = new ReqJSON();

reqJSON.get('/api/item/:id', 1)
  .then(res => console.log(res));`,
	    mock: `XHRMock.get('/api/item/1', {
  status: 200,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    hello: 'world',
    date: new Date()
  }),
});`,
	  },
	  {
	    title: 'Shorthand methods',
	    code: `const reqJSON = new ReqJSON();

const item = await reqJSON.get('/api/item/:id', {
  id: 1
});
const res = await reqJSON.post('/api/item/:id', item);

console.log('client', res);`,
	    mock: `XHRMock.get('/api/item/1', {
  status: 200,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    id: 1,
    hello: 'world'
  }),
});

XHRMock.post('/api/item/1', (req, res) => {
  console.info('server', JSON.parse(req.body()));
  return res
    .status(200)
    .header('Content-Type', 'application/json')
    .body(JSON.stringify({
      updateAt: new Date()
    }));
});`,
	  },
	];

		return { sections };
	}

	class App extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$4, create_fragment$4, safe_not_equal, []);
		}
	}

	/* global XHRMock */

	XHRMock.setup();

	const app = new App({
	  target: document.getElementById('app'),
	});

	return app;

}());
//# sourceMappingURL=bundle.js.map