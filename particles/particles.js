// Setup Canvas
var canvas = document.body.appendChild( document.createElement( 'canvas' ) );

// Get WebGL Context
var gl = require('gl-context')( canvas, { preserveDrawingBuffer: true }, render );

var fit = require('canvas-fit');
var isMobile = require('is-mobile');
var mobile = isMobile( navigator.userAgent );
var dpr = mobile ? 1 : ( window.devicePixelRatio || 1 );
window.addEventListener( 'resize', fit( canvas, null, dpr ), false );

// Import Webgl & Math Libraries
var createBuffer = require('gl-buffer');
var createVAO = require('gl-vao');
var glGeometry = require('gl-geometry');
var glShader = require('gl-shader');
var glslify = require('glslify');
var clear = require('gl-clear')();
var quat = require('gl-matrix').quat;
var mat4 = require('gl-matrix').mat4;
var mat3 = require('gl-matrix').mat3;
var vec3 = require('gl-matrix').vec3;

// var Solver = require('sps').Solver;
var gaussian = require('mhf').gaussian;
var ParticleSystem = require('sps').ParticleSystem;
var DamperBehavior = require('sps').DamperBehavior;
var HomingBehavior = require('sps').HomingBehavior;
var VortexBehavior = require('sps').VortexBehavior;
var AttractorBehavior = require('sps').AttractorBehavior;
var Particle = require('sps').Particle;

// Noise Function
var SimplexNoise = require('simplex-noise');
var simplex = new SimplexNoise( Math.random );

// Import YCAM GRP Libraries
var cam = require('nsc')( canvas, {
  position: [ 0.0, 0.0, -11.0 ],
  rotation: mat4.fromRotation( mat4.create(), Math.PI * 0.75, [ 1, 0, 0 ] )
} );

var map = require('mhf').map;

var imageWriter = require('lgp').imageWriter;

//Interaction
var keyPressed = require('key-pressed');

var cells = [];
var pos = [];
var homes = [];
var vel = [];

var rand = false;
var ps = new ParticleSystem();

var homing = new HomingBehavior();
homing.magnitude = 0.75;
ps.addBehavior( homing );

var damper = new DamperBehavior();
damper.magnitude = 0.9;
ps.addBehavior( damper );

var vortex = new VortexBehavior();
ps.addBehavior( vortex );

var attractor = new AttractorBehavior();
attractor.magnitude = 2.0;
attractor.fallOff = 1.0;
ps.addBehavior( attractor );
attractor.pos[ 2 ] = 4.0;

var ptx, pty;
var gridSize = 80;
var size = 3.0;
for( var y = 0; y < gridSize; y++ ) {
  for( var x = 0; x < gridSize; x++ ) {
    ptx = map( x, 0, gridSize - 1, -size, size );
    pty = map( y, 0, gridSize - 1, -size, size );
    var particle = ps.addParticle();
    particle.setPos( vec3.fromValues( ptx, pty, 0.0 ) );
    particle.setPrevPos( vec3.fromValues( ptx, pty, 0.0 ) );
    particle.setHome( vec3.fromValues( ptx, pty, 0.0 ) );
  }
}

var pp = ps.getPositions();
var plen = pp.length;
var pos = new Float32Array( plen * 3 );
for( var i = 0; i < plen; i++ ) {
  var index = i * 3.0;
  pos[ index ] = pp[ i ][ 0 ];
  pos[ index + 1 ] = pp[ i ][ 1 ];
  pos[ index + 2 ] = pp[ i ][ 2 ];
}
var vertBuffer = createBuffer( gl, pos, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW );
var vao = createVAO( gl, [ { buffer: vertBuffer, type: gl.FLOAT, size: 3, offset: 0, stride: 0, normalized: false } ] );

// Setup Matricies
var projection = mat4.create();
var model = mat4.create();
var view = mat4.create();

var colorPoints = [ 1.0, 1.0, 1.0, 1.00 ];

// Setup Shaders
var vertexShader = glslify( './shaders/particlesShader.vert' );
var fragmentShader = glslify( './shaders/particlesShader.frag' );
var shader = glShader( gl, vertexShader, fragmentShader );
shader.attributes.aPosition.location = 0;

// Setup Sketch Variables
var height;
var width;
var frame = 0.0;
var speed = 0.05;

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

  attractor.pos[ 2 ] = 3.0 * Math.cos( frame );

  ps.update();
}

function render() {
  update();
  gl.viewport( 0, 0, width, height );
  clear( gl );

  gl.disable( gl.DEPTH_TEST );
  // gl.enable( gl.DEPTH_TEST );
  gl.enable( gl.BLEND );
  gl.blendFunc( gl.SRC_ALPHA, gl.ONE );

  shader.bind();
  if( isMobile ) { shader.uniforms.dpr = dpr * 1.0; } else { shader.uniforms.dpr = 1.0; }
  shader.uniforms.uPointSize = 0.25;
  shader.uniforms.uProjection = projection;
  shader.uniforms.uView = view;
  shader.uniforms.uModel = model;
  shader.uniforms.uColor = colorPoints;

  if( rand ) {
    randomize();
    rand = false;
  }

  var pp = ps.getPositions();
  var plen = pp.length;
  for( var i = 0; i < plen; i++ ) {
    var index = i * 3.0;
    pos[ index ] = pp[ i ][ 0 ];
    pos[ index + 1 ] = pp[ i ][ 1 ];
    pos[ index + 2 ] = pp[ i ][ 2 ];
  }

  vertBuffer.update( pos );
  vao.bind()
  vao.draw( gl.POINTS, pos.length / 3.0 );
  vao.unbind();
};

function randomize() {
  var particles = ps.getParticles();
  var plen = particles.length;
  for( var i = 0; i < plen; i++ ) {
    var p = particles[ i ];
    var home = p.getHome();
    p.setVel( vec3.fromValues( 0, 0, simplex.noise3D( 0.5 * home[ 0 ], 0.5 * home[ 1 ], frame ) ) );
  }
};

window.addEventListener( 'keydown', function( event ) {
  if( keyPressed( 'S' ) ) {
    imageWriter( 'particles.png', canvas.toDataURL('image/png') );
  }
  if( keyPressed( 'H' ) ) {
    homing.setEnabled( !homing.getEnabled() );
  }
  if( keyPressed( 'R' ) ) {
    rand = !rand;
  }
}, false );
