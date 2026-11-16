import api from './api'

export type VoiceCallStatus = 'idle' | 'connecting' | 'connected' | 'error'

export interface BotnoiVoiceCallbacks {
  onStatusChange?: (status: VoiceCallStatus) => void
  onBotSpeakingChange?: (speaking: boolean) => void
  onBotTranscript?: (text: string) => void
  onUserTranscript?: (text: string, isFinal: boolean) => void
  onTrackingCodeDetected?: (code: string) => void
  onError?: (message: string) => void
}

interface MintTokenResponse {
  success: boolean
  data: {
    ephemeralToken: string
    wsUrl: string
  }
  error?: string
}

const DEFAULT_WS = 'wss://voicebot-serverless-stg.botnoigroup.com/v1/call'
const FRAME_MS = 20
const PLAYBACK_IDLE_MS = 600
const PLAYBACK_LOOKAHEAD_SEC = 0.03
const BURST_MS = 80

export class BotnoiVoiceClient {
  private ws: WebSocket | null = null
  private seq = 0
  private sessionId = ''
  private opened = false
  private sampleRate = 16000
  private audioCtx: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private micNode: ScriptProcessorNode | null = null
  private masterGain: GainNode | null = null
  private micRemainder: Float32Array = new Float32Array(0)
  private playbackActive = false
  private playbackIdle: ReturnType<typeof setTimeout> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private nextPlayTime = 0
  private dropBotUntil = 0
  private ttsSources = new Set<AudioBufferSourceNode>()
  private pendingChunks: Float32Array[] = []
  private burstTimer: ReturnType<typeof setTimeout> | null = null
  private currentBotTurnId = ''
  private currentBotTurnText = ''
  private callbacks: BotnoiVoiceCallbacks

  constructor(callbacks: BotnoiVoiceCallbacks = {}) {
    this.callbacks = callbacks
  }

