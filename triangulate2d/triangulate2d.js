var Geometry = require('gl-geometry');
var fit = require('canvas-fit');
var glShader = require('gl-shader');
var mat4 = require('gl-matrix').mat4;
var vec2 = require('gl-matrix').vec2;
var vec3 = require('gl-matrix').vec3;
var glslify = require('glslify');
var mobile = require('is-mobile');
var canvas = document.body.appendChild( document.createElement( 'canvas' ) );
var cam = require('nsc')( canvas, { position: [ 0.0, 0.0, -60.0 ] } );

//lib
var expandPolygon = require('cga').expandPolygon2;
var triangulatePolygon = require('cga').triangulatePolygon2;
var convexHull = require('cga').convexHull2;
var isDiagonal = require('cga').isDiagonal2;

var gl = require( 'gl-context' )( canvas, render );
var isMobile = mobile( navigator.userAgent );
var dpr = isMobile ? 1 : ( window.devicePixelRatio || 1 );
window.addEventListener( 'resize', fit(canvas, null, dpr ), false );

var projection = mat4.create();
var model = mat4.create();
var view = mat4.create();

var shader = glShader( gl, glslify( './shaders/tri2dShader.vert' ), glslify( './shaders/tri2dShader.frag' ) );

var height;
var width;
var frame = 0.0;
var size = 10.0;

var outline = Geometry( gl );
var outlineExpanded = Geometry( gl );
var diagonals = Geometry( gl );
var faces = Geometry( gl );
var facesOutlines = Geometry( gl );
var hull = Geometry( gl );
var hullExpanded = Geometry( gl );

var polyline = [ [0.8506447672843933, -0.6180340051651001],
              [0.8506447672843933, 0.6180340051651001],
              [-0.32492363452911377, 1],
              [-1.0514626502990723, 0],
              [-0.32492363452911377, -1] ];

var polyline = [  [-0.6613480448722839, 0.08401066064834595],
              [-0.40341848134994507, -0.5307407379150391],
              [0.25793102383613586, -0.6147443652153015],
              [0.6613565683364868, -0.08399516344070435],
              [0.40343111753463745, 0.5307521820068359],
              [-0.25792396068573, 0.614754319190979] ];

// var polyline = [
// [ 0.9999999403953552, -1.9999998807907104 ],  //right bottom
// [ 0.9999999403953552, 1.9999998807907104 ],   //right top
// [ -0.32611069083213806, 1.9999998807907104 ],
// [ -0.09971174597740173, 1.789473533630371 ],
// [ 0.04052332043647766, 1.5789474248886108 ],
// [ -0.09202636033296585, 1.3684210777282715 ],
// [ -0.11858176440000534, 1.1578947305679321 ],
// [ -0.031544268131256104, 0.9473683834075928 ],
// [ -0.000030699939088663086, 0.7368420958518982 ],
// [ -0.0015529789961874485, 0.5263158082962036 ],
// [ -0.0003048208018299192, 0.31578946113586426 ],
// [ -3.241851231905457e-14, 0.10526315867900848 ],
// [ -3.241851231905457e-14, -0.10526315867900848 ],
// [ -1.532107773982716e-14, -0.31578946113586426 ],
// [ 0.0000048420433813589625, -0.5263158082962036 ],
// [ 0.00002328012851648964, -0.7368420958518982 ],
// [ 0.031544268131256104, -0.9473683834075928 ],
// [ 0.12015412747859955, -1.1578947305679321 ],
// [ 0.17016366124153137, -1.3684210777282715 ],
// [ 0.22271284461021423, -1.5789474248886108 ],
// [ 0.32247692346572876, -1.789473533630371 ],
// [ 0.43398889899253845, -1.9999998807907104 ] ];

for( var i = 0; i < polyline.length; i++ ){
  polyline[ i ][ 0 ] *= size;
  polyline[ i ][ 1 ] *= size;
}

//Test Case for Triangulation Causes it to fail
// console.log( polyline.length );
for( var k = 0; k < 0; k++ ) {
  var len = polyline.length;
  for( var i = 0; i < len ; i+=2 ) {
    var a = polyline[ i ];
    var b = polyline[ ( i + 1 ) % len ];
    var c = [ ( a[ 0 ] + b[ 0 ] ) * 0.5 , ( a[ 1 ] + b[ 1 ] ) * 0.5 ];
    polyline.splice( i + 1, 0, c );
    len = polyline.length;
  }
}

//Expand the polygon
var expanded = expandPolygon( polyline, 1.0 );

//Add all valid diagonals from polygon
var edges = [];
var len = polyline.length;
for( var j = 0; j < len; j++ ) { for( var i = 0; i < len; i++ ) { if( i > j && isDiagonal( i, j, polyline ) ) { edges.push( polyline[ i ], polyline[ j ] ); } } }
outline.attr( 'aPosition', polyline, { size: 2 } );
outlineExpanded.attr( 'aPosition', expanded, { size: 2 } );

var indicies = triangulatePolygon( polyline );
faces.attr( 'aPosition', polyline, { size: 2 } );
faces.faces( indicies );

//Get the outlines of the Triangles
var faceIndicies = [];
for( var i = 0; i < indicies.length; i++ ) {
    faceIndicies.push( indicies[ i ][ 0 ], indicies[ i ][ 1 ] );
    faceIndicies.push( indicies[ i ][ 1 ], indicies[ i ][ 2 ] );
    faceIndicies.push( indicies[ i ][ 2 ], indicies[ i ][ 0 ] );
}
facesOutlines.attr( 'aPosition', polyline, { size: 2 } );
facesOutlines.faces( faceIndicies );

hull.attr( 'aPosition', polyline, { size: 2 } );
hull.faces( convexHull( polyline ) );

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
  // drawGeo( diagonals, gl.LINES, [ 1.0, 1.0, 1.0, 0.05 ] );
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
  if( isMobile ) { shader.uniforms.dpr = dpr * 2.0; } else { shader.uniforms.dpr = dpr; }
  shader.uniforms.uPointSize = 1.0;
  shader.uniforms.uProjection = projection;
  shader.uniforms.uView = view;
  shader.uniforms.uModel = model;
  shader.uniforms.uColor = color;
  geo.draw( mode );
  geo.unbind();
}
