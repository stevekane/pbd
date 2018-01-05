module.exports.RenderDistanceConstraints = RenderDistanceConstraints
module.exports.RenderPoints = RenderPoints

function RenderDistanceConstraints(regl) {
  return regl({
    vert: `
      precision mediump float;

      attribute vec3 position;

      void main () {
        gl_Position = vec4(position, 1);
      }
    `,
    frag: `
      precision mediump float;

      const vec4 color = vec4(.1, .2, .5, 1);

      void main () {
        gl_FragColor = color; 
      }      
    `,
    attributes: {
      position: regl.prop("positions") 
    },
    count: regl.prop("count"),
    primitive: "lines"
  })
}

function RenderPoints(regl) {
  return regl({
    vert: `
      precision mediump float; 

      attribute vec3 position;
      attribute float inverse_mass;

      uniform float size;

      varying vec4 color;

      void main () {
        color = vec4(inverse_mass, .2, .5, 1);
        gl_PointSize = size;
        gl_Position = vec4(position, 1);
      }
    `,
    frag: `
      precision mediump float;

      varying vec4 color;

      void main () {
        gl_FragColor = color;
      }
    `,
    uniforms: {
      size: regl.prop("size") 
    },
    attributes: {
      inverse_mass: regl.prop("inverseMasses"),
      position: regl.prop("positions")
    },
    count: regl.prop("count"),
    primitive: "points"
  })
}
