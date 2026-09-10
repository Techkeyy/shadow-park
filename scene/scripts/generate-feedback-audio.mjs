import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const sampleRate = 44_100
const outputRoot = resolve('assets/scene')

function writeWav(fileName, durationSeconds, notes) {
  const sampleCount = Math.floor(sampleRate * durationSeconds)
  const data = Buffer.alloc(sampleCount * 2)
  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate
    const envelope = Math.min(1, time / 0.012) * Math.min(1, (durationSeconds - time) / 0.045)
    const sample = notes.reduce((sum, note) => {
      const phase = (time - note.start) * note.frequency * Math.PI * 2
      const active = time >= note.start && time <= note.end ? 1 : 0
      return sum + Math.sin(phase) * note.amplitude * active
    }, 0)
    data.writeInt16LE(Math.max(-1, Math.min(1, sample * envelope)) * 0x7fff, index * 2)
  }

  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  const target = resolve(outputRoot, fileName)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, Buffer.concat([header, data]))
}

writeWav('shadow-correct.wav', 0.68, [
  { start: 0, end: 0.14, frequency: 523.25, amplitude: 0.3 },
  { start: 0.055, end: 0.3, frequency: 659.25, amplitude: 0.28 },
  { start: 0.16, end: 0.48, frequency: 783.99, amplitude: 0.24 },
  { start: 0.28, end: 0.64, frequency: 1046.5, amplitude: 0.22 }
])

writeWav('shadow-wrong.wav', 0.18, [
  { start: 0, end: 0.09, frequency: 220, amplitude: 0.24 },
  { start: 0.075, end: 0.17, frequency: 165, amplitude: 0.22 }
])

writeWav('shadow-rank.wav', 0.42, [
  { start: 0, end: 0.15, frequency: 392, amplitude: 0.18 },
  { start: 0.12, end: 0.28, frequency: 523.25, amplitude: 0.18 },
  { start: 0.25, end: 0.4, frequency: 659.25, amplitude: 0.2 }
])

writeWav('shadow-master.wav', 0.62, [
  { start: 0, end: 0.2, frequency: 392, amplitude: 0.16 },
  { start: 0.16, end: 0.38, frequency: 523.25, amplitude: 0.17 },
  { start: 0.34, end: 0.59, frequency: 783.99, amplitude: 0.22 }
])
