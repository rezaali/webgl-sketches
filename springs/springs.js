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

var ParticleSystem = require('sps').ParticleSystem;
var Spring = require('sps').Spring;
var DamperBehavior = require('sps').DamperBehavior;
var HomingBehavior = require('sps').HomingBehavior;
var VortexBehavior = require('sps').VortexBehavior;
var AttractorBehavior = require('sps').AttractorBehavior;
var SpringsBehavior = require('sps').SpringsBehavior;
var Particle = require('sps').Particle;

var cam = require('nsc')( canvas, {
  position: [ 0.0, 0.0, -7.0 ],
  // rotation: mat4.fromRotation( mat4.create(), Math.PI * 0.5, [ 1,0,0 ] )
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

var springs = new SpringsBehavior();
ps.addBehavior( springs );

//
var vortex = new VortexBehavior();
ps.addBehavior( vortex );
//
var attractor = new AttractorBehavior();
attractor.magnitude = -0.5;
attractor.fallOff = 0.5;
attractor.pos[ 2 ] = -1.0;
ps.addBehavior( attractor );

var damper = new DamperBehavior();
damper.magnitude = 0.9;
ps.addBehavior( damper );

var ptx, pty;
var gridSize = 20;
var gridSizeLimit = ( gridSize - 1 );
var size = 2.0;

for( var y = 0; y < gridSize; y++ ) {
  for( var x = 0; x < gridSize; x++ ) {
    ptx = map( x, 0, gridSize - 1, -size, size );
    pty = map( y, 0, gridSize - 1, -size, size );
    var particle = ps.addParticle();
    particle.setPos( vec3.fromValues( ptx, pty, 0.0 ) );
    particle.setPrevPos( vec3.fromValues( ptx, pty, 0.0 ) );
    particle.setHome( vec3.fromValues( ptx, pty, 0.0 ) );
    if( x === 0 || x === gridSizeLimit || y === 0 || y === gridSizeLimit ) {
      particle.setFixed( true );
    }
  }
}

var particles = ps.getParticles();
var plen = particles.length;
var springs = [];
var indicies = [];

var length = size / gridSize;
for( var i = 0; i < plen - 1; i++ ) {
    var p0 = particles[ i ];
    var p1 = particles[ i + 1 ];
    if( ( i + 1 ) % gridSize != 0 ) {
      var s0 = new Spring( p0, p1 );
      s0.length = length;
      springs.push( s0 );
      indicies.push( i, i + 1 );
    }

    if( ( i + gridSize ) < plen ) {
      var p5 = particles[ i + gridSize ];
      var s5 = new Spring( p0, p5 );
      s5.length = length;
      springs.push( s5 );
      indicies.push( i, i + gridSize );
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
var indexBuffer = createBuffer( gl, indicies, gl.ELEMENT_ARRAY_BUFFER, gl.STATIC_DRAW );

var vao = createVAO(
  gl, [ {
    buffer: vertBuffer,
    type: gl.FLOAT,
    size: 3,
    offset: 0,
    stride: 0,
    normalized: false
  } ],
  indexBuffer,
  gl.UNSIGNED_SHORT
);

// Setup Matricies
var projection = mat4.create();
var model = mat4.create();
var view = mat4.create();

var colorPoints = [ 1.0, 1.0, 1.0, 0.5 ];

// Setup Shaders
var vertexShader = glslify( './shaders/springsShader.vert' );
var fragmentShader = glslify( './shaders/springsShader.frag' );
var shader = glShader( gl, vertexShader, fragmentShader );
shader.attributes.aPosition.location = 0;

// Setup Sketch Variables
var height;
var width;
var frame = 0.0;
var speed = 0.025;

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



  // attractor.pos[ 2 ] = 2.0 * Math.cos( frame );
  if( vortex && vortex.getEnabled() ) {
    frame += speed;
    vortex.magnitude = 0.125 * Math.sin( frame );
  }

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

  gl.lineWidth( 2 );
  vertBuffer.update( pos );
  vao.bind()
  vao.draw( gl.POINTS, indicies.length );
  vao.draw( gl.LINES, indicies.length );
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
    imageWriter( 'springs.png', canvas.toDataURL('image/png') );
  }
  if( keyPressed( 'H' ) ) {
    homing.setEnabled( !homing.getEnabled() );
  }
  if( keyPressed( 'V' ) ) {
    frame = 0;
    vortex.setEnabled( !vortex.getEnabled() );
  }
}, false );
