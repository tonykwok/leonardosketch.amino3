function ThreeScene() {
    this.scene = new THREE.Scene();
    this.renderer = null;
    this.engine = null;
    this.repaint = function() {
        this.dirty = false;
        this.renderer.render( this.scene, this.camera );
    };
    this.add = function(o) {
        if(o instanceof THREE.DirectionalLight) {
            this.scene.add(o);
            return;
        }
        this.scene.add(o.obj);
        o.parent = this;
    };
    
    this.setDirty = function() {
        if(!this.dirty) {
            this.dirty = true;
            if(!this.engine.autoPaint) {
                this.repaint();
            }
        }
    };
}


Amino.prototype.add3DCanvas = function(id) {
    
	var canvasElement = document.getElementById(id);
	var width = canvasElement.clientWidth;
	var height = canvasElement.clientHeight;
	
	sc = new ThreeScene();
	sc.engine = this;
    sc.scene.domWidth = width;
    sc.scene.domHeight = height;
    sc.camera = new THREE.PerspectiveCamera( 70, width/height, 1, 1000 );
    sc.camera.position.y = 150;
    sc.camera.position.z = 500;
    sc.scene.add( sc.camera );
	
    sc.domElement = canvasElement;
    sc.renderer = new THREE.CanvasRenderer();
    sc.renderer.setSize( width, height);
    sc.domElement.appendChild( sc.renderer.domElement );
	this.canvases.push(sc);    
	return sc;
};




function BaseNodeThree() {
    this.parent = null;

    this.setFill = function(color) {
        if(color[0] == '#') {
            color = color.substr(1);
        }
        this.fill = parseInt(color,16);
        return this;
    };
    this.setDirty = function() {
        if(this.parent != null) {
            this.parent.setDirty();
        }
    };
};




function Block() {
    this.geometry = new THREE.CubeGeometry( 200, 200, 200 );
    this.fill = 0xff0000;
    this.obj = null;
    
    this.set = function(w,h,d) {
        this.geometry = new THREE.CubeGeometry( w, h, d);
        return this;
    };
    this.getThreeObj = function() {
        if(this.obj == null) {
            this.material = new THREE.MeshLambertMaterial( { 
                color: this.fill, 
                shading: THREE.FlatShading, 
                overdraw: true });
            this.obj = new THREE.Mesh(this.geometry, this.material);
        }
        return this.obj;
    };
    
}
Block.extend(BaseNodeThree);




function Sphere() {
    this.geometry = new THREE.SphereGeometry(200, 50, 50)    
    this.fill = 0xff0000;
    this.obj = null;
    
    this.set = function(radius, detail) {
        this.geometry = new THREE.SphereGeometry(radius, detail, detail)    
        return this;
    };
    
    this.getThreeObj = function() {
        if(this.obj == null) {
            this.material = new THREE.MeshLambertMaterial( { 
                color: this.fill, 
                //shading: THREE.SmoothShading, 
                shading: THREE.FlatShading, 
                overdraw: true, 
            });
            this.obj = new THREE.Mesh(this.geometry, this.material);
        }
        return this.obj;
    };
    
}
Sphere.extend(BaseNodeThree);




function BeveledPath() {
    var extrudeSettings = {	
        amount: 20,  
        bevelEnabled: true, 
        bevelSegments: 2, 
        steps: 2 };
        
    var sqLength = 200;
    this.squareShape = new THREE.Shape();
    this.squareShape.moveTo( -sqLength,-sqLength );
    this.squareShape.lineTo( -sqLength, sqLength );
    this.squareShape.lineTo( sqLength, sqLength );
    this.squareShape.lineTo( sqLength, -sqLength );
    this.squareShape.lineTo( -sqLength, -sqLength );
    
    this.geometry = this.squareShape.extrude( extrudeSettings );
    this.fill = 0xff0000;
    
    this.obj = null;
    this.getThreeObj = function() {
        if(this.obj == null) {
            this.material = new THREE.MeshLambertMaterial( { 
                color: this.fill, 
                shading: THREE.FlatShading, 
                overdraw: true });
            this.obj = new THREE.Mesh(this.geometry, this.material);
        }            
        return this.obj;
    };
}
BeveledPath.extend(BaseNodeThree);



function Group3() {
    this.obj = new THREE.Object3D();
    this.setPositionY = function(y) {
        this.obj.position.y = y;
        return this;
    };
    this.add = function(o) {
        this.obj.add(o.getThreeObj());
        o.parent = this;
        return this;
    };
    this.setRotateY = function(y) {
        this.obj.rotation.y = y;
        this.setDirty();
        return this;
    };
}
Group3.extend(BaseNodeThree);





function Light3() {
    this.obj = new THREE.DirectionalLight( 0xffffff );
    //directly front light
    this.obj.position.set(1,0.2,0.5);
}