  async connect(): Promise<void> {
    this.hangup()
    this.callbacks.onStatusChange?.('connecting')

    try {
      // 1. ขอ ephemeral_token แบบใช้ครั้งเดียวจาก Server ของเรา
      const { data: res } = await api.post<MintTokenResponse>('/tickets/voicebot-token')
      const callToken = res?.data?.ephemeralToken
      const wsBase = res?.data?.wsUrl || DEFAULT_WS

      if (!callToken) {
        throw new Error(res?.error || 'ไม่ได้รับ Call Token จากเซิร์ฟเวอร์')
      }

      this.createAudioContext()

      const url = new URL(wsBase)
      url.searchParams.set('token', callToken)

      this.seq = 0
      this.sessionId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      this.currentBotTurnId = ''
      this.currentBotTurnText = ''

      const socket = new WebSocket(url.toString())
      this.ws = socket
      socket.binaryType = 'arraybuffer'

      socket.onopen = () => {
        socket.send(
          JSON.stringify({
            version: '2',
            type: 'open',
            seq: ++this.seq,
            id: this.sessionId,
            position: 'POST-ANSWER',
            parameters: {
              conversationId: `browser-${Date.now()}`,
              media: [{ type: 'audio/L16', sampleRateHz: 16000, channels: ['external'] }],
            },
          })
        )
      }

      socket.onmessage = (event) => {
        const payload = event.data
        if (payload instanceof ArrayBuffer) {
          this.playTts(payload)
          return
        }
        if (typeof Blob !== 'undefined' && payload instanceof Blob) {
          void payload.arrayBuffer().then((buf) => this.playTts(buf))
          return
        }

        try {
          const msg = JSON.parse(String(payload))

          if (msg.type === 'opened') {
            const media = msg.parameters?.media?.[0]
            if (media?.sampleRateHz) this.sampleRate = Number(media.sampleRateHz)
            this.opened = true
            this.callbacks.onStatusChange?.('connected')

            void this.startMic().catch((err) => {
              const errMsg =
                err?.name === 'NotAllowedError'
                  ? 'กรุณากดอนุญาตการใช้ไมโครโฟนบนเบราว์เซอร์ก่อนนะคะ'
                  : 'ไม่พบไมโครโฟนในอุปกรณ์ของคุณ'
              this.callbacks.onError?.(errMsg)
              this.hangup()
            })

            this.pingTimer = setInterval(() => this.sendJson('ping'), 20000)
            return
          }

          if (msg.type === 'pong') return

          if (msg.type === 'barge_in') {
            this.stopPlaybackAndClearQueue()
            return
          }

          if (msg.type === 'event') {
            const entities = msg.parameters?.entities || []
            for (const entity of entities) {
              if (entity.type === 'bot_turn_response' && entity.data?.output) {
                const turnId = entity.data?.turn?.id || ''
                const chunkText = String(entity.data.output).trim()
                if (turnId && turnId === this.currentBotTurnId) {
                  this.currentBotTurnText = `${this.currentBotTurnText} ${chunkText}`.trim()
                } else {
                  this.currentBotTurnId = turnId
                  this.currentBotTurnText = chunkText
                }
                this.callbacks.onBotTranscript?.(this.currentBotTurnText)

                // ตรวจจับรหัสติดตามงานซ่อม CC-YYYYMMDD-XXXX อัตโนมัติ
                const codeMatch = this.currentBotTurnText.match(/CC-\d{8}-[A-Z0-9]{4,}/i)
                if (codeMatch) {
                  this.callbacks.onTrackingCodeDetected?.(codeMatch[0].toUpperCase())
                }
              }

              if (entity.type === 'user_turn_response' && entity.data) {
                if (entity.data.is_final) {
                  this.dropBotUntil = 0
                  if (this.masterGain && this.audioCtx) {
                    this.masterGain.gain.setValueAtTime(1, this.audioCtx.currentTime)
                  }
                }
                const userText = entity.data.transcript?.result?.text
                if (userText) {
                  this.callbacks.onUserTranscript?.(String(userText), Boolean(entity.data.is_final))
                }
              }

              if (entity.type === 'barge_in') {
                this.stopPlaybackAndClearQueue()
              }
            }
            return
          }

          if (msg.type === 'closed' || msg.type === 'disconnect') {
            this.endCall()
            this.callbacks.onStatusChange?.('idle')
          }
        } catch {
          // ignore malformed frames
        }
      }

      socket.onclose = (event) => {
        if (this.ws === socket) {
          if (event.code === 4001) {
            this.callbacks.onError?.('เซสชันการโทรหมดอายุ กรุณากดเริ่มสนทนาใหม่อีกครั้งค่ะ')
          } else if (event.code === 3003) {
            this.callbacks.onError?.('เครดิตระบบเสียงไม่เพียงพอชั่วคราว')
          }
          this.endCall()
          this.callbacks.onStatusChange?.(event.code === 1000 ? 'idle' : 'error')
        }
      }

      socket.onerror = () => {
        this.callbacks.onError?.('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เสียงสนทนาได้')
      }
    } catch (err: any) {
      this.endCall()
      const apiErr = err?.response?.data?.error || err?.message || 'เชื่อมต่อระบบเสียงไม่สำเร็จ'
      this.callbacks.onError?.(apiErr)
      this.callbacks.onStatusChange?.('error')
    }
  }

  hangup(): void {
    const openWs = this.ws
    if (openWs && openWs.readyState === WebSocket.OPEN && this.sessionId && this.opened) {
      openWs.send(
        JSON.stringify({
          version: '2',
          type: 'close',
          seq: ++this.seq,
          id: this.sessionId,
          parameters: { reason: 'end' },
        })
      )
      this.ws = null
      setTimeout(() => openWs.close(1000), 300)
    }
    this.endCall()
    this.callbacks.onStatusChange?.('idle')
  }

