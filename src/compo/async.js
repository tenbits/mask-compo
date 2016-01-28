(function(){
	Compo.pause = function(compo, ctx){
		if (ctx != null) {
			if (ctx.defers == null) {
				// async components
				ctx.defers = [];
			}
			if (ctx.resolve == null) {
				obj_extend(ctx, class_Dfr.prototype);
			}
			ctx.async = true;
			ctx.defers.push(compo);
			ctx.defer();
		}

		obj_extend(compo, CompoProto);
		return function(){
			Compo.resume(compo, ctx);
		};
	};
	Compo.resume = function(compo, ctx){
		compo.async = false;

		// fn can be null when calling resume synced after pause
		if (compo.resume) {
			compo.resume();
		}
		if (ctx == null) {
			return;
		}

		var busy = false,
			dfrs = ctx.defers,
			imax = dfrs.length,
			i = -1,
			x;
		while ( ++i < imax ){
			x = dfrs[i];

			if (x === compo) {
				dfrs[i] = null;
				continue;
			}
			busy = busy || x != null;
		}
		if (busy === false)
			ctx.resolve();
	};

	Compo.await = function (compo) {
		return (new Awaiter).await(compo);
	}

	var CompoProto = {
		async: true,
		resume: null,
		await: function(resume, deep){
			if (deep === true) {
				Compo.await(this).then(resume);
				return;
			}
			if (this.async === false) {
				resume();
				return;
			}
			if (this.resume == null) {
				this.resume = resume;
				return;
			}
			var fn = this.resume;			
			this.resume = function(){
				fn.call(this);
				resume.call(this);
			};
		}
	};

	var Awaiter;
	(function(){
		Awaiter = class_create(class_Dfr, {
			isReady: false,
			count: 0,
			constructor: function(){
				this.dequeue = this.dequeue.bind(this);
			},
			enqueue: function(){
				this.count++;
			},
			dequeue: function(){
				if (--this.count === 0 && this.isReady === true) {
					this.resolve();
				}
			},
			await: function(compo) {
				awaitDeep(compo, this);
				if (this.count === 0) {
					this.resolve();
					return this;
				}
				this.isReady = true;
				return this;
			}
		});
		function awaitDeep(compo, awaiter){
			if (compo.async === true) {
				awaiter.enqueue();
				compo.await(awaiter.dequeue);
				return;
			}
			var arr = compo.components;
			if (arr == null)
				return;

			var imax = arr.length,
				i = -1;
			while(++i) {
				awaitDeep(arr[i], awaiter);
			}
		}
	}());
}());