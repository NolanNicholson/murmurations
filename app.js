const vertexShaderText = `
precision mediump float;

attribute vec3 vertPosition;
attribute vec3 vertColor;

varying vec3 fragColor;

void main()
{
   fragColor = vertColor;
   gl_Position = vec4(vertPosition, 1.0);
}`;

const fragmentShaderText = `
precision mediump float;

varying vec3 fragColor;

void main()
{
   gl_FragColor = vec4(fragColor, 1.0);
}`;


function Bird(id, x, y, vx, vy, r, g, b) {
    // ID
    this.id = id;
    // Position
    this.x = x;
    this.y = y;
    // Velocity
    this.vx = vx;
    this.vy = vy;
    // Color
    this.r = r;
    this.g = g;
    this.b = b;
    // Angle
    this.angle = 0; // will overwrite during update

    // Sight distance as a proportion of the whole view plane (1 or more = all birds)
    this.sightDistance = 0.1;
    // Repulsive distance to prevent birds from clumping
    this.repulsiveDistance = 0.02;
    this.repulsiveAngularAccel = 0.05;

    // Social force. 1 corresponds to directly matching neighbors; any more will be divergent!
    // Not currently used - see this.socialAngularAccel
    // this.socialForce = 0.01;
    // Fixed velocity for angular acceleration
    this.fixedVelocity = 0.01;
    this.socialAngularAccel = 0.005;
    // Parameters for keeping in bounds
    this.returnHomeBorder = 0.6;
    this.returnHomeSpring = 0.006;

    this.angleDiff = 0;

    // The inherent triangle shape, before any rotations or translations
    this.baseTriangle = [
        // X, Y, Z
        0.02, 0.00, 0.00,
        -0.02, 0.01, 0.00,
        -0.02, -0.01, 0.00,
    ];

    // The rotated triangle
    this.rotatedTriangle = [];
    // The final triangle shape that gets uploaded to the buffer
    this.vertexCoords = [];

    this.updateBehavior = function(allBirds) {
        // // Update position and velocity based on simulation
        this.x += this.vx;
        this.y += this.vy;

        // 
        // Update scheme using velocities
        // 

        // // If the birds leave home, they should come back
        // if (Math.abs(this.x) > 0.9) {
        //     this.vx -= this.x / 10000;
        // }
        // if (Math.abs(this.y) > 1) {
        //     this.vy -= this.y / 1000;
        // }
        // for(var i = 0; i < allBirds.length; i++) {
        //     other = allBirds[i];
        //     if (this != other
        //         && Math.abs(this.x - other.x) < this.sightDistance
        //         && Math.abs(this.y - other.y) < this.sightDistance) {
        //             this.vx += (other.vx - this.vx) * this.socialForce;
        //             this.vy += (other.vy - this.vy) * this.socialForce;
        //     }
        // }

        // 
        // Update scheme using angles
        // 


        for(var i = 0; i < allBirds.length; i++) {
            other = allBirds[i];
            if (this != other
                && Math.abs(this.x - other.x) < this.sightDistance
                && Math.abs(this.y - other.y) < this.sightDistance) {
                    this.angleDiff = (other.angle - this.angle);
                    if (this.angleDiff < -180) {
                        this.angleDiff += 360; 
                    }
                    if (Math.sqrt((this.x - other.x)**2 + (this.y - other.y)**2) < this.repulsiveDistance) {
                        // Repulsive force - angle away from the other bird
                        this.angle -= this.angleDiff * this.repulsiveAngularAccel;
                    } else {
                        // Social force - align angle with the other bird
                        this.angle += this.angleDiff * this.socialAngularAccel;
                    }
                    
            }
        }

        this.vx = this.fixedVelocity * Math.cos(this.angle);
        this.vy = this.fixedVelocity * Math.sin(this.angle);

        // If the birds leave home, they should come back
        // Square version (not being used)
        // if (Math.abs(this.x) > this.returnHomeBorder) {
        //     this.vx -= (Math.abs(this.x) - this.returnHomeBorder) * this.returnHomeSpring * this.x / Math.abs(this.x);
        // }
        // if (Math.abs(this.y) > this.returnHomeBorder) {
        //     this.vy -= (Math.abs(this.y) - this.returnHomeBorder) * this.returnHomeSpring * this.y / Math.abs(this.y);
        // }

        // Radial version
        if (Math.sqrt(this.x*this.x + this.y*this.y) > this.returnHomeBorder) {
            var magnitude = (Math.sqrt(this.x*this.x + this.y*this.y) - this.returnHomeBorder) * this.returnHomeSpring;
            var direction = Math.atan(this.y / this.x);
            if (this.x < 0) {
                direction += Math.PI;
            }
            this.vx -= magnitude * Math.cos(direction);
            this.vy -= magnitude * Math.sin(direction);
        } 

        // // Strong gravity
        // this.vx += - (this.x) / 1000
        // this.vy += - (this.y) / 1000

        // Weak gravity - orbit
        // this.vx += - (this.x) / 10000
        // this.vy += - (this.y) / 10000

    };

    this.updateDisplay = function(vb) {
        // Fly around in circles
        // this.vx = Math.cos(performance.now()/1000) / 100;
        // this.vy = Math.sin(performance.now()/1000) / 100;

        // // Update angle to match unit vector of velocity
        this.angle = Math.atan(this.vy / this.vx); // radians
        if (this.vx < 0) {
            this.angle += Math.PI; // for when arctan negatives cancel out
        }
        // this.angle = Math.random() * 2 * Math.PI;
        // this.angle = 0;

        // // Update vertex coordinates to match current position and angle
        var rotator = [];
        mat3.fromRotation(rotator, this.angle)
        mat3.mul(this.rotatedTriangle, rotator, this.baseTriangle);
        // mat3.rotate(this.rotatedTriangle, this.baseTriangle, this.angle);
        mat3.add(this.vertexCoords, this.rotatedTriangle,
            [   this.x, this.y, 0.0,
                this.x, this.y, 0.0,
                this.x, this.y, 0.0]);

        // // Let's have some color updating fun - red and blue
        this.b = Math.abs(this.vx) * 100;
        this.g = 0;
        this.r = Math.abs(this.vy) * 100;

        // Let's have some color updating fun - brown and white
        // this.r = (Math.abs(this.vx) * 100);
        // this.g = 1 - (Math.abs(this.vy) * 100);
        // this.b = 1 - (Math.abs(this.vy) * 100);

        // Update vertex buffer with current vertex coordinates
        for (var i_vert = 0; i_vert < 3; i_vert++) {
            // 6 points per vertex (XYZ RGB), 18 points per triangle
            bufi = (this.id * 18) + (i_vert * 6)
            vb[bufi + 0] = this.vertexCoords[i_vert * 3 + 0]; // X
            vb[bufi + 1] = this.vertexCoords[i_vert * 3 + 1]; // Y
            vb[bufi + 2] = 0; // Z

            vb[bufi + 3] = this.r;
            vb[bufi + 4] = this.g;
            vb[bufi + 5] = this.b;
        }
    }
}

