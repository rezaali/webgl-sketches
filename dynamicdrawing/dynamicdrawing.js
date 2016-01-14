// Setup Canvas
var canvas = document.body.appendChild( document.createElement( 'canvas' ) );

// Get WebGL Context
var gl = require('gl-context')( canvas, { preserveDrawingBuffer: true }, render );

// Import Webgl & Math Libraries
var createBuffer = require('gl-buffer');
var createVAO = require('gl-vao');
var glShader = require('gl-shader');
var glslify = require('glslify');
var clear = require('gl-clear')();
var mat4 = require('gl-matrix').mat4;
var mat3 = require('gl-matrix').mat3;
var vec3 = require('gl-matrix').vec3;

// Import Web Helper Libraries
var fit = require('canvas-fit');
var isMobile = require('is-mobile');

// Import YCAM GRP Libraries
var cam = require('nsc')( canvas, { position: [ 0.0, 0.0, -4.0 ], damping: 0.99999 } );
var lgp = require('lgp');

//Interaction
var keyPressed = require('key-pressed');

var lines = new Float32Array( 20000 * 3 );

var vertBuffer = createBuffer( gl, lines, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW );
var vao = createVAO( gl, [ { buffer: vertBuffer, type: gl.FLOAT, size: 3, offset: 0, stride: 0, normalized: false } ] );

// Set the canvas size to fill the window and its pixel density
var mobile = isMobile( navigator.userAgent );
var dpr = mobile ? 1 : ( window.devicePixelRatio || 1 );
window.addEventListener( 'resize', fit( canvas, null, dpr ), false );

// Setup Matricies
var projection = mat4.create();
var model = mat4.create();
var view = mat4.create();

// Setup Shaders
var vertexShader = glslify( './shaders/dynamicdrawing.vert' );
var fragmentShader = glslify( './shaders/dynamicdrawing.frag' );
var shader = glShader( gl, vertexShader, fragmentShader );
shader.attributes.aPosition.location = 0;

var colorPoints = [ 1.0, 1.0, 1.0, 0.25 ];

// Setup Sketch Variables
var height;
var width;
var frame = 0.0;
var speed = 0.01;

function update() {

  // set projection
  width  = gl.drawingBufferWidth;
  height = gl.drawingBufferHeight;
  var aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
  var fieldOfView = Math.PI / 4.0;
  var near = 0.01;
  var far  = 1000.0;
  mat4.perspective( projection, fieldOfView, aspectRatio, near, far );

  // get view from camera
  cam.view( view );
  cam.update();

  frame += speed;
}

function render() {
  update();
  gl.viewport( 0, 0, width, height );
  clear( gl );

  gl.disable( gl.DEPTH_TEST );
  gl.enable( gl.BLEND );
  gl.blendFunc( gl.SRC_ALPHA, gl.ONE );

  shader.bind();
  if( isMobile ) { shader.uniforms.dpr = dpr * 1.0; } else { shader.uniforms.dpr = 1.0; }
  shader.uniforms.uPointSize = 0.25;
  shader.uniforms.uProjection = projection;
  shader.uniforms.uView = view;
  shader.uniforms.uModel = model;
  shader.uniforms.uColor = colorPoints;
  var out = vec3.create();

  for( var i = 0; i < lines.length; i += 3 ) {
    out[ 0 ] = Math.random() * 2.0 - 1.0;
    out[ 1 ] = Math.random() * 2.0 - 1.0;
    out[ 2 ] = Math.random() * 2.0 - 1.0;
    vec3.normalize( out, out );
    lines[ i ] = out[ 0 ];
    lines[ i + 1 ] = out[ 1 ];
    lines[ i + 2 ] = out[ 2 ];
  }

  vertBuffer.update( lines );
  vao.bind()
  vao.draw( gl.POINTS, lines.length / 3.0 );
  vao.unbind();
}

window.addEventListener( 'keydown', function( event ) {
  if( keyPressed( 'S' ) ) {
    lgp.imageWriter( 'particles.png', canvas.toDataURL('image/png') );
  }
}, false );
