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

var sps = require('sps');
var ParticleSystem = sps.ParticleSystem;
var Spring = sps.Spring;
var DamperBehavior = sps.DamperBehavior;
var HomingBehavior = sps.HomingBehavior;
var VortexBehavior = sps.VortexBehavior;
var AttractorBehavior = sps.AttractorBehavior;
var SpringsBehavior = sps.SpringsBehavior;
var RungeKuttaSolver = sps.RungeKuttaSolver;
var EulerSolver = sps.EulerSolver;
var VerletSolver = sps.VerletSolver;
var Particle = sps.Particle;

var lgp = require('lgp');
var mda = require('mda');
var Mesh = mda.Mesh;
var FaceVertices = mda.FaceVertices;
var InsertVertexOperator = mda.InsertVertexOperator;
var InsertEdgeOperator = mda.InsertEdgeOperator;
var DeleteEdgeOperator = mda.DeleteEdgeOperator;
var ExtrudeOperator = mda.ExtrudeOperator;
var PipeOperator = mda.PipeOperator;
var DuplicateOperator = mda.DuplicateOperator;
var CombineOperator = mda.CombineOperator;
var ScaleOperator = mda.ScaleOperator;
var MoveOperator = mda.MoveOperator;
var InvertOperator = mda.InvertOperator;
var WireframeOperator = mda.WireframeOperator;
var MeshIntegrity = mda.MeshIntegrity;
var TriangulateOperator = mda.TriangulateOperator;
var LoopSmoothOperator = mda.LoopOperator;
var CatmullClarkOperator = mda.CatmullClarkOperator;
var MeshCentroid = mda.MeshCentroid;
var vertexNormals = require('guf').vertexNormals;
var calculateNormal = require('guf').calculateNormal;
var models = require('./../models');

var cam = require('nsc')( canvas, {
  position: [ 0.0, 0.0, -25.0 ],
  rotation: mat4.fromRotation( mat4.create(), -Math.PI * 0.30, [ 1, 0, 0 ] )
} );

var map = require('mhf').map;

//Interaction
var keyPressed = require('key-pressed');

// Setup Matricies
var projection = mat4.create();
var model = mat4.create();
var normalm4 = mat4.create();
var normalm3 = mat3.create();
var view = mat4.create();

var renderSolid = true;
var renderWire = true;
var renderParticles = false;
var color = [ 1.0, 1.0, 1.0, 1.0 ];
var colorPoints = [ 1.0, 1.0, 1.0, 0.25 ];
var colorLines = [ 1.0, 1.0, 1.0, 0.5 ];

var omesh, meshOut, meshOutTri;
var positions, cells;
var geoOut;
var geoWireOut, geoWire;
var geoPointsOut, geoPoints;

// Setup Shaders
var vertexShader = glslify( './shaders/shader.vert' );
var fragmentShader = glslify( './shaders/shader.frag' );
var shader = glShader( gl, vertexShader, fragmentShader );

var vertexWireframeShader = glslify( './shaders/shaderDebug.vert' );
var fragmentWireframeShader = glslify( './shaders/shaderDebug.frag' );
var shaderDebug = glShader( gl, vertexWireframeShader, fragmentWireframeShader );
shaderDebug.attributes.aPosition.location = 0;

// Setup Sketch Variables
var height;
var width;
var frame = 0.0;
var speed = 0.005;

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
vortex.setEnabled( false );
ps.addBehavior( vortex );
//
var attractor = new AttractorBehavior();
attractor.magnitude = -3.5;
attractor.fallOff = 3.0;
attractor.pos[ 2 ] = -0.0;
attractor.setEnabled( true );
ps.addBehavior( attractor );

var attractor2 = new AttractorBehavior();
attractor2.magnitude = 0.25;
attractor2.fallOff = 1.0;
attractor2.pos[ 2 ] = 7.0;
// ps.addBehavior( attractor2 );

var homing = new HomingBehavior();
homing.magnitude = 0.175;
homing.setEnabled( true );
ps.addBehavior( homing );

var damper = new DamperBehavior();
damper.magnitude = 0.95;
ps.addBehavior( damper );

