import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

let failed = false

function report(check, status, detail) {
  console.log(`${check.padEnd(31)} ${status.padEnd(6)} ${detail}`)
  if (status === 'FAIL') failed = true
}

function run(label, command, args) {
  const executable = process.platform === 'win32' ? 'cmd.exe' : command
  const commandArgs = process.platform === 'win32' ? ['/d', '/s', '/c', [command, ...args].join(' ')] : args
  const result = spawnSync(executable, commandArgs, { cwd: process.cwd(), encoding: 'utf8', shell: false })
  const failure = result.error ? result.error.message : `exit ${result.status}`
  report(label, result.status === 0 ? 'PASS' : 'FAIL', result.status === 0 ? 'completed' : failure)
}

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const sceneJson = JSON.parse(readFileSync(new URL('../scene.json', import.meta.url), 'utf8'))
const nodeMajor = Number(process.versions.node.split('.')[0])
const expectedSdk = '7.26.1-32239895147.commit-3c77d90'

report('node >= 22', nodeMajor >= 22 ? 'PASS' : 'FAIL', process.version)
report('authoritative SDK pinned', packageJson.devDependencies['@dcl/sdk'] === expectedSdk ? 'PASS' : 'FAIL', packageJson.devDependencies['@dcl/sdk'])
report('js runtime pinned', packageJson.devDependencies['@dcl/js-runtime'] === expectedSdk ? 'PASS' : 'FAIL', packageJson.devDependencies['@dcl/js-runtime'])
report('authoritative scene flag', sceneJson.authoritativeMultiplayer === true ? 'PASS' : 'FAIL', String(sceneJson.authoritativeMultiplayer))
report('production World granted', sceneJson.worldConfiguration?.name === 'shadow-park-dev.dcl.eth' ? 'WARN' : 'PASS', sceneJson.worldConfiguration?.name ?? 'missing')
run('pure state tests', 'npm', ['test'])
run('scene build and typecheck', 'npm', ['run', 'build'])

process.exitCode = failed ? 1 : 0
