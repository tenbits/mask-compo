(function(){
	
	function _on(cntx, type, callback) {
		if (cntx[type] == null)
			cntx[type] = [];
		
		cntx[type].push(callback);
		
		return cntx;
	}
	
	function _call(cntx, type, _arguments) {
		var cbs = cntx[type];
		if (cbs == null) 
			return;
		
		for (var i = 0, x, imax = cbs.length; i < imax; i++){
			x = cbs[i];
			if (x == null)
				continue;
			
			cbs[i] = null;
			
			if (_arguments == null) {
				x();
				continue;
			}
			
			x.apply(this, _arguments);
		}
	}
	
	
	var DeferProto = {
		done: function(callback){
			return _on(this, '_cbs_done', callback);
		},
		fail: function(callback){
			return _on(this, '_cbs_fail', callback);
		},
		always: function(callback){
			return _on(this, '_cbs_always', callback);
		},
		resolve: function(){
			this.async = false;
			_call(this, '_cbs_done', arguments);
			_call(this, '_cbs_always', arguments);
		},
		reject: function(){
			this.async = false;
			_call(this, '_cbs_fail', arguments);
			_call(this, '_cbs_always');
		}
	};
	
	var CompoProto = {
		async: true,
		await: function(resume){
			this.resume = resume;
		}
	}
	
	Compo.pause = function(compo, ctx){
		
		if (ctx.async == null) {
			ctx.defers = [];
			
			ctx._cbs_done = null;
			ctx._cbs_fail = null;
			ctx._cbs_always = null;
			
			for (var key in DeferProto) {
				ctx[key] = DeferProto[key];
			}
		}
		
		ctx.async = true;
		
		for (var key in CompoProto) {
			compo[key] = CompoProto[key];
		}
		
		ctx.defers.push(compo);
		
		return function(){
			Compo.resume(compo, ctx);
		};
	}
	
	Compo.resume = function(compo, ctx){
		
		// fn can be null when calling resume synced after pause
		if (compo.resume) 
			compo.resume();
		
		compo.async = false;
		
		var busy = false;
		for (var i = 0, x, imax = ctx.defers.length; i < imax; i++){
			x = ctx.defers[i];
			
			if (x === compo) {
				ctx.defers[i] = null;
				continue;
			}
			
			if (busy === false) {
				busy = x != null;
			}
		}
		
		if (busy === false) {
			ctx.resolve();
		}
	};
	
}());