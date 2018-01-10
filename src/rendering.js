module.exports = render

function render (regl) {
  return regl({
    vert: `
      precision mediump float;

      attribute vec3 position;

      uniform mat4 view; 
      uniform mat4 projection;

      uniform float size;
      uniform vec4 color;

      void main () {
        gl_PointSize = size;
        gl_Position = projection * view * vec4(position, 1);
      }
    `,
    frag: `
      precision mediump float;

      uniform vec4 color;

      void main () {
        gl_FragColor = color; 
      }      
    `,
    cull: { 
      enable: true 
    },
    uniforms: {
      size: (c, p) => p.size || 10,
      color: regl.prop("color")
    },
    attributes: {
      position: regl.prop("positions") 
    },
    count: regl.prop("count"),
    primitive: regl.prop("primitive")
  })
}