var numLoops = 10;
var numLoopsLimit = numLoops - 1;
var perLoop = 20;
var inc = Math.PI * 2.0 / perLoop;
var rad = 3.0;
var heightMax = 5.0;
var heightMin = 5.0;
for( var k = 0; k < numLoops; k++ ) {
  for( var j = 0; j < perLoop; j++ ) {
    var theta = j * inc;
    var x = rad * Math.cos( theta );
    var y = rad * Math.sin( theta );
    var z = map( k, 0, numLoopsLimit, heightMin, -heightMax );
    var particle = ps.addParticle();
    particle.setPos( vec3.fromValues( x, y, z ) );
    particle.setHome( vec3.fromValues( x, y, z ) );
    if( k === 0 || k === numLoopsLimit ) {
      particle.setFixed( true );
    }
  }
}

var springOptsHor = {
  length : 1.50,
  k : 0.5,
};

var springOptsVer = {
  length : 1.50,
  k : 0.5,
};

var size = numLoops * perLoop;
var indicies = [];
var springs = [];
var particles = ps.getParticles();

for( var k = 0; k < numLoops; k++ ) {
  var o = k * perLoop;
  for( var j = 0; j < perLoop; j++ ) {
    var i0 = o + j;
    var i1 = o + ( j + 1 ) % perLoop;
    var p0 = particles[ i0 ];
    var p1 = particles[ i1 ];
    var s0 = new Spring( p0, p1, springOptsHor );
    springs.push( s0 );
    indicies.push( i0, i1 );
  }
}

