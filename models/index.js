var mat4 = require('gl-matrix').mat4;
var quat = require('gl-matrix').quat;

module.exports = [
  {
    path : './models/beethoven.obj',
    matrix: mat4.fromRotation( mat4.create(), Math.PI * 0.5, [ -1, 0, 0 ] ),
    opts : { flip: false, scale: 0.4 }
  },
  {
    path : './models/beveledcube.obj',
    matrix: mat4.create(),
    opts : { flip: false, scale: 1.0 }
  },
  {
    path : './models/bigguy.obj',
    matrix: mat4.fromTranslation( mat4.create(), [ 0, -0.25, 0 ] ),
    opts : { flip: false, scale: 0.2 }
  },
  {
    path : './models/buckminister.obj',
    matrix: mat4.create(),
    opts : { flip: false, scale: 1.75 }
  },
  {
    path : './models/cube.obj',
    matrix: mat4.create(),
    opts : { flip: false, scale: 1.0 }
  },
  {
    path : './models/cupid.obj',
    matrix: mat4.fromTranslation( mat4.create(), [ 0, -1.6, 0 ] ),
    opts : { flip: false, scale: 0.3 }
  },
  {
    path : './models/densecube.obj',
    matrix: mat4.create(),
    opts : { flip: false, scale: 0.2 }
  },
  {
    path : './models/dodecahedron.obj',
    matrix: mat4.fromRotation( mat4.create(), Math.PI * 0.125, [ 1, 1, 1 ] ),
    opts : { flip: false, scale: 1.0 }
  },
  {
    path : './models/donut.obj',
    matrix: mat4.fromRotation( mat4.create(), Math.PI * 0.25, [ -1, 0, 0 ] ),
    opts : { flip: false, scale: 1.75 }
  },
  {
    path : './models/geodesicdome.obj',
    matrix: mat4.create(),
    opts : { flip: false, scale: 1.75 }
  },
  {
    path : './models/icosahedron.obj',
    matrix: mat4.fromRotation( mat4.create(), Math.PI * 0.5, [ 1, 1, 1 ] ),
    opts : { flip: false, scale: 1.5 }
  },
  {
    path : './models/monsterfrog.obj',
    matrix: mat4.create(),
    opts : { flip: false, scale: 0.09 }
  },
  {
    path : './models/octahedron.obj',
    matrix: mat4.fromRotation( mat4.create(), Math.PI * 0.25, [ 1, 1, 1 ] ),
    opts : { flip: false, scale: 1.75 }
  },
  {
    path : './models/soccerball.obj',
    matrix: mat4.create(),
    opts : { flip: false, scale: 1.0 }
  },
  {
    path : './models/sphericalcube.obj',
    matrix: mat4.create(),
    opts : { flip: false, scale: 1.65 }
  },
  {
    path : './models/tetrahedron.obj',
    matrix: mat4.fromRotation( mat4.create(), Math.PI * 0.5, [ 0, 1, 0 ] ),
    opts : { flip: false, scale: 1.75 }
  },
  {
    path : './models/torii.obj',
    matrix: mat4.fromTranslation( mat4.create(), [ -1.75, -0.75, 0 ] ),
    opts : { flip: false, scale: 0.50 }
  },
  {
    path : './models/venus.obj',
    matrix: mat4.fromRotationTranslation( mat4.create(), quat.setAxisAngle( quat.create(), [ -1, 0, 0 ], Math.PI * 0.5 ), [ 0, -0.35, 0 ] ),
    opts : { flip: false, scale: 0.45 }
  },
  {
    path : './models/suzanne.obj',
    matrix: mat4.create(),
    opts : { flip: false, scale: 1.75 }
  },
  {
    path : './models/cubetri.obj',
    matrix: mat4.create(),
    opts : { flip: false, scale: 1.0 }
  },
];
