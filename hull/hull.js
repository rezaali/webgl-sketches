var Geometry = require('gl-geometry');
var fit = require('canvas-fit');
var glShader = require('gl-shader');
var mat4 = require('gl-matrix').mat4;
var vec2 = require('gl-matrix').vec2;
var vec3 = require('gl-matrix').vec3;
var glslify = require('glslify');
var mobile = require('is-mobile');
var canvas = document.body.appendChild( document.createElement( 'canvas' ) );

var expandPolygon = require('cga').expandPolygon2;
var triangulatePolygon = require('cga').triangulatePolygon2;
var convexHull = require('cga').convexHull2;
var isDiagonal = require('cga').isDiagonal2;

var gl = require( 'gl-context' )( canvas, render );
var isMobile = mobile( navigator.userAgent );
var dpr = isMobile ? 1 : ( window.devicePixelRatio || 1 );
window.addEventListener( 'resize', fit(canvas, null, dpr ), false );

var cam = require('nsc')( canvas, { position: [ 0.0, 0.0, -50.0 ]} );

var projection = mat4.create();
var model = mat4.create();
var view = mat4.create();

var shader = glShader( gl, glslify( './shaders/hull.vert' ), glslify( './shaders/hull.frag' ) );

var height;
var width;
var frame = 0.0;
var size = 30.0;

var outline = Geometry( gl );
var outlineExpanded = Geometry( gl );
var diagonals = Geometry( gl );
var faces = Geometry( gl );
var facesOutlines = Geometry( gl );
var hull = Geometry( gl );
var hullExpanded = Geometry( gl );

var ycam = require('ycam').positions;

for( var i = 0; i < ycam.length; i++ ){
  ycam[ i ][ 0 ] *= size;
  ycam[ i ][ 1 ] *= size;
}

//Test Case for Triangulation Causes it to fail
// console.log( ycam.length );
for( var k = 0; k < 2; k++ ) {
  var len = ycam.length;
  for( var i = 0; i < len ; i+=2 ) {
    var a = ycam[ i ];
    var b = ycam[ ( i + 1 ) % len ];
    var c = [ ( a[ 0 ] + b[ 0 ] ) * 0.5 , ( a[ 1 ] + b[ 1 ] ) * 0.5 ];
    ycam.splice( i + 1, 0, c );
    len = ycam.length;
  }
}

//Expand the polygon
var expanded = expandPolygon( ycam, 1.0 );

//Add all valid diagonals from polygon
var edges = [];
var len = ycam.length;
for( var j = 0; j < len; j++ ) { for( var i = 0; i < len; i++ ) { if( i > j && isDiagonal( i, j, ycam ) ) { edges.push( ycam[ i ], ycam[ j ] ); } } }
outline.attr( 'aPosition', ycam, { size: 2 } );
outlineExpanded.attr( 'aPosition', expanded, { size: 2 } );

//Triangulate the Polygon
var indicies = triangulatePolygon( ycam );
faces.attr( 'aPosition', ycam, { size: 2 } );
faces.faces( indicies );

//Get the outlines of the Triangles
var faceIndicies = [];
for( var i = 0; i < indicies.length; i++ ) {
  faceIndicies.push( indicies[ i ][ 0 ], indicies[ i ][ 1 ] );
  faceIndicies.push( indicies[ i ][ 1 ], indicies[ i ][ 2 ] );
  faceIndicies.push( indicies[ i ][ 2 ], indicies[ i ][ 0 ] );
}
facesOutlines.attr( 'aPosition', ycam, { size: 2 } );
facesOutlines.faces( faceIndicies );

hull.attr( 'aPosition', ycam, { size: 2 } );
hull.faces( convexHull( ycam ) );

hullExpanded.attr( 'aPosition', expanded, { size: 2 } );
hullExpanded.faces( convexHull( expanded ) );

diagonals.attr( 'aPosition', edges, { size: 2 } );

function update() {
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

  frame += 0.1;
}

function render() {
  update();
  gl.viewport( 0, 0, width, height );
  gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
  gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
  gl.disable( gl.DEPTH_TEST );

  gl.enable( gl.BLEND );
  gl.blendFunc( gl.SRC_ALPHA, gl.ONE );

  drawGeo( hull, gl.LINE_LOOP, [ 1.0, 0.0, 0.0, 0.75 ] );
  drawGeo( hullExpanded, gl.LINE_LOOP, [ 1.0, 0.0, 0.0, 0.75 ] );
  gl.lineWidth( 2.0 );
  drawGeo( diagonals, gl.LINES, [ 1.0, 1.0, 1.0, 0.05 ] );
  drawGeo( faces, gl.TRIANGLES, [ 0.137254902, 0.7137254902, 0.737254902, 0.25 ] );
  gl.lineWidth( 1.5 );
  drawGeo( facesOutlines, gl.LINES, [ 0.0, 1.0, 1.0, 1.0 ] );
  gl.lineWidth( 2.5 );
  drawGeo( outlineExpanded, gl.LINE_LOOP, [ 0.0, 1.0, 1.0, 0.75 ] );
  drawGeo( outlineExpanded, gl.POINTS, [ 0.0, 1.0, 0.0, 1.0 ] );
  drawGeo( outline, gl.LINE_LOOP, [ 1.0, 1.0, 1.0, 0.35 ] );
  drawGeo( outline, gl.POINTS, [ 1.0, 1.0, 1.0, 1.0 ] );
}

function drawGeo( geo, mode, color ) {
  geo.bind( shader );
  shader.uniforms.time = frame;
  if( isMobile ) { shader.uniforms.dpr = dpr * 2.0; } else { shader.uniforms.dpr = dpr; }
  shader.uniforms.uPointSize = 1.0;
  shader.uniforms.uProjection = projection;
  shader.uniforms.uView = view;
  shader.uniforms.uModel = model;
  shader.uniforms.uColor = color;
  geo.draw( mode );
  geo.unbind();
}
