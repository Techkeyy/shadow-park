import { build } from 'esbuild'
import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const entries = [
  'tests/core1-pipeline.integration.test.ts',
  'tests/authoritative-sequential.integration.test.ts',
  'tests/authoritative-concurrency.integration.test.ts'
]

async function run(entry) {
  const output = path.join(root, `.integration-${path.basename(entry)}.mjs`)
  await build({
    entryPoints: [path.join(root, entry)],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: output,
    external: ['~system/*'],
    alias: {
      '@dcl/sdk/network': path.join(root, 'tests/fakes/network.ts'),
      '@dcl/sdk/server': path.join(root, 'tests/fakes/storage.ts')
    }
  })

  try {
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['--test', output], { stdio: 'inherit' })
      child.on('error', reject)
      child.on('exit', (code, signal) => (code === 0 ? resolve() : reject(new Error(`${entry} exited with ${code ?? signal}`))))
    })
  } finally {
    await rm(output, { force: true })
  }
}

for (const entry of entries) {
  console.log('RUNNING_INTEGRATION', entry)
  await run(entry)
}