for( var k = 0; k < numLoops - 1; k++ ) {
  var o = k * perLoop;
  var off = k % 2;
  for( var j = 0; j < perLoop; j += 2 ) {
    var i0 = o + j + off;
    var i1 = o + j + perLoop + off;
    var p0 = particles[ i0 ];
    var p1 = particles[ i1 ];
    var s0 = new Spring( p0, p1, springOptsVer );
    springs.push( s0 );
    indicies.push( i0, i1 );
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

var ppCells = [];
for( var k = 0; k < numLoops - 1; k++ ) {
  var o = k * perLoop;
  for( var j = 0; j < perLoop; j++ ) {
    var j0 = j;
    var j1 = ( j + 1 ) % perLoop;
    var i0 = o + j0;
    var i1 = o + j1;
    var i2 = o + j1 + perLoop;
    var i3 = o + j0 + perLoop;
    ppCells.push( [ i0, i3, i2 ] );
    ppCells.push( [ i0, i2, i1 ] );
  }
}

var top = [];
var bot = [];
var loff = numLoops * perLoop - 1;
for( var j = 0; j < perLoop; j++ ) {
  top.push( j );
  bot.push( loff - j );
}

ppCells.push( top );
ppCells.push( bot );

omesh = new Mesh();
omesh.setPositions( ps.getPositions() );
omesh.setCells( ppCells );
omesh.process();

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

function setupGeometry() {
    meshOut = undefined;
    buildGeometry();
}

function buildGeometry() {
  if( !meshOut ) {
    meshOut = DuplicateOperator( omesh );
    // var meshIn = DuplicateOperator( omesh );
    // ScaleOperator( meshIn, 0.90 );
    // InvertOperator( meshIn );
    // MoveOperator( meshIn, [ 0.0, 0.0, 0.0 ] );
    // var flen = meshOut.getFaces().length;
    // var topface = flen - 2;
    // CombineOperator( meshOut, meshIn );
    //
    // // ExtrudeOperator( meshOut, topface, 0.0, 0.2 );
    // PipeOperator( meshOut, topface, flen + topface );

    // var botface = meshOut.getFaces().length - 1;

    WireframeOperator( meshOut, 0.20, 0.40 );


    // ExtrudeOperator( meshOut, topface, 0.0, 0.2 );
    // ExtrudeOperator( meshOut, botface, 0.0, 0.2 );
    // PipeOperator( meshOut, topface, botface, 1 );

    // ExtrudeOperator( meshOut, face, 2.0, 0.0 );
    // CatmullClarkOperator( meshOut );
    // var centroid = MeshCentroid( omesh );
    // vec3.scale( centroid, centroid, -1.0 );
    // MoveOperator( omesh, centroid );
    // ScaleOperator( omesh, 10.0 );
    //
    // var flen = omesh.getFaces().length;
    // for( var i = 0; i < flen; i++ ) {
    //   ExtrudeOperator( omesh, i, 10.0, 0.0 );
    // }
    // WireframeOperator( meshOut, 0.1, 0.1 );
    // // WireframeOperator( omesh, 1.0, 2.0 );
    // // MeshIntegrity( omesh );
  }

  geoWireOut = createGeoWire( meshOut.getPositions(), meshOut.getCells() );

  meshOutTri = DuplicateOperator( meshOut );
  TriangulateOperator( meshOutTri );

  // LoopSmoothOperator( meshOutTri );
  // LoopSmoothOperator( meshOutTri );
  // LoopSmoothOperator( meshOutTri );

  positions = positionsOut = meshOutTri.getPositions();
  cells = cellsOut = meshOutTri.getCells();

  geoOut = createGeo( positionsOut, cellsOut );
  geoPointsOut = createGeoPoints( positionsOut );
}

function smooth() {
  CatmullClarkOperator( meshOut );
  buildGeometry();
}

function createGeo( positions, cells ) {
  var newPositions = [];
  var newNormals = [];

  for( var i = 0; i < cells.length; i++ ) {
    var a = positions[ cells[ i ][ 0 ] ];
    var b = positions[ cells[ i ][ 1 ] ];
    var c = positions[ cells[ i ][ 2 ] ];
    var n = calculateNormal( a, b, c );
    vec3.scale( n, n, 1.0 );
    newPositions.push( a, b, c );
    newNormals.push( n, n, n );
  }
  var geo = glGeometry( gl );
  geo.attr( 'aPosition', newPositions );
  geo.attr( 'aNormal', newNormals );
  return geo;
}

function createGeoWire( positions, cells ) {
  var lines = [];
  for( var i = 0; i < cells.length; i++ ) {
    var cell = cells[ i ];
    var clen = cell.length;
    for( var j = 0; j < clen; j++ ) {
      var i0 = cell[ j ];
      var i1 = cell[ ( j + 1 ) % clen ];
      lines.push( i0, i1 );
    }
  }

  var geoWire = glGeometry( gl );
  geoWire.attr( 'aPosition', positions );
  geoWire.faces( lines, { size: 2 } );
  return geoWire;
}

function createGeoPoints( positions ) {
  var geoPoints = glGeometry( gl );
  geoPoints.attr( 'aPosition', positions );
  return geoPoints;
}

function update() {
  // set projection
  width  = gl.drawingBufferWidth;
  height = gl.drawingBufferHeight;
  var aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
  var fieldOfView = Math.PI / 4.0;
  var near = 0.01;
  var far  = 1000.0;
  mat4.perspective( projection, fieldOfView, aspectRatio, near, far );

  // model = mat4.fromTranslation( mat4.create(), [ 0, 0, 8.0 * Math.sin( frame ) ] );
  // colorPoints[ 3 ] = 0.75 * Math.abs( Math.cos( frame ) );
  // colorLines[ 3 ] = 0.75 * Math.abs( Math.cos( frame ) );
  // get view from camera
  cam.view( view );
  cam.update();
  frame += speed;

  mat4.copy( normalm4, view );
  mat4.invert( normalm4, normalm4 );
  mat4.transpose( normalm4, normalm4 );
  mat3.fromMat4( normalm3, normalm4 );

  // attractor.pos[ 2 ] = 2.0 * Math.cos( frame );
  if( vortex && vortex.getEnabled() ) {
    vortex.magnitude = 2.5 * Math.sin( frame );
  }

  ps.update();
  setupGeometry();
}

function render() {
  update();
  gl.viewport( 0, 0, width, height );
  clear( gl );

  drawMesh();
  drawParticleSystem();
};

function drawParticleSystem() {
  if( renderParticles ) {
    if( !renderSolid ) {
      gl.disable( gl.DEPTH_TEST );
    }
    gl.enable( gl.BLEND );
    gl.blendFunc( gl.SRC_ALPHA, gl.ONE );

    shaderDebug.bind();
    if( isMobile ) { shaderDebug.uniforms.dpr = dpr * 1.0; } else { shaderDebug.uniforms.dpr = 1.0; }
    shaderDebug.uniforms.uPointSize = 1.0;
    shaderDebug.uniforms.uProjection = projection;
    shaderDebug.uniforms.uView = view;
    shaderDebug.uniforms.uModel = model;
    shaderDebug.uniforms.uColor = colorPoints;

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
    shaderDebug.uniforms.uColor = colorLines;
    vao.draw( gl.LINES, indicies.length );
    vao.unbind();
  }
}

function drawMesh() {
  if( renderSolid ) {
    gl.enable( gl.DEPTH_TEST );
    drawGeo( geoOut );
  }
  else {
    gl.disable( gl.DEPTH_TEST );
  }
  if( renderWire ) {
    drawGeoWireframe( geoWireOut );
    drawGeoPoints( geoPointsOut );
  }
}

function randomize() {
  var particles = ps.getParticles();
  var plen = particles.length;
  for( var i = 0; i < plen; i++ ) {
    var p = particles[ i ];
    var home = p.getHome();
    p.setVel( vec3.fromValues( 0, 0, simplex.noise3D( 0.5 * home[ 0 ], 0.5 * home[ 1 ], frame ) ) );
  }
};

function drawGeo( geo ) {
  if( geo ) {
    gl.enable( gl.BLEND );
    gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );
    geo.bind( shader );
    if( isMobile ) { shader.uniforms.dpr = dpr * 2.0; } else { shader.uniforms.dpr = dpr; }
    shader.uniforms.uPointSize = 1.0;
    shader.uniforms.uProjection = projection;
    shader.uniforms.uView = view;
    shader.uniforms.uNormalMatrix = normalm3;
    shader.uniforms.uModel = model;
    shader.uniforms.uColor = color;
    geo.draw( gl.TRIANGLES );
    geo.unbind();
  }
}

function drawGeoPoints( geoPoints ) {
  if( geoPoints ) {
    gl.enable( gl.BLEND );
    gl.blendFunc( gl.SRC_ALPHA, gl.ONE );
    geoPoints.bind( shaderDebug );
    if( isMobile ) { shaderDebug.uniforms.dpr = dpr * 1.0; } else { shaderDebug.uniforms.dpr = 1.0; }
    shaderDebug.uniforms.uPointSize = 1.0;
    shaderDebug.uniforms.uProjection = projection;
    shaderDebug.uniforms.uView = view;
    shaderDebug.uniforms.uModel = model;
    shaderDebug.uniforms.uColor = colorPoints;
    geoPoints.draw( gl.POINTS );
    geoPoints.unbind();
  }
}

function drawGeoWireframe( geoWire ) {
  if( geoWire ) {
    gl.enable( gl.BLEND );
    gl.blendFunc( gl.SRC_ALPHA, gl.ONE );
    gl.lineWidth( 2.0 );
    geoWire.bind( shaderDebug );
    if( isMobile ) { shaderDebug.uniforms.dpr = dpr * 2.0; } else { shaderDebug.uniforms.dpr = dpr; }
    shaderDebug.uniforms.uPointSize = 1.0;
    shaderDebug.uniforms.uProjection = projection;
    shaderDebug.uniforms.uView = view;
    shaderDebug.uniforms.uModel = model;
    shaderDebug.uniforms.uColor = colorLines;
    geoWire.draw( gl.LINES );
    geoWire.unbind();
  }
}

window.addEventListener( 'keydown', function( event ) {
  if( keyPressed( 'S' ) ) {
    lgp.imageWriter( 'void.png', canvas.toDataURL('image/png') );
  }
  if( keyPressed( 'V' ) ) {
    vortex.setEnabled( !vortex.getEnabled() );
  }
  if( keyPressed( 'A' ) ) {
    attractor.setEnabled( !attractor.getEnabled() );
  }
  if( keyPressed( 'H' ) ) {
    homing.setEnabled( !homing.getEnabled() );
  }
  if( keyPressed( 'E' ) ) {
    lgp.fileWriter( "mitre.stl", lgp.stlSerializer( { positions: positions, cells: cells } ) );
    lgp.fileWriter( "mitre.obj", lgp.objSerializer( { positions: positions, cells: cells } ) );
    return;
  }
  if( keyPressed( 'M' ) ) {
    renderSolid = !renderSolid;
    return;
  }
  if( keyPressed( 'W' ) ) {
    renderWire = !renderWire;
    return;
  }
  if( keyPressed( 'P' ) ) {
    renderParticles = !renderParticles;
    return;
  }
  if( keyPressed( 'C' ) ) {
    smooth();
    return;
  }
  if( keyPressed( 'R' ) ) {
    setupGeometry();
  }
}, false );
