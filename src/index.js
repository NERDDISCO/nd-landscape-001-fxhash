/**
 * @license
 * nd-landscape-001 by NERDDISCO
 * Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)
 * https://nerddis.co/nd-landscape-001
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RenderPass} from "three/examples/jsm/postprocessing/RenderPass.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const pseudoRandomBetween = (random, min, max, round = true) => {
  if (round) {
    return Math.floor(random * (max - min + 1) + min)
  } else {
    return random * (max - min) + min
  }
}

const inRange = (params) => {
  const { ranges, currentValue } = params
  let returnValue = ''

  ranges.every(range => {
    const value = Object.keys(range)[0]
    const min = range[value][0]
    const max = range[value][1]

    if (currentValue >= min && currentValue <= max) {
      returnValue = value
      return false
    }

    return true
  })

  return returnValue
}

class PRNG {
    constructor() {}

    next() {
        return fxrand()
    }

    list({
        size,
        fillWith = null
    }) {
        const values = []

        if (fillWith === null) {
          for (let i = 0; i < size; i++) {
            values.push(this.next())
          }
        } else {
          for (let i = 0; i < size; i++) {
            values.push(fillWith)
          }
        }

        return values
    }
}

class GridTexture {
    constructor({ elements, resolutionMultiplier }) {
        const texture_size = elements * resolutionMultiplier

        this.canvas_texture = new OffscreenCanvas(texture_size, texture_size)
        this.context_texture = this.canvas_texture.getContext("2d")
        this.canvas_map_texture = new THREE.CanvasTexture(this.canvas_texture)
    }

    generate({
        randomValues, elements, resolutionMultiplier, lineWidth, saturation, lightness
    }) {
        const texture_elements = elements
        const texture_size = elements * resolutionMultiplier
        const texture_space = texture_size / texture_elements

        const { context_texture, canvas_map_texture } = this

        context_texture.lineWidth = lineWidth;

        randomValues.forEach((random, i) => {
            context_texture.strokeStyle = `hsl(${360 * random}, ${saturation}%, ${lightness}%)`;

            // Vertical
            context_texture.beginPath();
            context_texture.moveTo(texture_space * i, 0);
            context_texture.lineTo(texture_space * i, texture_size);
            context_texture.stroke();

            context_texture.strokeStyle = `hsl(${360 * random}, ${saturation}%, ${lightness}%)`;

            // Horizontal
            context_texture.beginPath();
            context_texture.moveTo(0, texture_space * i);
            context_texture.lineTo(texture_size, texture_space * i);
            context_texture.stroke();
        })

        // Debug
        // context_texture_debug.drawImage(canvas_texture, 0, 0)

        return canvas_map_texture
    }
}

class DisplacementTexture {
    constructor() {
    }
    generate({
        randomValues,
        elements,
        laneColor,
        laneX,
        laneY,
        laneWidth
    }) {
        const canvas_displacement = new OffscreenCanvas(elements, elements)
        const context_displacement = canvas_displacement.getContext("2d")

        randomValues.forEach((random, i) => {
            let nextRandom = 0;
            if (randomValues[i + 1] === undefined) {
                nextRandom = randomValues[0]
            } else {
                nextRandom = randomValues[i + 1]
            }

            context_displacement.fillStyle = `hsl(${360 * random}, 0%, ${pseudoRandomBetween(nextRandom, 0, 140)}%)`;
            context_displacement.fillRect(pseudoRandomBetween(random, 0, elements - 1), pseudoRandomBetween(nextRandom, 0, elements - 1), 1, 1)
        })

        // Draw the lane in the middle of the scene
        context_displacement.fillStyle = laneColor;
        context_displacement.fillRect(laneX, laneY, laneWidth, elements)

        const canvas_displacement_texture = new THREE.CanvasTexture(canvas_displacement)

        return canvas_displacement_texture
    }
}

const prng = new PRNG()

const cameraPositionX = -1.5;
const cameraPositionY = 0;
const cameraPositionZ = isFxpreview ? 2.75 : 3.25; 
const gridElements = pseudoRandomBetween(fxrand(), 12, 48)
const gridLineWidth = pseudoRandomBetween(fxrand(), 2, 15)
let gridSaturation = 100
const gridLightness = 10
const gridResolutionMultiplier = gridElements * 1
const mountains = pseudoRandomBetween(fxrand(), 50, 500);
const mountainColorful = fxrand() > .25
const _mountainLaneColor = fxrand() > .75 ? 0 : pseudoRandomBetween(fxrand(), 10, 100)
const mountainLaneColor = `hsl(0, 0%, ${_mountainLaneColor}%)`
const _mountainLaneWidth = pseudoRandomBetween(fxrand(), gridElements / 6, gridElements / 4)
const mountainLaneX = (gridElements / 2) - _mountainLaneWidth * .5;
const mountainLaneY = 0;
const mountainLaneWidth = _mountainLaneWidth
const mountainTransparent = fxrand() < .25
const mountainMaxHeight = pseudoRandomBetween(fxrand(), .2, .6, false);
const mountainRotationX = -45
const mountainRotationZ = -65
let bloomStrength = pseudoRandomBetween(fxrand(), .2, .75, false);
const enableDownload = false
const autoRotate = !isFxpreview && !enableDownload
const autoRotateSpeed = .225

// Starlight: Color is monochrome and we have a high bloom & lineWidth is small
if (!mountainColorful && bloomStrength >= .725 && gridLineWidth <= 4) {
  gridSaturation = 0
  bloomStrength = .95
}

window.$fxhashFeatures = {
  mountains: inRange({ currentValue: mountains, ranges:[{ 'handful': [50, 100]}, {'several': [100, 250]}, {'many': [250, 450]}, {'countless': [450, 500]}]}),
  roadHeight: inRange({ currentValue: Math.floor(_mountainLaneColor * mountainMaxHeight), ranges: [{ 'ground level': [0, .1]}, {'raised': [.6, 20]}, {'high': [20, 50]}, {'sky high': [50, 60]}]}),
  roadWidth: inRange({ currentValue: _mountainLaneWidth, ranges: [{'narrow': [2, 6]}, {'wide': [6, 12]}]}),
  color: mountainColorful ? 'rainbow' : 'monochrome',
  gridDetail: inRange({ currentValue: gridElements, ranges: [{ 'low': [12, 18]}, { 'average': [18, 36]}, { 'exhaustive': [36, 48]}]}),
  gridLineWidth: inRange({ currentValue: gridLineWidth, ranges: [{ 'small': [2, 4]}, { 'medium': [4, 10]}, { 'large': [10, 15]}]}),
  bloom: inRange({ currentValue: bloomStrength, ranges: [{'dark': [.2, .3]}, {'light': [.3, .5]}, {'glow': [.5, .75]}, {'starlight': [.75, .875]}]}),
  seeThrough: mountainTransparent,
}

const gridTexture = new GridTexture({
    elements: gridElements,
    resolutionMultiplier: gridResolutionMultiplier,
})
const randomValuesGrid = prng.list({
    size: gridElements + 1,
    fillWith: mountainColorful ? null : fxrand()
})
const _gridTexture = gridTexture.generate({
    randomValues: randomValuesGrid,
    elements: gridElements,
    resolutionMultiplier: gridResolutionMultiplier,
    lineWidth: gridLineWidth,
    saturation: gridSaturation,
    lightness: gridLightness
})

const displacementTexture = new DisplacementTexture()
const randomValuesDisplacement = prng.list({
    size: mountains
})
const _displacementTexture = displacementTexture.generate({
    randomValues: randomValuesDisplacement,
    elements: gridElements,
    laneColor: mountainLaneColor,
    laneX: mountainLaneX,
    laneY: mountainLaneY,
    laneWidth: mountainLaneWidth
})



/**
 * Base
 */
