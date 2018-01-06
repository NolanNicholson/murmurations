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

    // The inherent triangle shape, before any rotations or translations
    this.baseTriangle = [
        // X, Y, Z
         0.00,  0.05, 0.00,
        -0.03, -0.05, 0.00,
         0.03, -0.05, 0.00
    ];

    // debug
    this.baseTriangle_alt = [
        // X, Y, Z          R, G, B
        0.0, 0.5, 0.0,      1.0, 0.0, 1.0,
        -0.3, -0.5, 0.0,     1.0, 1.0, 0.0,
        0.3, -0.5, 0.0,    0.0, 1.0, 1.0
    ];

    // The rotated triangle
    this.rotatedTriangle = [];
    // The final triangle shape that gets uploaded to the buffer
    this.vertexCoords = [];

    this.update = function(vb) {
        // // Update position and velocity based on simulation
        this.x += vx;
        this.y += vy;

        // // Update angle to match unit vector of velocity
        this.angle = Math.atan(this.vx / this.vy); // radians
        console.log(this.angle)

        // // Update vertex coordinates to match current position and angle
        mat3.rotate(this.rotatedTriangle, this.baseTriangle, this.angle);
        mat3.add(this.vertexCoords, this.rotatedTriangle,
            [   this.x, this.y, 0.0,
                this.x, this.y, 0.0,
                this.x, this.y, 0.0]);

        // Update vertex buffer with current vertex coordinates
        for (var i_vert = 0; i_vert < 3; i_vert++) {
            // 6 points per vertex (XYZ RGB), 18 points per triangle
            bufi = (this.id * 18) + (i_vert * 6)
            vb[bufi + 0] = this.vertexCoords[i_vert * 3 + 0]; // X
            vb[bufi + 1] = this.vertexCoords[i_vert * 3 + 1]; // Y
            vb[bufi + 2] = this.vertexCoords[i_vert * 3 + 2]; // Z

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
        0.00, 0.05, // vx, vy
        Math.random(), Math.random(), Math.random()) // r, g, b

        // Initialize 3 vertices at 0 (each bird's update function will overwrite)
        for (var j = 0; j < 3; j++) {
            birdVertices.push(0.0, 0.0, 0.0,   0.0, 0.0, 0.0)
        }

        // Add indices to make this bird a unique triangle
        birdIndices.push(i*3, i*3 + 1, i*3 + 2);

        allBirds.push(bird_i);
        bird_i.update(birdVertices);

    } 

    // var birdVertices = [
    //     // X, Y, Z          R, G, B
    //     0.0, 0.5, 0.0,      1.0, 0.0, 1.0,
    //     -0.3, -0.5, 0.0,     1.0, 1.0, 0.0,
    //     0.3, -0.5, 0.0,    0.0, 1.0, 1.0
    // ];

    // var birdIndices = [
    //     0, 1, 2
    // ];

    // debug globalization
    birdVert = birdVertices;
    birdInd = birdIndices;
    ctx = gl;

    // I get the feeling that the bufferData and new Float32Array calls below
    // are expensive. How can I update the position data without creating a new
    // array every single time?

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

    // TODO: Loop
    // gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.drawElements(gl.TRIANGLES, birdIndices.length, gl.UNSIGNED_SHORT, 0);
};