/*
@overview Amino: JavaScript Scenegraph

Amino is a scenegraph for drawing 2D graphics in JavaScript with the
HTML 5 Canvas API. By creating a tree of nodes, you can draw shapes, text, images special effects; complete with transforms and animation.
Amino takes care of all rendering, animation, and event handling
so you can build *rich* interactive graphics with very little code.
Using Amino is much more convenient than writing canvas code by hand.

Here's a quick example:    

    <canvas id="can" width="200" height="200"></canvas>
    <script>
    
    //attach a runner to the canvas
    var can = document.getElementById("can");
    var runner = new Runner().setCanvas(can);
    
    //create a rect and a circle
    var r = new Rect().set(0,0,50,50).setFill("green");
    var c = new Circle().set(100,100,30).setFill("blue");
    
    //add the shapes to a group
    var g = new Group().add(r).add(c);
    
    //make the rectangle go left and right every 5 seconds
    var anim = new Anim(g,"x",0,150,5);
    runner.addAnim(anim);
    
    //set the group as the root of the scenegraph, then start
    runner.root = g;
    runner.start();
    
    </script>

A note on properties. Most objects have properties like `x` or `width`.
Properties are accessed with getters.  For example, to access the `width`
property on a rectangle, call `rect.getWidth()`. Properties are set 
with setters. For example, to set the `width` property
on a rectangle, call `rect.setWidth(100)`. Most functions, especially 
property setters, are chainable. This means you
can set a bunch of properties at once like this:

    var c = new Rect()
        .setX(50)
        .setY(50)
        .setWidth(100)
        .setHeight(200)
        .setFill("green")
        .setStrokeWidth(5)
        .setStroke("black")
        ;
    
@end
*/


(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = 
          window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
 
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());


function attachEvent(node,name,func) {
    //self.masterListeners.push(func);
    if(node.addEventListener) {
        node.addEventListener(name,func,false);
    } else if(node.attachEvent) {
        node.attachEvent(name,func);
    }
};

// 'extend' is From Jo lib, by Dave Balmer
// syntactic sugar to make it easier to extend a class
Function.prototype.extend = function(superclass, proto) {
	// create our new subclass
	this.prototype = new superclass();
	/*

	// optional subclass methods and properties
	if (proto) {
		for (var i in proto)
			this.prototype[i] = proto[i];
	}
	*/
};



/*
@class Amino The engine that drives the whole system. 
You generally only need one of these per page.
@end
*/




function Amino() {
	this.canvases = [];
	this.anims = [];
	this.timeout = 1000/30;
	this.autoPaint = false;
}

Amino.prototype.addCanvas = function(id) {
	var canvasElement = document.getElementById(id);
	var canvas = new Canvas(this,canvasElement);
	this.canvases.push(canvas);
	return canvas;
}

Amino.prototype.addAnim = function(anim) {
	anim.engine = this;
	this.anims.push(anim);
}

Amino.prototype.start = function() {
    var self = this;
    var rp = function() {
        self.repaint();
        window.requestAnimationFrame(rp);
    }
    
	if(this.autoPaint) {
		rp();
	} else {
		//just paint once
		this.repaint();
	}
}

Amino.prototype.repaint = function() {
	//console.log("REPAINT. canvas count = " + this.canvases.length);
	
	var animRunning = false;
	for(var i=0; i<this.anims.length; i++) {
		var anim = this.anims[i];
		if(anim.playing) animRunning = true;
		anim.update();
	}
	
	for(var i=0; i<this.canvases.length; i++) {
		this.canvases[i].repaint();
	}
	
	//console.log("still running. need to do another repaint");
	if(animRunning && !this.autoPaint) {
		var self = this;
		var rp = function() {
			self.repaint();
		}
		window.requestAnimationFrame(rp);
	}
}


Amino.prototype.animationChanged = function() {
	this.repaint();
}

