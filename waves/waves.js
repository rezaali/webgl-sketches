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

// Noise Function
var SimplexNoise = require('simplex-noise');
var simplex = new SimplexNoise( Math.random );

var defaultRotation = mat4.create();
var tmp = quat.create();
var dir = vec3.fromValues( 0.0, 0.9, 1 );
vec3.normalize( dir, dir );
quat.rotationTo( tmp, [ 0, 0, 1 ], dir );

defaultRotation = mat4.fromQuat( defaultRotation, tmp );

// Import YCAM GRP Libraries
var cam = require('nsc')( canvas, {
  position: [ 0.0, 0.5, -7.0 ],
  rotation: defaultRotation
} );

var map = require('mhf').map;
var Mesh = require('mda').Mesh;
var MeshIntegrity = require('mda').MeshIntegrity;
var TriangulateOperator = require('mda').TriangulateOperator;
var LoopOperator = require('mda').LoopOperator;
var CatmullClarkOperator = require('mda').CatmullClarkOperator;

var vertexNormals = require('guf').vertexNormals;
var calculateNormal = require('guf').calculateNormal;

var imageWriter = require('lgp').imageWriter;
var stlSerializer = require('lgp').stlSerializer;
var objSerializer = require('lgp').objSerializer;
var svgSerializer = require('lgp').svgSerializer;
var fileWriter = require('lgp').fileWriter;

//Interaction
var keyPressed = require('key-pressed');

var mesh
var geo;
var geoWire;
var geoPoints;
var exportPositions;
var exportCells;

var cells = [];
var pos = [];
var homes = [];
var vel = [];

var gridSize = 20;
var size = 2.0;
for( var y = 0; y < gridSize; y++ ) {
  for( var x = 0; x < gridSize; x++ ) {
    var ptx = map( x, 0, gridSize - 1, -size, size );
    var pty = map( y, 0, gridSize - 1, -size, size );
    pos.push( ptx, pty, 0.0 );
    homes.push( ptx, pty, 0.0 );
    vel.push( 0.0, 0.0, 0.0 );
  }
}

var dynamicLength = pos.length / 3.0;

var total = gridSize * gridSize - gridSize;
for( var i = 0; i < total; i++ ) {
  if( ( ( i + 1 ) % gridSize ) != 0 ) {
    // cells.push( [ i, i + 1, i + gridSize + 1, i + gridSize ] );
    cells.push( [ i, i + 1, i + gridSize + 1 ] );
    cells.push( [ i, i + gridSize + 1, i + gridSize ] );
  }
}

var depth = 1.0;
var c0 = pos.length / 3.0;
pos.push( -size, -size, -depth );
var c1 = pos.length / 3.0;
pos.push( size, -size, -depth );
var c2 = pos.length / 3.0;
pos.push( size, size, -depth );
var c3 = pos.length / 3.0;
pos.push( -size, size, -depth );

cells.push( [ c3, c2, c1, c0 ] );

var bot = [ c0, c1 ];
for( var i = gridSize - 1; i >= 0; i-- ) {
  bot.push( i );
}
cells.push( bot );

var right = [ c1, c2 ];
for( var i = gridSize * gridSize - 1; i >= gridSize - 1; i -= gridSize ) {
  right.push( i );
}
cells.push( right );

var top = [ c2, c3 ];
for( var i = gridSize * gridSize - gridSize; i < gridSize * gridSize; i++ ) {
  top.push( i );
}
cells.push( top );

var left = [ c3, c0 ];
for( var i = 0; i <= gridSize * gridSize - gridSize; i += gridSize ) {
  left.push( i );
}
cells.push( left );


var vertBuffer = createBuffer( gl, pos, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW );
var vao = createVAO( gl, [ { buffer: vertBuffer, type: gl.FLOAT, size: 3, offset: 0, stride: 0, normalized: false } ] );

// Setup Matricies
var projection = mat4.create();
var normalm4 = mat4.create();
var normalm3 = mat3.create();
var model = mat4.create();
var view = mat4.create();

var color = [ 1.0, 1.0, 1.0, 1.0 ];
var colorPoints = [ 1.0, 1.0, 1.0, 0.5 ];
var colorWire = [ 1.0, 1.0, 1.0, 0.25 ];

// Setup Shaders
var vertexShader = glslify( './shaders/wavesShader.vert' );
var fragmentShader = glslify( './shaders/wavesShader.frag' );
var shader = glShader( gl, vertexShader, fragmentShader );
shader.attributes.aPosition.location = 0;

var shaderDebug = glShader( gl, vertexShader, fragmentShader );

var vertexSolidShader = glslify( './shaders/wavesShaderSolid.vert' );
var fragmentSolidShader = glslify( './shaders/wavesShaderSolid.frag' );
var shaderSolid = glShader( gl, vertexSolidShader, fragmentSolidShader );

