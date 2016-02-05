// Setup Canvas
var canvas = document.body.appendChild( document.createElement( 'canvas' ) );

// var canvas = document.body.appendChild( document.createElement( 'canvas' ) );
// canvas.style.zIndex = 1;
// Get WebGL Context
var gl = require('gl-context')( canvas, { preserveDrawingBuffer: true }, render );

// Import Webgl & Math Libraries
var glGeometry = require('gl-geometry');
var glShader = require('gl-shader');
var glslify = require('glslify');
var clear = require('gl-clear')( { color: [ 0.0, 0.0, 0.0, 1.0 ] } );
var mat4 = require('gl-matrix').mat4;
var mat3 = require('gl-matrix').mat3;
var vec3 = require('gl-matrix').vec3;
var quat = require('gl-matrix').quat;

// Import Web Helper Libraries
var fit = require('canvas-fit');
var isMobile = require('is-mobile');

// Import YCAM GRP Libraries
var cam = require('nsc')( canvas, {
  position: [ 0.0, 0.0, -50.0 ],
  rotation: mat4.fromQuat( mat4.create(), quat.rotationTo( quat.create(), [ 0, 0, -1 ], [ 0, -0.5, 0 ] ) ),
} );
var cga = require('cga');
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
var MeshIntegrity = mda.MeshIntegrity;
var TriangulateOperator = mda.TriangulateOperator;
var WireframeOperator = mda.WireframeOperator;
var LoopSmoothOperator = mda.LoopOperator;
var CatmullClarkOperator = mda.CatmullClarkOperator;
var QuadSubdivideOperator = mda.QuadSubdivideOperator;
var MeshCentroid = mda.MeshCentroid;
var vertexNormals = require('guf').vertexNormals;
var calculateNormal = require('guf').calculateNormal;
var models = require('./../models');

//Interaction
var keyPressed = require('key-pressed');

var omesh, meshOut, meshOutTri;
var positions, cells;
var geoOut;
var geoWireOut, geoWire;
var geoPointsOut, geoPoints;

var renderSolid = true;
var color = [ 1.0, 1.0, 1.0, 1.0 ];
var colorPoints = [ 1.0, 1.0, 1.0, 0.125 ];
var colorWire = [ 1.0, 1.0, 1.0, 0.25 ];

var model = mat4.create();

function setupGeometry() {
  var positions = [];
  var total = 5;
  var inc = ( Math.PI * 2.0 ) / total;
  var rad0 = 1.0;
  var rad1 = 0.75;
  var height = 0.4;
  for( var i = 0; i < total; i++ ) {
    positions.push( [ rad0 * Math.sin( - i * inc ), rad0 * Math.cos( - i * inc ), height ] );
  }

  for( var i = 0; i < total; i++ ) {
    positions.push( [ rad1 * Math.sin( i * inc + Math.PI ), rad1 * Math.cos( i * inc + Math.PI ), -height ] );
  }

  var cells = [
    [ 0, 1, 2, 3, 4 ],
    [ 5, 6, 7, 8, 9 ],
    [ 0, 8, 7 ],
    [ 0, 7, 1 ],
    [ 1, 7, 6 ],
    [ 1, 6, 2 ],
    [ 2, 6, 5 ],
    [ 2, 5, 3 ],
    [ 3, 5, 9 ],
    [ 3, 9, 4 ],
    [ 4, 9, 8 ],
    [ 4, 8, 0 ]
  ];

  meshOut = undefined;
  omesh = new Mesh();
  omesh.setPositions( positions );
  omesh.setCells( cells );
  omesh.process();

  var flen = omesh.getFaces().length;
  ScaleOperator( omesh, 20.0 );

  var inner = DuplicateOperator( omesh );
  ScaleOperator( inner, 0.95 );
  InvertOperator( inner );
  MoveOperator( inner, [ 0, 0, -0.25 ] );

  // console.log( Math.sin( frame ) );
  var flenOff = omesh.getFaces().length;
  CombineOperator( omesh, inner );
  ExtrudeOperator( omesh, 0, 0.0, 0.50 );
  PipeOperator( omesh, 0, flenOff );


  var flen = omesh.getFaces().length;

  // for( var i = 2; i < flen; i++ ) {
    // ExtrudeOperator( omesh, i, 0.0, 2.0 );
    // ExtrudeOperator( omesh, i, -1.0, 0.0 );
  // }

  // ExtrudeOperator( omesh, 0, 0.0, 2.0 );
  // ExtrudeOperator( omesh, 0, -15.0, 8.0 );
  // WireframeOperator( omesh, 3.0 );
  buildGeometry();
  // smooth();
  // smooth();
  // smooth();
}

function buildGeometry() {
  if( !meshOut ) {
    meshOut = DuplicateOperator( omesh );
  }

  geoWireOut = createGeoWire( meshOut.getPositions(), meshOut.getCells() );

  meshOutTri = DuplicateOperator( meshOut );
  TriangulateOperator( meshOutTri );

  positions = positionsOut = meshOutTri.getPositions();
  cells = cellsOut = meshOutTri.getCells();

  geoOut = createGeo( positionsOut, cellsOut );
  geoPointsOut = createGeoPoints( positionsOut );
}

function smooth() {
  // CatmullClarkOperator( meshOut );
  TriangulateOperator( meshOut );
  LoopSmoothOperator( meshOut );
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

// Setup Sketch Variables
var height;
var width;
var frame = Math.PI;


function update() {
  setupGeometry();
  // set projection
  width  = gl.drawingBufferWidth;
  height = gl.drawingBufferHeight;
  var aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
  var fieldOfView = Math.PI / 3.0;
  var near = 0.01;
  var far  = 1000.0;
  mat4.perspective( projection, fieldOfView, aspectRatio, near, far );

  // model = mat4.fromRotation( model, frame, [ 0, 1, 0 ] );
  // get view from camera
  cam.view( view );
  cam.update();

  mat4.copy( normalm4, view );
  mat4.invert( normalm4, normalm4 );
  mat4.transpose( normalm4, normalm4 );
  mat3.fromMat4( normalm3, normalm4 );
  frame += 0.05;
}

function render() {
  update();
  gl.viewport( 0, 0, width, height );
  clear( gl );
  if( renderSolid ) {
    gl.enable( gl.DEPTH_TEST );
    drawGeo( geoOut );
  }
  else {
    gl.disable( gl.DEPTH_TEST );
  }
  drawGeoWireframe( geoWireOut );
  drawGeoPoints( geoPointsOut );
}

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
    shaderDebug.uniforms.uPointSize = 0.10;
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
    shaderDebug.uniforms.uColor = colorWire;
    geoWire.draw( gl.LINES );
    geoWire.unbind();
  }
}

window.addEventListener( 'keydown', function( event ) {
  if( keyPressed( 'S' ) ) {
    lgp.imageWriter( 'cup.png', canvas.toDataURL('image/png') );
    return;
  }
  if( keyPressed( 'E' ) ) {
    lgp.fileWriter( "cup.stl", lgp.stlSerializer( { positions: positions, cells: cells } ) );
    lgp.fileWriter( "cup.obj", lgp.objSerializer( { positions: positions, cells: cells } ) );
    return;
  }
  if( keyPressed( 'W' ) ) {
    renderSolid = !renderSolid;
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