  private sendJson(type: string, parameters: Record<string, unknown> = {}): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(
      JSON.stringify({
        version: '2',
        type,
        seq: ++this.seq,
        id: this.sessionId,
        parameters,
      })
    )
  }

  private floatToL16(samples: Float32Array): ArrayBuffer {
    const out = new ArrayBuffer(samples.length * 2)
    const view = new DataView(out)
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]))
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    }
    return out
  }

  private l16ToFloat(buffer: ArrayBuffer): Float32Array {
    const view = new DataView(buffer)
    const out = new Float32Array(buffer.byteLength / 2)
    for (let i = 0; i < out.length; i++) {
      out[i] = view.getInt16(i * 2, true) / 32768
    }
    return out
  }

  private resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
    if (fromRate === toRate) return input
    const ratio = fromRate / toRate
    const out = new Float32Array(Math.max(1, Math.round(input.length / ratio)))
    for (let i = 0; i < out.length; i++) {
      const pos = i * ratio
      const idx = Math.floor(pos)
      const frac = pos - idx
      const s0 = input[idx] || 0
      const s1 = input[idx + 1] === undefined ? s0 : input[idx + 1]
      out[i] = s0 + frac * (s1 - s0)
    }
    return out
  }

  private sendMic(float32: Float32Array): void {
    const frame = Math.max(1, Math.round((this.sampleRate * FRAME_MS) / 1000))
    const merged = new Float32Array(this.micRemainder.length + float32.length)
    merged.set(this.micRemainder)
    merged.set(float32, this.micRemainder.length)
    let offset = 0
    while (offset + frame <= merged.length) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(this.floatToL16(merged.subarray(offset, offset + frame)))
      }
      offset += frame
    }
    this.micRemainder = offset < merged.length ? merged.slice(offset) : new Float32Array(0)
  }

  private createAudioContext(): void {
    if (this.audioCtx && this.audioCtx.sampleRate !== this.sampleRate) {
      try {
        void this.audioCtx.close()
      } catch {
        // ignore
      }
      this.audioCtx = null
    }
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      this.audioCtx = new AudioContext({ sampleRate: this.sampleRate })
      this.masterGain = this.audioCtx.createGain()
      this.masterGain.gain.value = 1
      this.masterGain.connect(this.audioCtx.destination)
    }
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume()
    }
  }

  private playTts(buffer: ArrayBuffer): void {
    if (!this.opened || !this.audioCtx || !this.masterGain || !buffer.byteLength) return
    if (this.dropBotUntil && Date.now() < this.dropBotUntil) return
    this.pendingChunks.push(this.l16ToFloat(buffer))
    if (this.burstTimer) clearTimeout(this.burstTimer)
    this.burstTimer = setTimeout(() => this.flushBurst(), BURST_MS)
  }

  private flushBurst(): void {
    this.burstTimer = null
    const chunks = this.pendingChunks
    this.pendingChunks = []
    if (!this.opened || !this.audioCtx || !this.masterGain || !chunks.length) return

    const total = chunks.reduce((n, c) => n + c.length, 0)
    const samples = new Float32Array(total)
    let offset = 0
    for (const c of chunks) {
      samples.set(c, offset)
      offset += c.length
    }
    if (!samples.length) return

    const now = this.audioCtx.currentTime
    this.masterGain.gain.cancelScheduledValues(now)
    this.masterGain.gain.setValueAtTime(1, now)

    const playBuffer = this.audioCtx.createBuffer(1, samples.length, this.sampleRate)
    playBuffer.getChannelData(0).set(samples)
    const startAt = Math.max(now + PLAYBACK_LOOKAHEAD_SEC, this.nextPlayTime)
    this.nextPlayTime = startAt + playBuffer.duration

    const src = this.audioCtx.createBufferSource()
    src.buffer = playBuffer
    src.connect(this.masterGain)
    this.ttsSources.add(src)
    src.onended = () => {
      this.ttsSources.delete(src)
      if (this.playbackActive && !this.botStillPlaying()) {
        this.schedulePlaybackCompleted()
      }
    }
    src.start(startAt)

    if (!this.playbackActive) {
      this.playbackActive = true
      this.callbacks.onBotSpeakingChange?.(true)
      this.sendJson('playback_started')
    }
    this.schedulePlaybackCompleted()
  }

  private botStillPlaying(): boolean {
    if (this.ttsSources.size > 0) return true
    return Boolean(this.audioCtx && this.nextPlayTime > this.audioCtx.currentTime + 0.01)
  }

  private schedulePlaybackCompleted(): void {
    if (this.playbackIdle) clearTimeout(this.playbackIdle)
    this.playbackIdle = setTimeout(() => {
      this.playbackIdle = null
      if (!this.playbackActive) return
      if (this.botStillPlaying()) {
        this.schedulePlaybackCompleted()
        return
      }
      this.playbackActive = false
      this.nextPlayTime = 0
      this.callbacks.onBotSpeakingChange?.(false)
      this.sendJson('playback_completed')
    }, PLAYBACK_IDLE_MS)
  }

  private stopPlaybackAndClearQueue(): void {
    this.dropBotUntil = Date.now() + 2000
    this.pendingChunks = []
    if (this.burstTimer) clearTimeout(this.burstTimer)
    this.burstTimer = null
    this.nextPlayTime = 0
    if (this.masterGain && this.audioCtx) {
      const now = this.audioCtx.currentTime
      this.masterGain.gain.cancelScheduledValues(now)
      this.masterGain.gain.setValueAtTime(0, now)
    }
    for (const src of this.ttsSources) {
      try {
        src.stop()
      } catch {
        // ignore
      }
    }
    this.ttsSources.clear()
    if (this.playbackIdle) clearTimeout(this.playbackIdle)
    this.playbackIdle = null
    if (this.playbackActive) {
      this.playbackActive = false
      this.callbacks.onBotSpeakingChange?.(false)
      this.sendJson('playback_completed')
    }
  }

  private async startMic(): Promise<void> {
    this.createAudioContext()
    if (!this.audioCtx) return
    if (this.audioCtx.state === 'suspended') await this.audioCtx.resume()

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    })
    const source = this.audioCtx.createMediaStreamSource(this.mediaStream)
    this.micNode = this.audioCtx.createScriptProcessor(
      this.audioCtx.sampleRate <= 8000 ? 256 : 512,
      1,
      1
    )
    this.micNode.onaudioprocess = (event) => {
      if (!this.audioCtx) return
      let samples: Float32Array = event.inputBuffer.getChannelData(0)
      if (this.audioCtx.sampleRate !== this.sampleRate) {
        samples = this.resample(samples, this.audioCtx.sampleRate, this.sampleRate)
      }
      this.sendMic(samples)
    }
    source.connect(this.micNode)
    this.micNode.connect(this.audioCtx.destination)
  }

  private teardownAudio(): void {
    this.opened = false
    this.dropBotUntil = 0
    this.pendingChunks = []
    if (this.burstTimer) clearTimeout(this.burstTimer)
    this.burstTimer = null
    for (const src of this.ttsSources) {
      try {
        src.stop()
      } catch {
        // ignore
      }
    }
    this.ttsSources.clear()
    this.nextPlayTime = 0
    this.playbackActive = false
    this.callbacks.onBotSpeakingChange?.(false)
    if (this.playbackIdle) clearTimeout(this.playbackIdle)
    this.playbackIdle = null
    try {
      this.micNode?.disconnect()
    } catch {
      // ignore
    }
    this.micNode = null
    try {
      this.masterGain?.disconnect()
    } catch {
      // ignore
    }
    this.masterGain = null
    this.mediaStream?.getTracks().forEach((track) => track.stop())
    this.mediaStream = null
    this.micRemainder = new Float32Array(0)
    if (this.audioCtx) {
      void this.audioCtx.close()
      this.audioCtx = null
    }
  }

  private endCall(): void {
    if (this.pingTimer) clearInterval(this.pingTimer)
    this.pingTimer = null
    const openWs = this.ws
    this.ws = null
    this.sessionId = ''
    this.teardownAudio()
    if (openWs && openWs.readyState <= WebSocket.OPEN) {
      openWs.close(1000)
    }
  }
}
