module.exports.Render = Render
module.exports.updateDistanceConstraintLines = updateDistanceConstraintLines

function Render(regl) {
  return regl({
    vert: `
      precision mediump float;

      attribute vec3 position;

      uniform mat4 view; uniform mat4 projection;

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

function updateDistanceConstraintLines(ps, cs, cls) {
  var l = cs.length
  var i = 0
  var o = 0
  var c
  var i1, i2

  while (i < l) {
    c = cs[i++]
    i1 = c.i1 * 3
    i2 = c.i2 * 3
    cls[o++] = ps[i1++]
    cls[o++] = ps[i1++]
    cls[o++] = ps[i1++]
    cls[o++] = ps[i2++]
    cls[o++] = ps[i2++]
    cls[o++] = ps[i2++]
  }
  return l * 2
}