const canvas = document.querySelector('canvas#nd-output')
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000000)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

if (enableDownload) {
  sizes.width = 1024
  sizes.height = 1024
}

const geometry = new THREE.PlaneGeometry(1, 2, 24, 24);
const material = new THREE.MeshStandardMaterial({
    map: _gridTexture,
    transparent: mountainTransparent,
    displacementMap: _displacementTexture,
    displacementScale: mountainMaxHeight,
    depthTest: true,
    depthWrite: true,
    side: THREE.DoubleSide
});

const plane = new THREE.Mesh(geometry, material);

if (isFxpreview) {
  plane.position.x = .175 // .1
  plane.position.y = .1 // -0.01
} else {
  plane.position.x = .05
  plane.position.y = -.01
}

plane.rotation.x = THREE.MathUtils.degToRad(mountainRotationX)
plane.rotation.z = THREE.MathUtils.degToRad(mountainRotationZ)


scene.add(plane);


window.addEventListener('resize', () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/*
 * Light
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 10)
scene.add(ambientLight)

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(40, sizes.width / sizes.height, 0.1, 20);
camera.position.x = cameraPositionX;
camera.position.y = cameraPositionY;
camera.position.z = cameraPositionZ;
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.target.set(0, 0, 0)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    preserveDrawingBuffer: enableDownload 
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Only provide a download function if downloads are enabled
// document.addEventListener()
  window.renderer = renderer

  window.downloadPreview = () => {
    let link = document.createElement("a");
    link.download = fxhash;
    link.href = window.renderer.domElement.toDataURL();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

// Post Processing
const effectComposer = new EffectComposer(renderer);
effectComposer.setSize(sizes.width, sizes.height);
effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const renderPass = new RenderPass(scene, camera);
effectComposer.addPass(renderPass);

const bloom = new UnrealBloomPass();
bloom.strength = bloomStrength;
effectComposer.addPass(bloom)

/**
 * Animate
 */
const clock = new THREE.Clock()
let previousTime = 0

const tick = () => {
    const elapsedTime = clock.getElapsedTime()

    controls.update()

    if (autoRotate) {
      plane.rotation.z = elapsedTime * autoRotateSpeed
      // plane.rotation.x += autoRotateSpeed
      // plane.rotation.y += autoRotateSpeed
    }

    effectComposer.render();

    window.requestAnimationFrame(tick)
}

// Render the scene
effectComposer.render()

// Take the screenshot for fxhash
fxpreview()

// Start the animation
tick()