/*
@class Canvas represents a drawable area on the screen, usually
a canvas tag.
@end
*/

function Canvas(engine,domCanvas) {
	this.engine = engine;
	this.domCanvas = domCanvas;
	this.nodes = [];
	this.listeners = [];
	this.mousePressed = false;
	this.bgfill = "white";
	this.transparent = false;
	var self = this;
    attachEvent(domCanvas,'mousedown',function(e){
    	e.preventDefault();
        var point = self.calcLocalXY(domCanvas,e);
        self.mousePressed = true;
        var node = self.findNode(point);
    	//console.log("mouse down on the canvas at " + JSON.stringify(point) + "  on " + node.typename + " " + node.hashcode);
    	//console.log("lenth = " + self.listeners.length);
    	for(var i=0; i<self.listeners.length; i++) {
    		var listener = self.listeners[i];
    		//console.log("looking at " + listener.node.typename + " " + node.typename + " " + (listener.node.hashcode == node.hashcode));
    		if(listener.node === node) {
    		    if(listener.type == "press") {
    		        listener.fn({point:point,target:node});
    		    }
    		}
    	}
    });
    
    attachEvent(domCanvas,'mousemove',function(e){
        if(!self.mousePressed) return;
    	e.preventDefault();
        var point = self.calcLocalXY(domCanvas,e);
        self.mousePressed = true;
        var node = self.findNode(point);
    	//console.log("mouse down on the canvas at " + JSON.stringify(point) + "  on " + node.typename + " " + node.hashcode);
    	//console.log("lenth = " + self.listeners.length);
    	for(var i=0; i<self.listeners.length; i++) {
    		var listener = self.listeners[i];
    		//console.log("looking at " + listener.node.typename + " " + node.typename + " " + (listener.node.hashcode == node.hashcode));
    		if(listener.node === node) {
    		    if(listener.type == "drag") {
    		        listener.fn({point:point,target:node});
    		    }
    		}
    	}
    });
    
    attachEvent(domCanvas,'mouseup',function(e){
    	e.preventDefault();
        var point = self.calcLocalXY(domCanvas,e);
        self.mousePressed = false;
        var node = self.findNode(point);
    	//console.log("mouse up on the canvas at " + JSON.stringify(point) + "  on " + node.typename);
    	for(var i=0; i<self.listeners.length; i++) {
    		var listener = self.listeners[i];
    		if(listener.node == node) {
   				if(listener.type == "release") {
    				listener.fn({point:point,target:node});
    			}
   				if(listener.type == "click") {
    				listener.fn({point:point,target:node});
    			}
    		}
    	}
    });
    
    this.calcLocalXY = function(canvas,event) {
        var docX = -1;
        var docY = -1;
        if (event.pageX == null) {
            // IE case
            var d= (document.documentElement && document.documentElement.scrollLeft != null) ?
                 document.documentElement : document.body;
             docX= event.clientX + d.scrollLeft;
             docY= event.clientY + d.scrollTop;
        } else {
            // all other browsers
            docX= event.pageX;
            docY= event.pageY;
        }        
        docX -= canvas.offsetLeft;
        docY -= canvas.offsetTop;
        return {x:docX,y:docY};
    };		
    
    
    this.findNode = function(point) {
    	//go in reverse, ie: front to back
    	for(var i=this.nodes.length-1; i>=0; i--) {
    		var node = this.nodes[i];
    		if(node && node.isVisible() && node.contains(point)) {
    		    console.log("returning: " + node.typename);
    			return node;
    		}
    		
    		if(node instanceof Group && node.isVisible()) {
    		    var r = this.searchGroup(node,point);
    		    if(r) {
    		        console.log("returning: " + r.typename);
    		        return r;
    		    }
    		}
    	}
	    console.log("returning: " + null);
    	return null;
    }
    
    this.searchGroup = function(group,point) {
        console.log("searching: " + group.typename + " " + JSON.stringify(point));
        point = {x:point.x-group.getX(), y:point.y-group.getY() };
        for(var j=group.children.length-1; j>=0; j--) {
            var node = group.children[j];
            console.log("  child = " + node.typename + " " + JSON.stringify(point));
            console.log("    contains = " + node.contains(point));
            if(node && node.isVisible() && node.contains(point)) {
                return node;
            }
            if(node instanceof Group && node.isVisible()) {
    		    var r = this.searchGroup(node,point);
    		    if(r) return r;
            }
        }
        return null;
    }
}


