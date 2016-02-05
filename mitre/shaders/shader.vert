precision mediump float;

attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aUv;

uniform mat4 uProjection;
uniform mat4 uModel;
uniform mat4 uView;

uniform mat3 uNormalMatrix;

uniform float dpr;

uniform float uPointSize;

varying vec2 vUv;
varying vec3 vNormal;

void main() {
	vUv = aUv;
	vec4 normal = uModel * vec4( aNormal, 0.0 ) ;
	vNormal = uNormalMatrix * normal.xyz;
	gl_Position = uProjection * uView * uModel * vec4( aPosition, 1.0 );
	gl_PointSize = 1.0 + dpr + uPointSize;
}
