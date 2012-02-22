function Rect() {
    AminoShape.call(this);
	this.typename = "Rect";
    var self = this;
	this.x = 0;
	this.y = 0;
	this.w = 10;
	this.h = 10;
	
	this.setX = function(x) {
	    this.x = x;
	    return this;
	};
	this.getX = function() {
	    return this.x;
	}
	this.setY = function(y) {
	    this.y = y;
	    return this;
	};
	this.getY = function() {
	    return this.y;
	}
	
	this.fillShape = function(ctx) {
	    ctx.fillRect(self.x,self.y,self.w,self.h);
	}
	this.set = function(x,y,w,h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        return this;
    }
    
    this.contains = function(pt) {
        if(pt.x >= this.x && pt.x <= this.x + this.w) {
            if(pt.y >= this.y && pt.y<=this.y + this.h) {
                return true;
            }
        }
        return false;
    }
	return this;
}
Rect.extend(AminoShape);






function Text() {
    AminoShape.call(this);
	this.x = 0;
	this.y = 0;
	
	this.setX = function(x) {
	    this.x = x;
	    return this;
	};
	this.getX = function() {
	    return this.x;
	}
	this.setY = function(y) {
	    this.y = y;
	    return this;
	};
	this.getY = function() {
	    return this.y;
	}
	
	this.text = "random text";
	return this;
}
Text.extend(AminoShape);
Text.prototype.set = function(text,x,y) {
	this.x = x;
	this.y = y;
	this.text = text;
	return this;
}
Text.prototype.setText = function(text) {
    this.text = text;
    return this;
}
Text.prototype.setFont = function(font) {
    this.font = font;
    return this;
}
Text.prototype.fillShape = function(g) {
	g.fillStyle = this.fill;
	g.font = "12pt sans-serif";
	g.fillText(this.text,this.x,this.y);
}
Text.prototype.contains = function(pt) {
	return false;
}



function Circle() {
    AminoShape.call(this);
	this.x = 0;
	this.y = 0;
	this.radius = 10;
	return this;
}
Circle.extend(AminoShape);
Circle.prototype.set = function(x,y,radius) {
	this.x = x;
	this.y = y;
	this.radius = radius;
	return this;
}
Circle.prototype.fillShape = function(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2, true); 
    ctx.closePath();
    ctx.save();
    ctx.fill();
    ctx.restore();
}



// ===================== Path and PathNode

var SEGMENT_MOVETO = 1;
var SEGMENT_LINETO = 2;
var SEGMENT_CLOSETO = 3;
var SEGMENT_CURVETO = 4;
function Segment(kind,x,y,a,b,c,d) {
    this.kind = kind;
    this.x = x;
    this.y = y;
    if(kind == SEGMENT_CURVETO) {
        this.cx1 = x;
        this.cy1 = y;
        this.cx2 = a;
        this.cy2 = b;
        this.x = c;
        this.y = d;
    }
};

/*
@class Path A Path is a sequence of line and curve segments. It is used for drawing arbitrary shapes and animating.  Path objects are immutable. You should create them and then reuse them.
@category resource
*/
function Path() {
    this.segments = [];
    this.closed = false;
    
    //@doc jump directly to the x and y. This is usually the first thing in your path.
    this.moveTo = function(x,y) { 
        this.segments.push(new Segment(SEGMENT_MOVETO,x,y)); 
        return this; 
    };
    
    //@doc draw a line from the previous x and y to the new x and y.
    this.lineTo = function(x,y) { 
        this.segments.push(new Segment(SEGMENT_LINETO,x,y)); 
        return this; 
    };
    
    //@doc close the path. It will draw a line from the last x,y to the first x,y if needed.
    this.closeTo = function(x,y) {
        this.segments.push(new Segment(SEGMENT_CLOSETO,x,y)); 
        this.closed = true;
        return this;
    };
    
    //@doc draw a beizer curve from the previous x,y to a new point (x2,y2) using the four control points (cx1,cy1,cx2,cy2).
    this.curveTo = function(cx1,cy1,cx2,cy2,x2,y2) {
        this.segments.push(new Segment(SEGMENT_CURVETO,cx1,cy1,cx2,cy2,x2,y2));
        return this;
    };
    
    //@doc build the final path object.
    this.build = function() {
        return this;
    };
    
    this.pointAtT = function(fract) {
        if(fract >= 1.0 || fract < 0) return [0,0];

        var segIndex = 0;
        segIndex = Math.floor(fract*(this.segments.length-1));
        var segFract = (fract*(this.segments.length-1))-segIndex;
        //console.log("seg index = " + (segIndex+1) + " f=" + fract + " sgf=" + segFract);// + " type=" + this.segments[segIndex+1].kind);
        var seg = this.segments[segIndex+1];
        var prev;
        var cur;
        switch (seg.kind) {
            case SEGMENT_MOVETO: return [0,0];
            case SEGMENT_LINETO:
                prev = this.segments[segIndex];
                cur = seg;
                return this.interpLinear(prev.x,prev.y,cur.x,cur.y,segFract);
            case SEGMENT_CURVETO:
                prev = this.segments[segIndex];
                cur = seg;
                return this.interpCurve(prev.x,prev.y,cur.cx1,cur.cy1,cur.cx2,cur.cy2, cur.x, cur.y,segFract);
            case SEGMENT_CLOSETO:
                prev = this.segments[segIndex];
                cur = this.segments[0];
                return this.interpLinear(prev.x,prev.y,cur.x,cur.y,segFract);
        }
        return [10,10];
    };

    this.interpLinear = function(x1, y1, x2, y2, fract) {
        return [ (x2-x1)*fract + x1, (y2-y1)*fract + y1 ];
    }
    
    this.interpCurve = function( x1, y1, cx1, cy1, cx2, cy2, x2, y2, fract) {
        return getBezier(fract, [x2,y2], [cx2,cy2], [cx1,cy1], [x1,y1] );
    }
    
    return true;
};