Canvas.prototype.repaint = function() {
	//console.log("repainting canvas '" + this.domCanvas.id + "' node count =  " + this.nodes.length);
	var ctx = this.domCanvas.getContext('2d');
	this.width = this.domCanvas.width;
	this.height = this.domCanvas.height;
	ctx.fillStyle = this.bgfill;
	if(!this.transparent) {
	    ctx.fillRect(0,0,this.width,this.height);
	}
	
	ctx.can = this;
	ctx.engine = this.engine;
	
	ctx.save();
	//ctx.rect(0,0,100,100);
	//ctx.clip();
	for(var i=0; i<this.nodes.length; i++) {
		var node = this.nodes[i];
		node.paint(ctx);
	}
	ctx.restore();
	this.dirty = false;
	
}

Canvas.prototype.setBackground = function(bgfill) {
    this.bgfill = bgfill;
}
Canvas.prototype.setTransparent = function(transparent) {
    this.transparent = transparent;
}
//@function add Adds a node to this canvas.
Canvas.prototype.add = function(node) {
	this.nodes.push(node);
	node.parent = this;
}
Canvas.prototype.onClick = function(node,fn) {
	this.listeners.push({
		type:'click'
		,node:node
		,fn:fn
	});
}
Canvas.prototype.onPress = function(node,fn) {
    console.log('adding: ' + node.hashcode);
	this.listeners.push({
		type:'press'
		,node:node
		,fn:fn
	});
}
Canvas.prototype.onRelease = function(node,fn) {
	this.listeners.push({
		type:'release'
		,node:node
		,fn:fn
	});
}
Canvas.prototype.onDrag = function(node,fn) {
	this.listeners.push({
		type:'drag'
		,node:node
		,fn:fn
	});
}
Canvas.prototype.onMomentumDrag = function(node,fn) {
	this.listeners.push({
		type:'momentumdrag'
		,node:node
		,fn:fn
	});
}
Canvas.prototype.setDirty = function() {
	if(!this.dirty) {
		this.dirty = true;
		if(!this.engine.autoPaint) {
			this.repaint();
		}
	}
}




function AminoNode() {
    var self = this;
	this.parent = null;
	this.typename = "AminoNode";
	this.hashcode = Math.random();
	this.setParent = function(parent) {
	    this.parent = parent;
	    return this;
	}
	this.visible = true;
	this.setVisible = function(visible) {
	    this.visible = visible;
	    return this;
	}
	this.isVisible = function() {
	    return this.visible;
	}
	this.setDirty = function() {
        if(self.parent != null) {
            self.parent.setDirty();
        }
    }
}


function AminoShape() {
    AminoNode.call(this);
	var self = this;
	this.typename = "AminoShape";
	this.fill = "gray";
	this.stroke = "black";
	this.strokeWidth = 1;
	this.setFill = function(fill) {
	    self.fill = fill;
	    self.setDirty();
	    return self;
	}
	this.paint = function(ctx) {
        if(self.fill.generate) {
            ctx.fillStyle = self.fill.generate(ctx);
        } else {
            ctx.fillStyle = self.fill;
        }
        self.fillShape(ctx);
    }
}
AminoShape.extend(AminoNode);

