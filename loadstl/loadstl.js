//Setup Canvas
var canvas = document.body.appendChild( document.createElement( 'canvas' ) );

//Get WebGL Context
var gl = require('gl-context')( canvas, render );

//Import Webgl & Math Libraries
var glGeometry = require('gl-geometry');
var glShader = require('gl-shader');
var glslify = require('glslify');
var clear = require('gl-clear')();
var mat4 = require('gl-matrix').mat4;
var mat3 = require('gl-matrix').mat3;

//Import Web Helper Libraries
var fit = require('canvas-fit');
var isMobile = require('is-mobile');

//Import YCAM GRP Libraries
var cam = require('nsc')( canvas, { position: [ 0.0, 0.0, -4.0 ] } );
var cga = require('cga');
var lgp = require('lgp');
var vertexNormals = require('guf').vertexNormals;
var calculateNormal = require('guf').calculateNormal;

var geo;
var geoWire;

var fileReader = lgp.fileReader( './../models/vase.stl', function parseObj( text ) {
  var results = lgp.stlDeserializer( text, { 'flipYZ' : true  } );

  var positions = results[0].positions;
  var normals = results[0].normals;

  geo = glGeometry( gl );
  // //Per Vertex Normals
  geo.attr( 'aPosition', positions );
  geo.attr( 'aNormal', normals );

  var lines = [];
  for( var i = 0; i < positions.length; i += 3 ) {
    var i0 = i;
    var i1 = i + 1;
    var i2 = i + 2;
    lines.push( i0, i1, i1, i2, i2, i0 );
  }

  geoWire = glGeometry( gl );
  geoWire.attr( 'aPosition', positions );
  geoWire.faces( lines, { size: 2 } );
} );

//Set the canvas size to fill the window and its pixel density
var mobile = isMobile( navigator.userAgent );
var dpr = mobile ? 1 : ( window.devicePixelRatio || 1 );
window.addEventListener( 'resize', fit( canvas, null, dpr ), false );

//Setup Matricies
var projection = mat4.create();
var model = mat4.fromRotation( mat4.create(), Math.PI * 1.175, [ 1, 0, 0 ] );
var normalm4 = mat4.create();
var normalm3 = mat3.create();
var view = mat4.create();

//Setup Shaders
var vertexShader = glslify( './shaders/loadStlShader.vert' );
var fragmentShader = glslify( './shaders/loadStlShader.frag' );
var shader = glShader( gl, vertexShader, fragmentShader );

var vertexWireframeShader = glslify( './shaders/loadStlWireframe.vert' );
var fragmentWireframeShader = glslify( './shaders/loadStlWireframe.frag' );
var shaderWireframe = glShader( gl, vertexWireframeShader, fragmentWireframeShader );

var color = [ 1.0, 1.0, 1.0, 1.0 ];
var colorWire = [ 1.0, 1.0, 1.0, 1.0 ];
//Setup Sketch Variables
var height;
var width;

function update() {
  //set projection
  width  = gl.drawingBufferWidth;
  height = gl.drawingBufferHeight;
  var aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
  var fieldOfView = Math.PI / 4.0;
  var near = 0.01;
  var far  = 1000.0;
  mat4.perspective( projection, fieldOfView, aspectRatio, near, far );
  //get view from camera
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

  //set blending
  gl.enable( gl.DEPTH_TEST );

  drawGeo();
  drawGeoWireframe();
}

function drawGeo()
{
  if( geo ) {

    // gl.polygonOffset( 0.0, 0.0 );
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
    gl.enable( gl.POLYGON_OFFSET_FILL );
    gl.polygonOffset( 2.0, 2.0 );
    gl.enable( gl.BLEND );
    gl.blendFunc( gl.SRC_ALPHA, gl.ONE );
    gl.lineWidth( 1.0 );
    geoWire.bind( shaderWireframe );
    if( isMobile ) { shaderWireframe.uniforms.dpr = dpr * 2.0; } else { shaderWireframe.uniforms.dpr = dpr; }
    shaderWireframe.uniforms.uPointSize = 1.0;
    shaderWireframe.uniforms.uProjection = projection;
    shaderWireframe.uniforms.uView = view;
    shaderWireframe.uniforms.uModel = model;
    shaderWireframe.uniforms.uColor = colorWire;
    geoWire.draw( gl.LINES );
    geoWire.unbind();
    gl.disable( gl.POLYGON_OFFSET_FILL );
  }
}
