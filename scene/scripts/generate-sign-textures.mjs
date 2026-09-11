import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { QUESTION_BANK } from '../src/shared/question-bank.ts'

const require = createRequire(import.meta.url)
const { PNG } = require('pngjs')
const outputDir = path.resolve('assets/scene/signs')
fs.mkdirSync(outputDir, { recursive: true })

const font = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '11001', '10101', '10011', '10011', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  "'": ['00100', '00100', '00000', '00000', '00000', '00000', '00000'],
  '"': ['01010', '01010', '00000', '00000', '00000', '00000', '00000'],
  ',': ['00000', '00000', '00000', '00000', '00110', '00100', '01000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '00110', '00110'],
  ':': ['00000', '00110', '00110', '00000', '00110', '00110', '00000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '/': ['00001', '00010', '00100', '00100', '01000', '10000', '00000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '&': ['01100', '10010', '01100', '01010', '10001', '10010', '01101'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000']
}

function rgba(hex, alpha = 255) {
  const value = hex.replace('#', '')
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16), alpha]
}

function pixel(png, x, y, color) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return
  const offset = (png.width * y + x) * 4
  png.data[offset] = color[0]
  png.data[offset + 1] = color[1]
  png.data[offset + 2] = color[2]
  png.data[offset + 3] = color[3]
}

function rect(png, x, y, width, height, color) {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) pixel(png, column, row, color)
  }
}

function outline(png, x, y, width, height, color, thickness = 3) {
  rect(png, x, y, width, thickness, color)
  rect(png, x, y + height - thickness, width, thickness, color)
  rect(png, x, y, thickness, height, color)
  rect(png, x + width - thickness, y, thickness, height, color)
}

function measure(text, scale, spacing = scale) {
  return Math.max(0, text.length * (5 * scale + spacing) - spacing)
}

function drawText(png, text, x, y, scale, color, spacing = scale) {
  let cursor = x
  for (const character of text.toUpperCase()) {
    const glyph = font[character] ?? font['?']
    for (let row = 0; row < glyph.length; row += 1) {
      for (let column = 0; column < glyph[row].length; column += 1) {
        if (glyph[row][column] === '1') rect(png, cursor + column * scale, y + row * scale, scale, scale, color)
      }
    }
    cursor += 5 * scale + spacing
  }
}

function centered(png, text, y, scale, color, spacing = scale) {
  drawText(png, text, Math.floor((png.width - measure(text, scale, spacing)) / 2), y, scale, color, spacing)
}

function centeredHeavy(png, text, y, scale, color, spacing = scale) {
  const x = Math.floor((png.width - measure(text, scale, spacing)) / 2)
  drawText(png, text, x, y, scale, color, spacing)
  drawText(png, text, x + 1, y, scale, color, spacing)
  drawText(png, text, x, y + 1, scale, color, spacing)
}