AminoShape.prototype.getFill = function() {
	return this.fill;
}
AminoShape.prototype.setStroke = function(stroke) {
	this.stroke = stroke;
	this.setDirty();
	return this;
}
AminoShape.prototype.getStroke = function() {
    return this.stroke;
}
AminoShape.prototype.setStrokeWidth = function(strokeWidth) {
	this.strokeWidth = strokeWidth;
	this.setDirty();
	return this;
}
AminoShape.prototype.getStrokeWidth = function() {
    return this.strokeWidth;
}
AminoShape.prototype.contains = function(ctx) {
    return false;
}







function Transform(n) {
    this.node = n;
    this.node.parent = this;
   	this.typename = "Transform";
    var self = this;
    
    //@property translateX translate in the X direction
    this.translateX = 0;
    this.setTranslateX = function(tx) {
        self.translateX = tx;
        self.setDirty();
        return self;
    };
    this.getTranslateX = function() {
        return this.translateX;
    };
    
    //@property translateY translate in the Y direction
    this.translateY = 0;
    this.setTranslateY = function(ty) {
        this.translateY = ty;
        this.setDirty();
        return this;
    };
    this.getTranslateY = function() {
        return this.translateY;
    };
    
    //@property scaleX scale in the X direction
    this.scaleX = 1;
    this.setScaleX = function(sx) {
        this.scaleX = sx;
        this.setDirty();
        return this;
    };
    this.getScaleX = function() {
        return this.scaleX;
    };
        
        
    //@property scaleY scale in the X direction
    this.scaleY = 1;
    this.setScaleY = function(sy) {
        this.scaleY = sy;
        this.setDirty();
        return this;
    };
    this.getScaleY = function() {
        return this.scaleY;
    };
    
    //@property anchorX scale in the X direction
    this.anchorX = 0;
    this.setAnchorX = function(sx) {
        this.anchorX = sx;
        this.setDirty();
        return this;
    };
    this.getAnchorX = function() {
        return this.anchorX;
    };
        
        
    //@property anchorY scale in the X direction
    this.anchorY = 0;
    this.setAnchorY = function(sy) {
        this.anchorY = sy;
        this.setDirty();
        return this;
    };
    this.getAnchorY = function() {
        return this.anchorY;
    };
    
    //@property rotate set the rotation, in degrees
    this.rotate = 0;
    this.setRotate = function(rotate) {
        this.rotate = rotate;
        this.setDirty();
        return this;
    };
    this.getRotate = function() {
        return this.rotate;
    };
    
    
    
    /* container stuff */
    this.contains = function(x,y) {
        return false;
    };
    this.hasChildren = function() {
        return true;
    };
    this.childCount = function() {
        return 1;
    };
    this.getChild = function(n) {
        return this.node;
    };
    

    this.paint = function(ctx) {
        ctx.save();
        ctx.translate(self.translateX,self.translateY);
        ctx.translate(self.anchorX,self.anchorY);
        var r = this.rotate % 360;
        ctx.rotate(r*Math.PI/180.0,0,0);
        if(self.scaleX != 1 || self.scaleY != 1) {
            ctx.scale(self.scaleX,self.scaleY);
        }
        ctx.translate(-self.anchorX,-self.anchorY);
        self.node.paint(ctx);
        ctx.restore();
    };
    
    return true;
}
Transform.extend(AminoNode);

Transform.prototype.setDirty = function() {
	if(this.parent != null) {
		this.parent.setDirty();
	}
}


/*
@class Group A parent node which holds an ordered list of child nodes. It does not draw anything by itself, but setting visible to false will hide the children.
@category shape
*/

