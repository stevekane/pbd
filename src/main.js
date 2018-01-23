const regl = require("regl")()
const camera = require("regl-camera")(regl, { 
  distance: 10, 
  theta: Math.PI / 3,
  phi: Math.PI / 6
})
const solve = require("./solving")
const render = require("./rendering")(regl)
const { normal } = require("./triangles")

const AXES_LENGTH = 10
const INIT_DELAY = 100
const DT = 1 / 60
const GRAVITY = [ 0, -100, 0 ]
const DAMPING = .95
const COLOR_1 = [ .9, .34, .2, 1 ]
const COLOR_2 = [ .1, .91, .24, 1 ]
const COLOR_3 = [ .2, .23, .7, 1 ]
const COLOR_4 = [ .1, .1, .1, .2 ]
const RED = [ 1, 0, 0, 1 ]
const GREEN = [ 0, 1, 0, 1 ]
const BLUE = [ 0, 0, 1, 1 ]
const ITERATION_COUNT = 20

const points = []
const constraints = {
  positions: [],
  distances: [],
  collisions: []
}

const meshes = [
  new Mesh([ [ 0, 10, 0 ], [ 0, -10, 10 ], [ 0, -10, -10 ] ]) // triangle
]

const LINK_COUNT = 1 << 6
const CHAIN_LENGTH = 10
const LINK_LENGTH = CHAIN_LENGTH / LINK_COUNT
const MASS = 1
const INVERSE_POINT_MASS = 1 / (MASS / (LINK_COUNT + 1))
const STIFFNESS = 1

for (var i = 0; i <= LINK_COUNT; i++) {
  points.push(new Point(LINK_LENGTH * i, 0, 0, INVERSE_POINT_MASS))
}
for (var i = 1; i <= LINK_COUNT; i++) {
  constraints.distances.push({
    i1: i - 1, 
    i2: i,
    restLength: LINK_LENGTH,
    stiffness: STIFFNESS
  })
}
constraints.positions.push({ 
  i: 0, 
  position: [ 0, 0, 0 ]
})
constraints.positions.push({ 
  i: LINK_COUNT, 
  position: [ CHAIN_LENGTH, 0, 0 ]
})

function Point(x, y, z, inverseMass) {
  this.inverseMass = inverseMass
  this.velocity = [ 0, 0, 0 ]
  this.position = [ x, y, z ]
  this.predicted = [ 0, 0, 0 ]
}

function Mesh(triangles) {
  this.triangles = triangles
  this.normals = []

  for (var i = 0; i < triangles.length; i += 3) {
    this.normals.push(normal(triangles.slice(i, 3)))
  }
}

function init() {
  regl.frame(update)
}

function update() {
  solve(DT, ITERATION_COUNT, DAMPING, GRAVITY, constraints, meshes, points)
  camera(draw)
}

function draw() {
  const positions = constraints.distances.reduce(function (cs, c) {
    cs.push(points[c.i1].position)
    cs.push(points[c.i2].position)
    return cs
  }, [])

  for (const m of meshes) {
    render({
      positions: m.triangles,
      count: m.triangles.length,
      color: COLOR_4,
      primitive: "triangles"
    })
  }
  render({
    positions: points.map(p => p.position),
    count: points.length,
    color: COLOR_1,
    primitive: "points"
  })
  render({
    positions: positions,
    count: constraints.distances.length * 2,
    color: COLOR_3,
    primitive: "lines"
  })
  // axes
  render({
    positions: [ [ 0, 0, 0 ], [ AXES_LENGTH, 0, 0 ] ],
    count: 2,
    color: RED,
    primitive: "lines"
  })
  render({
    positions: [ [ 0, 0, 0 ], [ 0, AXES_LENGTH, 0 ] ],
    count: 2,
    color: GREEN,
    primitive: "lines"
  })
  render({
    positions: [ [ 0, 0, 0 ], [ 0, 0, AXES_LENGTH ] ],
    count: 2,
    color: BLUE,
    primitive: "lines"
  })
}

window.points = points
window.constraints = constraints
setTimeout(init, INIT_DELAY)