var colorPoints = [ 1.0, 1.0, 1.0, 1.0 ];

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

  mat4.copy( normalm4, view );
  mat4.invert( normalm4, normalm4 );
  mat4.transpose( normalm4, normalm4 );
  mat3.fromMat4( normalm3, normalm4 );

  frame += speed;

  var limit = dynamicLength;

  // var p = vec3.create();
  // for( var i = 0; i < limit; i++ ) {
  //   var index = i * 3.0;
  //   p = vec3.fromValues( pos[ index ], pos[ index + 1 ], pos[ index + 2 ] );
  //   var len = vec3.length( p );
  //   p[ 2 ] = 0.5 * Math.cos( len * 5.0 + frame ) * Math.sin( len * 5.0 + frame );
  //   // console.log( p[ 2 ] );
  //   pos[ index ] = p[ 0 ];
  //   pos[ index + 1 ] = p[ 1 ];
  //   pos[ index + 2 ] = p[ 2 ];
  // }

  var scale = 1.0;
  var p = vec3.create();
  for( var i = 0; i < limit; i++ ) {
    var index = i * 3.0;
    p = vec3.fromValues( pos[ index ], pos[ index + 1 ], 0.0 );
    var len = vec3.length( p );
    pos[ index ] = p[ 0 ];
    pos[ index + 1 ] = p[ 1 ];
    pos[ index + 2 ] = 0.5 * simplex.noise3D( scale * p[ 0 ], scale * p[ 1 ], frame );
  }

  var positions = [];
  for( var i = 0; i < pos.length / 3.0; i++ ) {
    var index = i * 3.0;
    positions.push( [ pos[ index ], pos[ index + 1 ], pos[ index + 2 ] ] );
  }

  mesh = new Mesh();
  mesh.setPositions( positions );
  mesh.setCells( cells );
  mesh.process();

  generateGeometry();
}

function generateGeometry()
{
  TriangulateOperator( mesh );
  var wireCells = mesh.getCells();
  var wirePositions = mesh.getPositions();

  // LoopOperator( mesh );
  // LoopOperator( mesh );
  // LoopOperator( mesh );
  // LoopOperator( mesh );
  exportPositions = mesh.getPositions();
  exportCells = mesh.getCells();
  //
  // MeshIntegrity( mesh );
  //
  var newPositions = [];
  var newNormals = [];

  for( var i = 0; i < exportCells.length; i++ ) {
    var a = exportPositions[ exportCells[ i ][ 0 ] ];
    var b = exportPositions[ exportCells[ i ][ 1 ] ];
    var c = exportPositions[ exportCells[ i ][ 2 ] ];
    var n = calculateNormal( a, b, c );
    newPositions.push( a, b, c );
    newNormals.push( n, n, n );
  }
  //
  geo = glGeometry( gl );
  geo.attr( 'aPosition', newPositions );
  geo.attr( 'aNormal', newNormals );

  var lines = [];
  for( var i = 0; i < wireCells.length; i++ ) {
    var cell = wireCells[ i ];
    var clen = cell.length;
    for( var j = 0; j < clen; j++ ) {
      var i0 = cell[ j ];
      var i1 = cell[ ( j + 1 ) % clen ];
      lines.push( i0, i1 );
    }
  }

  geoWire = glGeometry( gl );
  geoWire.attr( 'aPosition', wirePositions );
  geoWire.faces( lines, { size: 2 } )

  geoPoints = glGeometry( gl );
  geoPoints.attr( 'aPosition', wirePositions );
};

function render() {
  update();
  gl.viewport( 0, 0, width, height );
  clear( gl );

  // gl.disable( gl.DEPTH_TEST );
  gl.enable( gl.DEPTH_TEST );
  gl.enable( gl.BLEND );
  gl.blendFunc( gl.SRC_ALPHA, gl.ONE );

  shader.bind();
  if( isMobile ) { shader.uniforms.dpr = dpr * 1.0; } else { shader.uniforms.dpr = 1.0; }
  shader.uniforms.uPointSize = 0.25;
  shader.uniforms.uProjection = projection;
  shader.uniforms.uView = view;
  shader.uniforms.uModel = model;
  shader.uniforms.uColor = colorPoints;

  vertBuffer.update( pos );
  vao.bind()
  vao.draw( gl.POINTS, pos.length / 3.0 );
  vao.unbind();

  drawGeo();
  drawGeoPoints();
  drawGeoWireframe();
};

function drawGeo() {
  if( geo ) {
    gl.enable( gl.BLEND );
    gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );
    geo.bind( shaderSolid );
    if( isMobile ) { shaderSolid.uniforms.dpr = dpr * 2.0; } else { shaderSolid.uniforms.dpr = dpr; }
    shaderSolid.uniforms.uPointSize = 2.0;
    shaderSolid.uniforms.uProjection = projection;
    shaderSolid.uniforms.uView = view;
    shaderSolid.uniforms.uNormalMatrix = normalm3;
    shaderSolid.uniforms.uModel = model;
    shaderSolid.uniforms.uColor = color;
    geo.draw( gl.TRIANGLES );
    geo.unbind();
  }
};

function drawGeoPoints() {
  if( geoWire ) {
    gl.enable( gl.BLEND );
    gl.blendFunc( gl.SRC_ALPHA, gl.ONE );
    geoPoints.bind( shaderDebug );
    if( isMobile ) { shaderDebug.uniforms.dpr = dpr * 1.0; } else { shaderDebug.uniforms.dpr = 1.0; }
    shaderDebug.uniforms.uPointSize = 0.05;
    shaderDebug.uniforms.uProjection = projection;
    shaderDebug.uniforms.uView = view;
    shaderDebug.uniforms.uModel = model;
    shaderDebug.uniforms.uColor = colorPoints;
    geoPoints.draw( gl.POINTS );
    geoPoints.unbind();
  }
};

function drawGeoWireframe() {
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
    shaderDebug.uniforms.uColor = colorWire;
    geoWire.draw( gl.LINES );
    geoWire.unbind();
  }
};

window.addEventListener( 'keydown', function( event ) {
  if( keyPressed( 'S' ) ) {
    imageWriter( 'particles.png', canvas.toDataURL('image/png') );
  }
  if( keyPressed( 'E' ) ) {
    fileWriter( "wave.stl", stlSerializer( { positions: exportPositions, cells: exportCells } ) );
    fileWriter( "wave.obj", objSerializer( { positions: exportPositions, cells: exportCells } ) );
  }

}, false );