function Group() {
    AminoNode.call(this);
	this.typename = "Group";
    this.children = [];
    this.parent = null;
    var self = this;
    
    //@property x set the x coordinate of the group.
    this.x = 0;
    this.setX = function(x) {
        self.x = x;
        self.setDirty();
        return self;
    };
    this.getX = function() {
        return self.x;
    };
    
    //@property y set the y coordinate of the group.
    this.y = 0;
    this.setY = function(y) {
        self.y = y;
        self.setDirty();
        return self;
    };
    this.getY = function() {
        return self.y;
    };
    
    this.opacity = 1.0;
    this.setOpacity = function(o) {
        self.opacity = o;
        return self;
    };
    this.getOpacity = function() {
        return self.opacity;
    };
    
    //@method Add the child `n` to this group.
    this.add = function(n) {
        self.children[self.children.length] = n;
        n.setParent(self);
        self.setDirty();
        return self;
    };
    //@method Remove the child `n` from this group.
    this.remove = function(n) {
        var i = self.children.indexOf(n);
        if(i >= 0) {
            self.children.splice(i,1);
            n.setParent(null);
        }
        self.setDirty();
        return self;
    };
    
    this.paint = function(ctx) {
        if(!self.isVisible()) return;
        var ga = ctx.globalAlpha;
        ctx.globalAlpha = self.opacity;
        ctx.translate(self.x,self.y);
        for(var i=0; i<self.children.length;i++) {
            self.children[i].paint(ctx);
        }
        ctx.translate(-self.x,-self.y);
        ctx.globalAlpha = ga;
    };
    //@method Remove all children from this group.
    this.clear = function() {
        self.children = [];
        self.setDirty();
        return self;
    };
    //@method Always returns false. You should call contains on the children instead.
    this.contains = function(x,y) {
        return false;
    };
    //@method Always returns true, whether or not it actually has children at the time.
    this.hasChildren = function() {
        return true;
    };
    //@method Convert the `x` and `y` in to child coordinates.
    this.convertToChildCoords = function(x,y) {
        return [x-self.x,y-self.y];
    };
    //@method Returns the number of child nodes in this group.
    this.childCount = function() {
        return self.children.length;
    };
    //@method Returns the child node at index `n`.
    this.getChild = function(n) {
        return self.children[n];
    };
    
    return true;
};
Group.extend(AminoNode, {});





/* ============= Animation ================= */

function PropAnim(node,prop,startValue,end,duration) {
	this.isdom = false;
	if(node instanceof Element) {
		this.isdom = true;
	}
	this.node = node;
	this.prop = prop;
	this.startValue = startValue;
	this.end = end;
	this.duration = duration;
	this.value = -1;
	this.started = false;
	this.playing = false;
	this.loop = false;
	return this;
}

PropAnim.prototype.update = function() {
	if(!this.playing) return;
	if(!this.started) {
		this.started = true;
		this.value = this.startValue;
		this.startTime = new Date().getTime();
	}
	
	var currentTime = new Date().getTime();
	var dur = currentTime-this.startTime;
	if(dur > this.duration*1000) {
		this.started = false;
		if(!this.loop) {
		    this.playing = false;
		}
		return;
	}
	
	var t = (currentTime-this.startTime)/(this.duration*1000);
	//	console.log("t = " + t);
	
	var val = this.startValue + t*(this.end-this.startValue);
	if(this.isdom) {
		this.node.style[this.prop] = (val+"px");
	} else {
	    var fun = "set"
	        +this.prop[0].toUpperCase()
	        +this.prop.slice(1);
		this.node[fun](val);
		//this.node.setDirty();
		//console.log("set the prop " + fun);
	}
}
PropAnim.prototype.toggle = function() {
	this.playing = !this.playing;
	this.engine.animationChanged();
}
PropAnim.prototype.start = function() {
	this.playing = true;
    if(this.engine) {
        this.engine.animationChanged();
    }
    return this;
}


function CallbackAnim() {
    this.started = false;
    this.playing = false;
    this.callback = null;
    this.engine = null;
    return this;
}
CallbackAnim.prototype.update = function() {
	if(!this.started) {
		this.started = true;
	}
	if(this.callback) {
	    this.callback();
	}
}
CallbackAnim.prototype.start = function() {
    this.playing = true;
    if(this.engine) {
        this.engine.animationChanged();
    }
}


