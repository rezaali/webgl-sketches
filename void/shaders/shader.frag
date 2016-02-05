precision mediump float;

uniform vec4 uColor;

varying vec2 vUv;
varying vec3 vNormal;

void main() {
	vec3 normal = normalize( -vNormal );
	float diffuse = max( dot( normal, vec3( 0.0, 0.0, -1.0 ) ), 0.0 );
	gl_FragColor = vec4( uColor.rgb * diffuse, uColor.a );
}
