precision mediump float;

attribute vec3 aPosition;

uniform mat4 uProjection;
uniform mat4 uModel;
uniform mat4 uView;

uniform float dpr;

uniform float instance;
uniform float uPointSize;

void main() {
	gl_Position = uProjection * uView * uModel * vec4( aPosition, 1.0 );
	gl_PointSize = 1.0 + dpr + uPointSize;
}
