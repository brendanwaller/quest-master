import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkComfyUiAvailable, generateAvatarWithComfyUi } from '../comfyAvatar'

class FakeFileReader {
  onload: ((event: Event) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  error: Error | null = null
  result: string | ArrayBuffer | null = null

  readAsDataURL(blob: Blob) {
    if (this.onerror) {
      this.error = null
      this.result = `data:${blob.type};base64,test-avatar`
      this.onload?.(new Event('load'))
      return
    }

    this.result = `data:${blob.type};base64,test-avatar`
    this.onload?.(new Event('load'))
  }
}

describe('ComfyUI avatar helper', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('crypto', { randomUUID: () => 'client-id' })
    vi.stubGlobal('FileReader', FakeFileReader)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('checks whether ComfyUI is available', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ status: 'success' }), { status: 200 }))

    await expect(checkComfyUiAvailable('http://local-comfy:8188')).resolves.toBe(true)
    expect(fetchMock).toHaveBeenCalledWith('http://local-comfy:8188/system_stats', { cache: 'no-store' })
  })

  it('returns false when ComfyUI is offline', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))

    await expect(checkComfyUiAvailable('http://local-comfy:8188')).resolves.toBe(false)
  })

  it('submits an avatar workflow and returns a data URL when generation succeeds', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === 'http://local-comfy:8188/prompt') {
        return new Response(JSON.stringify({ prompt_id: 'prompt-1' }), { status: 200 })
      }

      if (url === 'http://local-comfy:8188/history/prompt-1') {
        return new Response(JSON.stringify({
          'prompt-1': {
            status: { completed: true, status_str: 'success' },
            outputs: {
              '9': {
                images: [{ filename: 'avatar.png', subfolder: '', type: 'output' }],
              },
            },
          },
        }), { status: 200 })
      }

      if (url.startsWith('http://local-comfy:8188/view')) {
        return new Response(new Blob(['png-bytes'], { type: 'image/png' }))
      }

      return new Response('not found', { status: 404 })
    })

    const result = await generateAvatarWithComfyUi('Elven wizard named Vael Moonwhisper', {
      baseUrl: 'http://local-comfy:8188',
      seed: 42,
      width: 128,
      height: 128,
      steps: 2,
      cfg: 3,
    })

    expect(result.status).toBe('comfyui')
    expect(result.prompt).toBe('Elven wizard named Vael Moonwhisper')
    expect(result.seed).toBe(42)
    expect(result.url).toMatch(/^data:.*;base64,test-avatar$/)

    const [, promptOptions] = fetchMock.mock.calls[0]
    expect(promptOptions).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    const body = JSON.parse(String(promptOptions.body))
    expect(body.client_id).toBe('dungeon-maister-client-id')
    expect(body.prompt['6'].inputs.text).toBe('Elven wizard named Vael Moonwhisper')
    expect(body.prompt['5'].inputs).toMatchObject({ width: 128, height: 128, batch_size: 1 })
    expect(body.prompt['3'].inputs).toMatchObject({ seed: 42, steps: 2, cfg: 3 })
  })

  it('throws a useful error when ComfyUI rejects the prompt request', async () => {
    fetchMock.mockResolvedValue(new Response('bad workflow', { status: 500 }))

    await expect(generateAvatarWithComfyUi('bad prompt', { baseUrl: 'http://local-comfy:8188' }))
      .rejects.toThrow('ComfyUI rejected the avatar request: 500 bad workflow')
  })

  it('throws a useful error when ComfyUI reports a generation failure', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ prompt_id: 'prompt-2' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        'prompt-2': {
          status: { completed: false, status_str: 'error' },
          outputs: {},
        },
      }), { status: 200 }))

    await expect(generateAvatarWithComfyUi('bad prompt', { baseUrl: 'http://local-comfy:8188' }))
      .rejects.toThrow('ComfyUI generation failed')
  })
})