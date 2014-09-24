var compo_inherit;
(function(mask_merge){
	
	compo_inherit = function(Proto, Extends){
		
		var imax = Extends.length,
			i = imax,
			ctors = [],
			x;
		while( --i > -1){
			x = Extends[i];
			if (typeof x === 'string') 
				x = Mask.getHandler(x);
			if (x == null) {
				log_error('Base component not defined', Extends[i]);
				continue;
			}
			if (typeof x === 'function') {
				ctors.push(x);
				x = x.prototype;
			}
			
			inherit_(Proto, x, 'node');
		}
		
		i = -1;
		imax = ctors.length;
		if (imax > 0) {
			if (Proto.hasOwnProperty('constructor')) 
				ctors.unshift(Proto.constructor);
			
			Proto.constructor = joinFns_(ctors);
			
		}
	};
	
	function inherit_(target, source, name){
		if (target == null || source == null) 
			return;
		
		if ('node' === name) {
			var targetNodes = target.template || target.nodes,
				sourceNodes = source.template || source.nodes;
			if (targetNodes == null || sourceNodes == null) {
				target.template = targetNodes || sourceNodes;
			} else {
				target.nodes = mask.merge(sourceNodes, targetNodes, target);
			}
		}
		
		var mix, type, fnAutoCall, hasFnOverrides = false;
		for(var key in source){
			mix = source[key];
			if (mix == null || key === 'constructor')
				continue;
			
			if ('node' === name && (key === 'template' || key === 'nodes')) 
				continue;
			
			type = typeof mix;
			
			if (target[key] == null) {
				target[key] = 'object' === type
					? clone_(mix)
					: mix;
				continue;
			}
			if ('node' === name) {
				// http://jsperf.com/indexof-vs-bunch-of-if
				var isSealed = key === 'renderStart' ||
						key === 'renderEnd' ||
						key === 'emitIn' ||
						key === 'emitOut' ||
						key === 'components' ||
						key === 'nodes' ||
						key === 'template' ||
						key === 'find' ||
						key === 'closest' ||
						key === 'on' ||
						key === 'remove' ||
						key === 'slotState' ||
						key === 'signalState' ||
						key === 'append' ||
						key === 'appendTo'
						;
				if (isSealed === true) 
					continue;
			}
			if ('pipes' === name) {
				inherit_(target[key], mix, 'pipe');
				continue;
			}
			if ('function' === type) {
				fnAutoCall = false;
				if ('slots' === name || 'events' === name || 'pipe' === name)
					fnAutoCall = true;
				else if ('node' === name && ('onRenderStart' === key || 'onRenderEnd' === key)) 
					fnAutoCall = true;
				
				target[key] = createWrapper_(target[key], mix, fnAutoCall);
				hasFnOverrides = true;
				continue;
			}
			if ('object' !== type) {
				continue;
			}
			
			switch(key){
				case 'slots':
				case 'pipes':
				case 'events':
				case 'attr':
					inherit_(target[key], mix, key);
					continue;
			}
			defaults_(target[key], mix);
		}
		
		if (hasFnOverrides === true) {
			if (target.super != null) 
				log_error('`super` property is reserved. Dismissed. Current prototype', target);
			target.super = null;
		}
	}
	
	/*! Circular references are not handled */
	function clone_(a) {
		if (a == null) 
			return null;
		
		if (typeof a !== 'object') 
			return a;
		
		if (is_Array(a)) {
			var imax = a.length,
				i = -1,
				arr = new Array(imax)
				;
			while( ++i < imax ){
				arr[i] = clone_(a[i]);
			}
			return arr;
		}
		
		var object = obj_copy(a),
			key, val;
		for(key in object){
			val = object[key];
			if (val == null || typeof val !== 'object') 
				continue;
			object[key] = clone_(val);
		}
		return object;
	}
	function defaults_(target, source){
		var targetV, sourceV, key;
		for(var key in source){
			targetV = target[key];
			sourceV = source[key];
			if (targetV == null) {
				target[key] = sourceV;
				continue;
			}
			if (is_rawObject(targetV) && is_rawObject(sourceV)){
				defaults_(targetV, sourceV);
				continue;
			}
		}
	}
	function createWrapper_(selfFn, baseFn, autoCallFunctions){
		if (selfFn.name === 'compoInheritanceWrapper') {
			selfFn._fn_chain.push(baseFn);
			return selfFn;
		}
		
		var compileFns = autoCallFunctions === true
			? compileFns_autocall_
			: compileFns_
			;
		function compoInheritanceWrapper(){
			var fn = x._fn || (x._fn = compileFns(x._fn_chain));
			return fn.apply(this, arguments);
		}
		
		var x = compoInheritanceWrapper;
		x._fn_chain = [ selfFn, baseFn ];
		x._fn = null;
		
		return x;
	}
	function compileFns_(fns){
		var i = fns.length,
			fn = fns[ --i ];
		while( --i > -1){
			fn = inheritFn_(fns[i], fn);
		}
		return fn;
	}
	function compileFns_autocall_(fns) {
		var imax = fns.length;
		return function(){
			var result, fn, x,
				i = imax;
			while( --i > -1 ){
				fn = fns[i];
				if (fn == null) 
					continue;
				
				x = fn_apply(fn, this, arguments);
				if (x !== void 0) {
					result = x;
				}
			}
			return result;
		}
	}
	function inheritFn_(selfFn, baseFn){
		return function(){
			this.super = baseFn;
			var x = fn_apply(selfFn, this, arguments);
			
			this.super = null;
			return x;
		};
	}
	function joinFns_(fns) {
		var imax = fns.length;
		return function(){
			var i = imax;
			while( --i > -1 ){
				fns[i].apply(this, arguments);
			}
		};
	}
}(mask.merge));