var birdVert;
var birdInd;
var ctx;

var InitDemo = function() {
    console.log('Initializing script');

    // Fetch canvas and context
    const canvas = document.getElementById('demo-canvas');
    const gl = canvas.getContext('webgl');

    if (!gl) {
        console.log('WebGL not supported, falling back on experimental webgl');
        gl = canvas.getContext('experimental-webgl');
    }
    if (!gl) {
        alert('Your browser does not support WebGL.');
    }

    // Clear canvas initially and initialize some depth stuff
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.frontFace(gl.CCW);
    gl.cullFace(gl.BACK);

    //
    // Create shaders
    // 
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vertexShader, vertexShaderText);
    gl.shaderSource(fragmentShader, fragmentShaderText);

    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.error('ERROR compiling vertex shader!', gl.getShaderInfoLog(vertexShader));
        return;
    }

    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.error('ERROR compiling fragment shader!', gl.getShaderInfoLog(fragmentShader));
        return;
    }

    //
    // Create, link, and validate program
    //

    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('ERROR linking program!', gl.getProgramInfoLog(program));
        return;
    }
    gl.validateProgram(program);
    if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
        console.error('ERROR validating program!', gl.getProgramInfoLog(program));
        return;
    }

    //
    // Create buffer
    //
    var birdVertices = [];
    var birdIndices = [];
    var allBirds = [];

    const n_birds = 100;
    for (var i = 0; i < n_birds; i++) {
        bird_i = new Bird(i,
        2*Math.random()-1, 2*Math.random()-1, // x, y
        0.02*Math.random()-0.01, 0.02*Math.random()-0.01, // vx, vy
        Math.random(), Math.random(), Math.random()) // r, g, b

        // Initialize 3 vertices at 0 (each bird's update function will overwrite)
        for (var j = 0; j < 3; j++) {
            birdVertices.push(0.0, 0.0, 0.0,   0.0, 0.0, 0.0)
        }

        // Add indices to make this bird a unique triangle
        birdIndices.push(i*3, i*3 + 1, i*3 + 2);

        allBirds.push(bird_i);
        bird_i.angle = Math.random() * 2 * Math.PI
        bird_i.updateBehavior(allBirds);
        bird_i.updateDisplay(birdVertices);

    } 

    // debug globalization
    birdVert = birdVertices;
    birdInd = birdIndices;
    ctx = gl;

    var vertexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(birdVertices), gl.STATIC_DRAW);

    var indexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferObject);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(birdIndices), gl.STATIC_DRAW);

    var positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
    var colorAttribLocation = gl.getAttribLocation(program, 'vertColor');

    gl.vertexAttribPointer(
        positionAttribLocation,
        3, // Number of elements
        gl.FLOAT, // Type of elements
        gl.FALSE, // Normalize?
        6 * Float32Array.BYTES_PER_ELEMENT, // Stride length
        0 // Offset
    );

    gl.vertexAttribPointer(
        colorAttribLocation,
        3, // Number of elements
        gl.FLOAT, // Type of elements
        gl.FALSE, // Normalize?
        6 * Float32Array.BYTES_PER_ELEMENT, // Stride length
        3 * Float32Array.BYTES_PER_ELEMENT// Offset
    );

    gl.enableVertexAttribArray(positionAttribLocation);
    gl.enableVertexAttribArray(colorAttribLocation);

    // Tell OpenGL state machine which program should be active
    gl.useProgram(program);

    // Note: I get the feeling that the bufferData and new Float32Array calls below
    // are expensive. How can I update the position data without creating a new
    // array every single time?

    var loop = function() {
        gl.clearColor(0.1, 0.1, 0.1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (var i = 0; i < n_birds; i++) {
            allBirds[i].updateBehavior(allBirds);
            allBirds[i].updateDisplay(birdVertices);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(birdVertices), gl.STATIC_DRAW);
        // console.log('Frame at', performance.now());
        gl.drawElements(gl.TRIANGLES, birdIndices.length, gl.UNSIGNED_SHORT, 0);

        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
};