function B1(t) { return t*t*t; }
function B2(t) { return 3*t*t*(1-t); }
function B3(t) { return 3*t*(1-t)*(1-t); }
function B4(t) { return (1-t)*(1-t)*(1-t); }
function getBezier(percent, C1, C2, C3, C4) {
    var pos = [];
    pos[0] = C1[0]*B1(percent) + C2[0]*B2(percent) + C3[0]*B3(percent) + C4[0]*B4(percent);
    pos[1] = C1[1]*B1(percent) + C2[1]*B2(percent) + C3[1]*B3(percent) + C4[1]*B4(percent);
    return pos;
}


/*
@class PathNode  Draws a path.
@category shape
*/
function PathNode() {
    AminoShape.call(this);
    //@property path  the Path to draw
    this.path = null;
    this._bounds = null;
    
    this.setPath = function(path) {
        this.path = path;
        this._bounds = null;
        this.setDirty();
        return this;
    };
    this.getPath = function() {
        return this.path;
    };
    /*
    this.getVisualBounds = function() {
        if(this._bounds == null) {
            var l = 10000;
            var r = -10000;
            var t = 10000;
            var b = -10000;
            for(var i=0; i<this.path.segments.length; i++) {
                var s = this.path.segments[i];
                if(s.kind == SEGMENT_MOVETO) {
                    l = Math.min(l,s.x);
                    t = Math.min(t,s.y);
                    r = Math.max(r,s.x);
                    b = Math.max(b,s.y);
                }
                    
                //ctx.moveTo(s.x,s.y);
                if(s.kind == SEGMENT_LINETO) {
                    //ctx.lineTo(s.x,s.y);
                    l = Math.min(l,s.x);
                    t = Math.min(t,s.y);
                    r = Math.max(r,s.x);
                    b = Math.max(b,s.y);                    
                }
                //                if(s.kind == SEGMENT_CURVETO)
                //                    ctx.bezierCurveTo(s.cx1,s.cy1,s.cx2,s.cy2,s.x,s.y);
                //                if(s.kind == SEGMENT_CLOSETO)
                //                    ctx.closePath();
            }
            this._bounds = new Bounds(l,t,r-l,b-t);
            //console.log("calced path bounds = " + this._bounds);
        }
        return this._bounds;
    }
    */
    return true;
}
PathNode.extend(AminoShape);

PathNode.prototype.fillShape = function(ctx) {
    ctx.beginPath();
    for(var i=0; i<this.path.segments.length; i++) {
        var s = this.path.segments[i];
        if(s.kind == SEGMENT_MOVETO) 
            ctx.moveTo(s.x,s.y);
        if(s.kind == SEGMENT_LINETO) 
            ctx.lineTo(s.x,s.y);
        if(s.kind == SEGMENT_CURVETO)
            ctx.bezierCurveTo(s.cx1,s.cy1,s.cx2,s.cy2,s.x,s.y);
        if(s.kind == SEGMENT_CLOSETO)
            ctx.closePath();
    }
    if(this.path.closed) {
        ctx.fill();
    }
}



