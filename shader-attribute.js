/**
 * Create shader with attribute param
 *
 * Goals:
 * - research the ways to pass attribute to shader: native way, stackgl way
 *
 * Results:
 * - Shader can be bound once in init, not necessary to bind/relink/setProgram it on each render.
 * - Attributes can be set up once as well, not necessary to do it each render
 * - Attributes should be set locations BEFORE linking
 * - Only one buffer at a time can be bound, in sense that setting up attrib buffers should be done sequentially. First bindBuffer, then do attribs, then other bindBuffer
 * - There is no difference between static/dynamic/stream draw, at least in simple case
 * - enableVertexAttribArray, bindAttribLocation and vertexAttribPointer use index to point the attribArray. It can be any < 15, but persistent.
 * - no-stackgl way is very very detailed and indocumented
 * - stackgl way is a bit hidden as well in docs, but interface is just amazingly better.
 */

var shell = require('gl-now')();
var glslify = require('glslify');
var Shader = require('gl-shader');
var Buffer = require('gl-buffer');

shell.preventDefaults = false;

var data = new Float32Array([
		  -1, 0, 1, 1, 1,
		  0, -1, 0, 0, 0,
		  1, 1,  0, 0, 0]);


shell.on('gl-init', function () {
	var gl = this.gl;
	var shader = this.shader = Shader(gl, `
		precision mediump float;
		attribute vec2 position;
		attribute vec3 color;
		varying vec3 fcolor;
		float pi = 3.1416;
		void main(void) {
			fcolor = color;
			gl_Position = vec4(position, 0, 1);
		}
	`, glslify('\
		precision mediump float;\
		varying vec3 fcolor;\
		void main(void) {\
			gl_FragColor = vec4(fcolor,1);\
		}\
	', {inline: true}));

	var stackgl = true;

	//native webgl way of binding things (quite logical I should say)
	if (!stackgl) {
		//setup attrib
		var buffer = gl.createBuffer()

		//set new buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
		//why stream draw, not something else? no difference at first.
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW)

		//enable first spot for current buffer (0-15)
		gl.enableVertexAttribArray(15)
		//index, size, type, normalized, stride, offset (pointer)
		//obviously stride is 20 ((2 + 3) × 4bytes for float)
		gl.vertexAttribPointer(15, 2, gl.FLOAT, false, 20, 0)
		//enable second location
		gl.enableVertexAttribArray(2)
		//offset is 8 to pass 2 values for position and read 3 values for color
		gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 20, 8)

		//set up attrib pointers
		gl.bindAttribLocation(shader.program, 15, 'position');
		gl.bindAttribLocation(shader.program, 2, 'color');

		//link program - like bring 2 shaders together
		//NOTE: THAT IS OBLIGATORY OTHERWISE BOUND LOCATIONS WILL FAIL TO WORK
		gl.linkProgram(shader.program);
		gl.useProgram(shader.program);

		//clear bound buffer, free memory - no need here as it is init, not render
		// gl.bindBuffer(gl.ARRAY_BUFFER, null)
		// gl.disableVertexAttribArray(0)
		// gl.deleteBuffer(buffer)
	}
	//stackgl-way of doing things
	else {
		var buffer = Buffer(gl, data);

		shader.attributes.color.location = 1;
		shader.attributes.color.pointer(gl.FLOAT, false, 20, 8);
		shader.attributes.position.location = 0;
		shader.attributes.position.pointer(gl.FLOAT, false, 20, 0);

		//unnecessary, IDK why - no need to call gl.bindBuffer(target)
		// buffer.bind();
		shader.bind();
	}



});

shell.on('gl-render', function () {
	var gl = this.gl, shader = this.shader;

	gl.clearColor(.5,.5,.5,1);
	gl.clear(gl.COLOR_BUFFER_BIT);

	gl.drawArrays(gl.LINE_LOOP, 0, 3);
});
