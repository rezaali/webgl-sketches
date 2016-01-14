// Setup Canvas
var canvas = document.body.appendChild( document.createElement( 'canvas' ) );

// Get WebGL Context
var gl = require('gl-context')( canvas, render );

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
var cam = require('nsc')( canvas, { position: [ 0.0, 0.0, -5.0 ] } );
var cga = require('cga');
var lgp = require('lgp');
var vertexNormals = require('guf').vertexNormals;
var calculateNormal = require('guf').calculateNormal;

var geo;
var geoWire;

var fileReader = lgp.fileReader( './../models/donut.obj', function parseObj( text ) {
  var flip = false;
  var results = lgp.objDeserializer( text, { flipYZ: flip, scale: 1.0 } );
  var positions = results.positions;
  var cells = results.cells;

  geo = glGeometry( gl );
  // // Per Vertex Normals
  // geo.attr( 'aPosition', positions );
  // geo.attr( 'aNormal', vertexNormals( positions, cells ) );
  // geo.faces( results.cells );

  // Faceted Normals
  var newPositions = [];
  var newNormals = [];

  for( var i = 0; i < cells.length; i++ ) {
    var a = positions[ cells[ i ][ 0 ] ];
    var b = positions[ cells[ i ][ 1 ] ];
    var c = positions[ cells[ i ][ 2 ] ];
    var n = calculateNormal( a, b, c );
    if( flip ) vec3.scale( n, n, -1.0 );
    newPositions.push( a, b, c );
    newNormals.push( n, n, n );
  }
  geo.attr( 'aPosition', newPositions );
  geo.attr( 'aNormal', newNormals );

  var lines = [];
  for( var i = 0; i < cells.length; i++ ) {
    var i0 = cells[ i ][ 0 ];
    var i1 = cells[ i ][ 1 ];
    var i2 = cells[ i ][ 2 ];
     lines.push( i0, i1 );
     lines.push( i1, i2 );
     lines.push( i2, i0 );
  }

  geoWire = glGeometry( gl );
  geoWire.attr( 'aPosition', positions );
  geoWire.faces( lines, { size: 2 } )
} );


// Set the canvas size to fill the window and its pixel density
var mobile = isMobile( navigator.userAgent );
var dpr = mobile ? 1 : ( window.devicePixelRatio || 1 );
window.addEventListener( 'resize', fit( canvas, null, dpr ), false );

// Setup Matricies
var projection = mat4.create();
var model = mat4.create();
var normalm4 = mat4.create();
var normalm3 = mat3.create();
var view = mat4.create();

// Setup Shaders
var vertexShader = glslify( './shaders/loadObjshader.vert' );
var fragmentShader = glslify( './shaders/loadObjshader.frag' );
var shader = glShader( gl, vertexShader, fragmentShader );

var vertexWireframeShader = glslify( './shaders/loadObjWireframe.vert' );
var fragmentWireframeShader = glslify( './shaders/loadObjWireframe.frag' );
var shaderWireframe = glShader( gl, vertexWireframeShader, fragmentWireframeShader );

var color = [ 1.0, 1.0, 1.0, 1.0 ];
var colorWire = [ 1.0, 1.0, 1.0, 0.250 ];

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

  mat4.multiply( normalm4, model, view );
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
}

function drawGeo()
{
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

function drawGeoWireframe()
{
  if( geoWire ) {
    gl.enable( gl.BLEND );
    gl.blendFunc( gl.SRC_ALPHA, gl.ONE );
    gl.lineWidth( 2.0 );
    geoWire.bind( shaderWireframe );
    if( isMobile ) { shaderWireframe.uniforms.dpr = dpr * 2.0; } else { shaderWireframe.uniforms.dpr = dpr; }
    shaderWireframe.uniforms.uPointSize = 1.0;
    shaderWireframe.uniforms.uProjection = projection;
    shaderWireframe.uniforms.uView = view;
    shaderWireframe.uniforms.uModel = model;
    shaderWireframe.uniforms.uColor = colorWire;
    geoWire.draw( gl.LINES );
    geoWire.unbind();
  }
}