function Ellipse() {
    AminoShape.call(this);
    var self = this;
    
    //@property x  The X coordinate of the *center* of the ellipse (not it's left edge)
    this.x = 0.0;
    this.getX = function() { return this.x; };
    this.setX = function(x) { this.x = x; this.setDirty(); return this; };

    //@property y  The Y coordinate of the *center* of the ellipse (not it's top edge)
    this.y = 0.0;
    this.getY = function() { return this.y; };
    this.setY = function(y) { this.y = y; this.setDirty(); return this; };

    //@property width The width of the ellipse.
    this.width = 20;
    this.getWidth = function() { return this.width; };
    this.setWidth = function(width) { this.width = width; this.setDirty(); return this; };

    //@property height The height of the ellipse.
    this.height = 10;
    this.getHeight = function() { return this.height; };
    this.setHeight = function(height) { this.height = height; this.setDirty(); return this; };


    //@method Set the x, y, w, h at the same time.
    this.set = function(x,y,w,h) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        this.setDirty();
        return this;
    };
    
    this.fillShape = function(ctx) {
        var hB = (self.width / 2) * .5522848
        var vB = (self.height / 2) * .5522848
        var aX = self.x;
        var aY = self.y;
        var eX = self.x + self.width;
        var eY = self.y + self.height;
        var mX = self.x + self.width / 2;
        var mY = self.y + self.height / 2;
        ctx.beginPath();
        ctx.moveTo(aX, mY);
        ctx.bezierCurveTo(aX, mY - vB, mX - hB, aY, mX, aY);
        ctx.bezierCurveTo(mX + hB, aY, eX, mY - vB, eX, mY);
        ctx.bezierCurveTo(eX, mY + vB, mX + hB, eY, mX, eY);
        ctx.bezierCurveTo(mX - hB, eY, aX, mY + vB, aX, mY);
        ctx.closePath();
        ctx.save();
        ctx.fill();
        ctx.restore();
    };
    return true;
};
Ellipse.extend(AminoShape);



function ImageView(url) {
    AminoNode.call(this);
    var self = this;
    this.typename = "ImageView";
    if(url instanceof Image) {
        this.img = url;
        this.loaded = true;
        this.width = url.width;
        this.height = url.height;
    } else {
        this.src = url;
        this.img = new Image();
        this.loaded = false;
        this.width = 10;
        this.height = 10;
        this.img.onload = function() {
            console.log("loaded");
            self.loaded = true;
            self.setDirty();
            self.width = self.img.width;
            self.height = self.img.height;
        }
        this.img.src = url;
    }
    
    //@property x  The Y coordinate of the upper left corner of the image.
    this.x = 0.0;
    this.setX = function(x) { this.x = x;   this.setDirty();  return this;  };
    this.getX = function() { return this.x; };
    
    //@property y  The Y coordinate of the upper left corner of the image.
    this.y = 0.0;
    this.setY = function(y) {  this.y = y;  this.setDirty();  return this;  };
    this.getY = function() { return this.y; };
    
    this.paint = function(ctx) {
        //self.loaded = false;
        if(self.loaded) {
            ctx.drawImage(self.img,self.x,self.y);
        } else {
            ctx.fillStyle = "red";
            ctx.fillRect(self.x,self.y,100,100);
        }
    };
    
    this.contains = function(pt) {
 //       console.log("image checking contains " + JSON.stringify(pt));
//        console.log("x = " + self.x + " " + self.y + " " + self.w + " " + self.h);
        if(pt.x >= self.x && pt.x <= self.x + self.width) {
            if(pt.y >= self.y && pt.y<=self.y + self.height) {
                return true;
            }
        }
        return false;
    }
    return true;
};
ImageView.extend(AminoNode);






// =========== Paints ===========
function LinearGradientFill(x,y,width,height) {
    var self = this;
    self.x = x;
    self.y = y;
    self.width = width;
    self.height = height;
    self.offsets = [];
    self.colors = [];
    self.addStop = function(offset, color) {
        self.offsets.push(offset);
        self.colors.push(color);
        return self;
    };
    self.generate = function(ctx) {
        var grad = ctx.createLinearGradient(
                self.x,self.y,
                self.width,self.height);
        for(var i in self.offsets) {
            grad.addColorStop(self.offsets[i],self.colors[i]);
        }
        return grad;
    }
};



function RadialGradientFill(x,y,radius) {
    var self = this;
    self.x = x;
    self.y = y;
    self.radius = radius;
    self.offsets = [];
    self.colors = [];
    self.addStop = function(offset, color) {
        self.offsets.push(offset);
        self.colors.push(color);
        return self;
    };
    self.generate = function(ctx) {
        var grad = ctx.createRadialGradient(self.x,self.y, 0, self.x, self.y, self.radius);
        for(var i in self.offsets) {
            grad.addColorStop(self.offsets[i],self.colors[i]);
        }
        return grad;
    }
};

function PatternFill(url, repeat) {
    var self = this;
    
    this.src = url;
    this.img = new Image();
    this.loaded = false;
    this.repeat = repeat;
    this.img.onload = function() {
        self.loaded = true;
        if(self.can != null) {
            self.can.setDirty();
        }
    };
    this.can = null;
    this.img.src = self.src;
    this.generate = function(ctx) {
        self.can = ctx.can;
        if(!self.loaded) {
            return "red";
        }
        return ctx.createPattern(self.img, self.repeat);
    };
    return true;
}

