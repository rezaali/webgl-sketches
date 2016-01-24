// Setup Canvas
var canvas = document.body.appendChild( document.createElement( 'canvas' ) );

// Get WebGL Context
var gl = require('gl-context')( canvas, { preserveDrawingBuffer: true }, render );

// Import Webgl & Math Libraries
var glGeometry = require('gl-geometry');
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
var cam = require('nsc')( canvas, { position: [ 0.0, 0.0, -6.75 ], damping: 0.1 } );
var lgp = require('lgp');
var mda = require('mda');
var Mesh = mda.Mesh;
var MeshIntegrity = mda.MeshIntegrity;
var TriangulateOperator = mda.TriangulateOperator;
var LoopSmoothOperator = mda.LoopOperator;
var CatmullClarkOperator = mda.CatmullClarkOperator;
var QuadSubdivideOperator = mda.QuadSubdivideOperator;
var vertexNormals = require('guf').vertexNormals;
var calculateNormal = require('guf').calculateNormal;
var models = require('./../models');

//Interaction
var keyPressed = require('key-pressed');

var easing = require('eases/expo-in-out');

var mesh;
var positions;
var cells;
var geo;
var geoWire;
var geoPoints;

var modelIndex = 4;
var path = models[ modelIndex ].path;
var opts = models[ modelIndex ].opts;
var model = models[ modelIndex ].matrix;

var fileReader = lgp.fileReader( path, function parseObj( text ) {
  var results = lgp.objDeserializer( text, opts );

  mesh = new Mesh();
  mesh.setPositions( results.positions );
  mesh.setCells( results.cells );
  mesh.process();
  MeshIntegrity( mesh );

  CatmullClarkOperator( mesh );
  QuadSubdivideOperator( mesh );
  TriangulateOperator( mesh );
  positions = mesh.getPositions();
  cells = mesh.getCells();

  // Faceted Normals
  var newPositions = [];
  var newNormals = [];

  for( var i = 0; i < cells.length; i++ ) {
    var a = positions[ cells[ i ][ 0 ] ];
    var b = positions[ cells[ i ][ 1 ] ];
    var c = positions[ cells[ i ][ 2 ] ];
    var n = calculateNormal( a, b, c );
    if( opts.flip ) vec3.scale( n, n, -1.0 );
    newPositions.push( a, b, c );
    newNormals.push( n, n, n );
  }
  geo = glGeometry( gl );
  geo.attr( 'aPosition', newPositions );
  geo.attr( 'aNormal', newNormals );

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

  geoWire = glGeometry( gl );
  geoWire.attr( 'aPosition', positions );
  geoWire.faces( lines, { size: 2 } )

  geoPoints = glGeometry( gl );
  geoPoints.attr( 'aPosition', positions );
} );


// Set the canvas size to fill the window and its pixel density
var mobile = isMobile( navigator.userAgent );
var dpr = mobile ? 1 : ( window.devicePixelRatio || 1 );
window.addEventListener( 'resize', fit( canvas, null, dpr ), false );

// Setup Matricies
var projection = mat4.create();
var normalm4 = mat4.create();
var normalm3 = mat3.create();
var view = mat4.create();

// Setup Shaders
var vertexShader = glslify( './shaders/shader.vert' );
var fragmentShader = glslify( './shaders/shader.frag' );
var shader = glShader( gl, vertexShader, fragmentShader );

var vertexWireframeShader = glslify( './shaders/shaderDebug.vert' );
var fragmentWireframeShader = glslify( './shaders/shaderDebug.frag' );
var shaderDebug = glShader( gl, vertexWireframeShader, fragmentWireframeShader );

var color = [ 1.0, 1.0, 1.0, 1.0 ];
var colorPoints = [ 1.0, 1.0, 1.0, 0.5 ];
var colorWire = [ 1.0, 1.0, 1.0, 0.25 ];

// Setup Sketch Variables
var height;
var width;

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
}

function render() {
  update();
  gl.viewport( 0, 0, width, height );
  clear( gl );
  gl.enable( gl.DEPTH_TEST );
  drawGeo();
  drawGeoWireframe();
  drawGeoPoints();
}

function drawGeo() {
  if( geo ) {
    gl.enable( gl.BLEND );
    gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );
    geo.bind( shader );
    if( isMobile ) { shader.uniforms.dpr = dpr * 2.0; } else { shader.uniforms.dpr = dpr; }
    shader.uniforms.uPointSize = 2.0;
    shader.uniforms.uProjection = projection;
    shader.uniforms.uView = view;
    shader.uniforms.uNormalMatrix = normalm3;
    shader.uniforms.uModel = model;
    shader.uniforms.uColor = color;
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
    lgp.imageWriter( 'catmull-clark.png', canvas.toDataURL('image/png') );
  }
  if( keyPressed( 'E' ) ) {
    lgp.fileWriter( 'catmull-clark.obj', lgp.objSerializer( { positions: positions, cells: cells } ) );
    lgp.fileWriter( 'catmull-clark.stl', lgp.stlSerializer( { positions: positions, cells: cells } ) );
  }
}, false );