function wrap(text, maxCharacters) {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    const candidate = line ? line + ' ' + word : word
    if (candidate.length > maxCharacters && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : [text]
}

function fitWrappedQuestion(png, questionText, availableWidth = 820, availableHeight = 560) {
  for (let scale = 14; scale >= 6; scale -= 1) {
    const charWidth = 6 * scale
    const maxChars = Math.floor(availableWidth / charWidth)
    const lines = wrap(questionText, maxChars)
    const lineHeight = 10 * scale
    const totalHeight = lines.length * lineHeight
    const maxWordLen = Math.max(...questionText.split(/\s+/).map(w => w.length))
    if (measure('A'.repeat(maxWordLen), scale) <= availableWidth && totalHeight <= availableHeight && lines.length <= 4) {
      return { scale, lines, lineHeight, totalHeight }
    }
  }
  const minScale = 6
  const maxChars = Math.floor(availableWidth / (6 * minScale))
  const lines = wrap(questionText, maxChars)
  return { scale: minScale, lines, lineHeight: 10 * minScale, totalHeight: lines.length * 10 * minScale }
}

function fitWrappedOption(png, optionText, availableWidth = 760, availableHeight = 380) {
  for (let scale = 12; scale >= 6; scale -= 1) {
    const charWidth = 6 * scale
    const maxChars = Math.floor(availableWidth / charWidth)
    const lines = wrap(optionText, maxChars)
    const lineHeight = 10 * scale
    const totalHeight = lines.length * lineHeight
    const maxWordLen = Math.max(...optionText.split(/\s+/).map(w => w.length))
    const wordPixelWidth = measure('A'.repeat(maxWordLen), scale)
    if (wordPixelWidth <= availableWidth && totalHeight <= availableHeight && lines.length <= 3) {
      return { scale, lines, lineHeight, totalHeight }
    }
  }
  const minScale = 6
  const maxChars = Math.floor(availableWidth / (6 * minScale))
  const lines = wrap(optionText, maxChars)
  return { scale: minScale, lines, lineHeight: 10 * minScale, totalHeight: lines.length * 10 * minScale }
}

function boardTexture(question, choiceA, choiceB, index) {
  const png = new PNG({ width: 1024, height: 1024 })
  rect(png, 0, 0, png.width, png.height, rgba('#070B1E'))
  rect(png, 32, 32, 960, 960, rgba('#0E1535'))
  outline(png, 32, 32, 960, 960, rgba('#795CE6'), 6)

  // Header: Clean and readable at top
  centeredHeavy(png, 'SHADOW PARK', 70, 6, rgba('#9DAEFF'))
  rect(png, 96, 128, 832, 3, rgba('#35467A'))

  // Dominant Question Area
  const layout = fitWrappedQuestion(png, question, 820, 560)
  const startY = 160 + Math.max(0, Math.floor((560 - layout.totalHeight) / 2))
  layout.lines.forEach((line, lineIndex) => {
    centeredHeavy(png, line, startY + lineIndex * layout.lineHeight, layout.scale, rgba('#FFFFFF'))
  })

  // Footer: Clean readable secondary affordance
  rect(png, 96, 820, 832, 3, rgba('#35467A'))
  centeredHeavy(png, 'ANSWER WITH YOUR FEET', 880, 5, rgba('#FFD269'))

  fs.writeFileSync(path.join(outputDir, 'board-question-' + index + '.png'), PNG.sync.write(png, { deflateLevel: 1 }))
}

function choiceTexture(choice, title, accent, background, index, suffix = '') {
  const png = new PNG({ width: 1024, height: 1024 })
  rect(png, 0, 0, png.width, png.height, rgba(background))
  outline(png, 28, 28, 968, 968, rgba(accent), 10)

  // Big bold Choice Letter at top
  centeredHeavy(png, choice, 80, 26, rgba(accent))
  rect(png, 120, 320, 784, 4, rgba(accent))

  // Huge readable option text in middle with safe margins
  const layout = fitWrappedOption(png, title, 760, 380)
  const startY = 360 + Math.max(0, Math.floor((380 - layout.totalHeight) / 2))
  layout.lines.forEach((line, lineIndex) => {
    centeredHeavy(png, line, startY + lineIndex * layout.lineHeight, layout.scale, rgba('#FFFFFF'))
  })

  // Footer
  rect(png, 120, 810, 784, 4, rgba(accent))
  centeredHeavy(png, 'WALK IN TO CHOOSE', 860, 5, rgba('#E4ECFF'))

  fs.writeFileSync(path.join(outputDir, 'choice-' + choice.toLowerCase() + '-' + String(index).padStart(2, '0') + suffix + '.png'), PNG.sync.write(png, { deflateLevel: 1 }))
}

function completionTexture() {
  const png = new PNG({ width: 1024, height: 1024 })
  rect(png, 0, 0, png.width, png.height, rgba('#090F25'))
  rect(png, 36, 36, 952, 952, rgba('#211A45'))
  outline(png, 36, 36, 952, 952, rgba('#A98AFF'), 5)
  centeredHeavy(png, 'QUIZ COMPLETE', 170, 10, rgba('#FFFFFF'))
  centeredHeavy(png, 'YOUR SHADOW REMAINS', 360, 5, rgba('#E1E8FF'))
  centeredHeavy(png, 'VISIT THE HALL', 520, 6, rgba('#B9F3FF'))
  centeredHeavy(png, 'OF SHADOWS', 620, 6, rgba('#B9F3FF'))
  centeredHeavy(png, 'PLAY AGAIN WHEN READY', 832, 4, rgba('#FFE7A4'))
  fs.writeFileSync(path.join(outputDir, 'board-question-complete.png'), PNG.sync.write(png, { deflateLevel: 1 }))
}

function houseTexture() {
  const png = new PNG({ width: 1024, height: 1024 })
  rect(png, 0, 0, png.width, png.height, rgba('#09071E'))
  rect(png, 32, 32, 960, 960, rgba('#16103A'))
  outline(png, 32, 32, 960, 960, rgba('#E2B548'), 8)
  centeredHeavy(png, 'HOUSE OF MASTERS', 160, 8, rgba('#FFD868'))
  rect(png, 100, 270, 824, 4, rgba('#8C7BDA'))
  centeredHeavy(png, 'THE STRONGEST SHADOWS REMAIN', 360, 5, rgba('#B9F3FF'))
  centeredHeavy(png, 'REACH 300. TAKE YOUR PLACE.', 500, 5, rgba('#FFE7A4'))
  centeredHeavy(png, 'TOP 20 REAL PLAYERS ETCHED HERE', 640, 4, rgba('#C5D4FF'))
  rect(png, 100, 750, 824, 4, rgba('#8C7BDA'))
  centeredHeavy(png, 'ENTER TO VIEW MASTERS', 820, 5, rgba('#FFD868'))
  fs.writeFileSync(path.join(outputDir, 'house-of-masters.png'), PNG.sync.write(png, { deflateLevel: 1 }))
}

function welcomeTexture() {
  const png = new PNG({ width: 1024, height: 512 })
  rect(png, 0, 0, png.width, png.height, rgba('#08061A'))
  rect(png, 20, 20, 984, 472, rgba('#120E2E'))
  outline(png, 20, 20, 984, 472, rgba('#8C7BDA'), 8)
  outline(png, 32, 32, 960, 448, rgba('#4D3D8A'), 3)
  
  // Top line: WELCOME TO
  centeredHeavy(png, 'WELCOME TO', 80, 7, rgba('#C8B8FF'))
  rect(png, 120, 175, 784, 4, rgba('#8C7BDA'))
  
  // Bottom line: SHADOW PARK
  centeredHeavy(png, 'SHADOW PARK', 230, 13, rgba('#FFFFFF'))
  rect(png, 120, 400, 784, 4, rgba('#8C7BDA'))
  centeredHeavy(png, 'ENTER AND ANSWER WITH YOUR FEET', 430, 4, rgba('#FFD868'))
  
  fs.writeFileSync(path.join(outputDir, 'welcome-shadow-park.png'), PNG.sync.write(png, { deflateLevel: 1 }))
}

if (process.argv.includes('--house-only')) {
  houseTexture()
  console.log('Generated House of Masters plaque in ' + outputDir)
  process.exit(0)
}

if (process.argv.includes('--welcome-only')) {
  welcomeTexture()
  console.log('Generated Welcome to Shadow Park sign in ' + outputDir)
  process.exit(0)
}

QUESTION_BANK.forEach(({ questionText, answerA, answerB }, index) => {
  const assetIndex = index + 1
  boardTexture(questionText, answerA, answerB, assetIndex)
  choiceTexture('A', answerA, '#B595FF', '#1E1242', assetIndex)
  choiceTexture('B', answerB, '#5CE1F0', '#0B2F3E', assetIndex)
  choiceTexture('A', answerB, '#B595FF', '#1E1242', assetIndex, '-from-b')
  choiceTexture('B', answerA, '#5CE1F0', '#0B2F3E', assetIndex, '-from-a')
})
houseTexture()
completionTexture()
welcomeTexture()
console.log('Generated all ultra-readable high-contrast sign textures in ' + outputDir)
