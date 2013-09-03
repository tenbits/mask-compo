var Compo = (function() {

	function Compo(controller) {
		if (this instanceof Compo){
			// used in Class({Base: Compo})
			return null;
		}

		var klass;

		if (controller == null){
			controller = {};
		}

		if (controller.attr != null) {
			
			for (var key in controller.attr) {
				controller.attr[key] = _mask_ensureTmplFn(controller.attr[key]);
			}
			
		}
		
		var slots = controller.slots;
		if (slots != null) {
			for (var key in slots) {
				if (typeof slots[key] === 'string'){
					//if DEBUG
					typeof controller[slots[key]] !== 'function' && console.error('Not a Function @Slot.',slots[key]);
					// endif
					slots[key] = controller[slots[key]];
				}
			}
		}
		
		if (controller.hasOwnProperty('constructor')){
			klass = controller.constructor;
		}


		klass = compo_createConstructor(klass, controller);

		if (klass == null){
			klass = function CompoBase(){};
		}

		for(var key in Proto){
			if (controller[key] == null){
				controller[key] = Proto[key];
			}
			controller['base_' + key] = Proto[key];
		}

		klass.prototype = controller;

		controller = null;

		return klass;
	}

	// import Compo.util.js
	// import Compo.static.js
	// import async.js

	var Proto = {
		type: Dom.CONTROLLER,
		
		tagName: null,
		compoName: null,
		nodes: null,
		attr: null,
		
		slots: null,
		pipes: null,
		
		compos: null,
		events: null,
		
		onRenderStart: null,
		onRenderEnd: null,
		render: null,
		renderStart: function(model, cntx, container){

			if (arguments.length === 1 && model != null && model instanceof Array === false && model[0] != null){
				model = arguments[0][0];
				cntx = arguments[0][1];
				container = arguments[0][2];
			}

			// - do not override with same model
			//if (this.model == null){
			//	this.model = model;
			//}

			if (this.nodes == null){
				compo_ensureTemplate(this);
			}
			
			if (typeof this.onRenderStart === 'function'){
				this.onRenderStart(model, cntx, container);
			}

		},
		renderEnd: function(elements, model, cntx, container){
			if (arguments.length === 1 && elements instanceof Array === false){
				elements = arguments[0][0];
				model = arguments[0][1];
				cntx = arguments[0][2];
				container = arguments[0][3];
			}

			Anchor.create(this, elements);

			this.$ = domLib(elements);

			if (this.events != null) {
				Events_.on(this, this.events);
			}

			if (this.compos != null) {
				Children_.select(this, this.compos);
			}

			if (typeof this.onRenderEnd === 'function'){
				this.onRenderEnd(elements, model, cntx, container);
			}
		},
		appendTo: function(x) {
			
			var element = typeof x === 'string' ? document.querySelector(x) : x;
			

			if (element == null) {
				console.warn('Compo.appendTo: parent is undefined. Args:', arguments);
				return this;
			}

			for (var i = 0; i < this.$.length; i++) {
				element.appendChild(this.$[i]);
			}

			this.emitIn('domInsert');
			return this;
		},
		append: function(template, model, selector) {
			var parent;

			if (this.$ == null) {
				var dom = typeof template === 'string'
					? mask.compile(template)
					: template;

				parent = selector
					? find_findSingle(this, selector_parse(selector, Dom.CONTROLLER, 'down'))
					: this;
					
				if (parent.nodes == null) {
					this.nodes = dom;
					return this;
				}

				parent.nodes = [this.nodes, dom];

				return this;
			}
			
			var fragment = mask.render(template, model, null, null, this);

			parent = selector
				? this.$.find(selector)
				: this.$;
				
			
			parent.append(fragment);
			
			
			// @todo do not emit to created compos before
			this.emitIn('domInsert');
			
			return this;
		},
		find: function(selector){
			return find_findSingle(this, selector_parse(selector, Dom.CONTROLLER, 'down'));
		},
		closest: function(selector){
			return find_findSingle(this, selector_parse(selector, Dom.CONTROLLER, 'up'));
		},
		on: function() {
			var x = Array.prototype.slice.call(arguments);
			if (arguments.length < 3) {
				console.error('Invalid Arguments Exception @use .on(type,selector,fn)');
				return this;
			}

			if (this.$ != null) {
				Events_.on(this, [x]);
			}


			if (this.events == null) {
				this.events = [x];
			} else if (this.events instanceof Array) {
				this.events.push(x);
			} else {
				this.events = [x, this.events];
			}
			return this;
		},
		remove: function() {
			if (this.$ != null){
				this.$.remove();
				
				var parents = this.parent && this.parent.elements;
				if (parents != null) {
					for (var i = 0, x, imax = parents.length; i < imax; i++){
						x = parents[i];
						
						for (var j = 0, jmax = this.$.length; j < jmax; j++){
							if (x === this.$[j]){
								parents.splice(i, 1);
								
								i--;
								imax--;
							}
							
						}
						
					}
				}
	
				this.$ = null;
			}

			compo_dispose(this);

			var components = this.parent && this.parent.components;
			if (components != null) {
				var i = components.indexOf(this);

				if (i === -1){
					console.warn('Compo::remove - parent doesnt contains me', this);
					return this;
				}

				components.splice(i, 1);
			}
			
			return this;
		},

		slotState: function(slotName, isActive){
			Compo.slot.toggle(this, slotName, isActive);
		},

		signalState: function(signalName, isActive){
			Compo.signal.toggle(this, signalName, isActive);
		},

		emitOut: function(signalName /* args */){
			Compo.signal.emitOut(this, signalName, this, arguments.length > 1 ? __array_slice.call(arguments, 1) : null);
		},

		emitIn: function(signalName /* args */){
			Compo.signal.emitIn(this, signalName, this, arguments.length > 1 ? __array_slice.call(arguments, 1) : null);
		}
	};

	Compo.prototype = Proto;


	return Compo;
}());
