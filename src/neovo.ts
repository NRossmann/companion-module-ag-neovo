import { EventEmitter } from 'node:events'
import net from 'node:net'

export const NeovoCommands = {
	powerSet: 0x18,
	powerGet: 0x19,
	inputSet: 0xac,
	inputGet: 0xad,
	volumeSet: 0x44,
	volumeGet: 0x45,
	deviceInfo: 0xa1,
	miscInfo: 0x0f,
} as const

export const PowerStateValues = {
	off: 0x01,
	on: 0x02,
} as const

export const InputSources = {
	video: 0x01,
	svideo: 0x02,
	component: 0x03,
	vga: 0x05,
	hdmi2: 0x06,
	dp2: 0x07,
	usb2: 0x08,
	cardDviD: 0x09,
	dp1: 0x0a,
	cardOps: 0x0b,
	usb1: 0x0c,
	hdmi: 0x0d,
	dviD: 0x0e,
	hdmi3: 0x0f,
	browser: 0x10,
	smartCms: 0x11,
	dms: 0x12,
	internalStorage: 0x13,
	mediaPlayer: 0x16,
	pdfPlayer: 0x17,
	custom: 0x18,
	hdmi4: 0x19,
} as const

export type InputSourceKey = keyof typeof InputSources

export type ParsedFrame = {
	monitorId: number
	data: number[]
}

type QueueItem = {
	packet: Buffer
	expectReportCode?: number
	resolve: (value: number[] | null) => void
	reject: (error: Error) => void
	attemptsLeft: number
	timeoutMs: number
	timer?: NodeJS.Timeout
}

export type NeovoClientOptions = {
	host: string
	port: number
	monitorId: number
	timeoutMs: number
	retries: number
}

export class AgNeovoClient extends EventEmitter {
	private socket: net.Socket | undefined
	private rxBuffer: Buffer<ArrayBufferLike> = Buffer.alloc(0)
	private readonly queue: QueueItem[] = []
	private current: QueueItem | undefined
	private connected = false
	private readonly options: NeovoClientOptions

	constructor(options: NeovoClientOptions) {
		super()
		this.options = options
	}

	async connect(): Promise<void> {
		if (this.connected) return

		await new Promise<void>((resolve, reject) => {
			const socket = net.createConnection({ host: this.options.host, port: this.options.port })
			let settled = false

			const onError = (error: Error): void => {
				if (!settled) {
					settled = true
					reject(error)
				}
				this.handleDisconnect(error)
			}

			socket.once('connect', () => {
				this.socket = socket
				this.connected = true
				this.rxBuffer = Buffer.alloc(0)
				socket.on('data', (chunk) => this.handleData(chunk))
				socket.on('close', () => this.handleDisconnect())
				socket.on('error', onError)
				if (!settled) {
					settled = true
					resolve()
				}
				this.emit('connected')
			})

			socket.once('error', onError)
		})
	}

	disconnect(): void {
		if (this.socket) {
			this.socket.destroy()
			this.socket = undefined
		}
		this.handleDisconnect()
	}

	get isConnected(): boolean {
		return this.connected
	}

	async setPower(value: number): Promise<void> {
		await this.sendCommand(NeovoCommands.powerSet, [value], { expectReportCode: undefined })
	}

	async getPower(): Promise<number | undefined> {
		const response = await this.sendCommand(NeovoCommands.powerGet, [], { expectReportCode: NeovoCommands.powerGet })
		return response?.[0]
	}

	async setInput(source: number): Promise<void> {
		await this.sendCommand(NeovoCommands.inputSet, [source, 0x00, 0x00, 0x00], { expectReportCode: undefined })
	}

	async getInput(): Promise<number | undefined> {
		const response = await this.sendCommand(NeovoCommands.inputGet, [], { expectReportCode: NeovoCommands.inputGet })
		return response?.[0]
	}

	async setVolume(volume: number, audioOutVolume: number): Promise<void> {
		await this.sendCommand(NeovoCommands.volumeSet, [volume, audioOutVolume], { expectReportCode: undefined })
	}

	async getVolume(): Promise<{ volume: number; audioOutVolume: number } | undefined> {
		const response = await this.sendCommand(NeovoCommands.volumeGet, [], { expectReportCode: NeovoCommands.volumeGet })
		if (!response || response.length < 2) return undefined
		return { volume: response[0], audioOutVolume: response[1] }
	}

	async getDeviceInfo(item: number): Promise<string | undefined> {
		const response = await this.sendCommand(NeovoCommands.deviceInfo, [item], {
			expectReportCode: NeovoCommands.deviceInfo,
		})
		if (!response || response.length === 0) return undefined
		return Buffer.from(response).toString('utf8').replace(/\0/g, '').trim()
	}

	async getOperatingHours(): Promise<number | undefined> {
		const response = await this.sendCommand(NeovoCommands.miscInfo, [0x02], {
			expectReportCode: NeovoCommands.miscInfo,
		})
		if (!response || response.length < 3 || response[0] !== 0x02) return undefined
		return (response[1] << 8) | response[2]
	}

	private async sendCommand(
		command: number,
		payload: number[],
		options: { expectReportCode?: number },
	): Promise<number[] | null> {
		if (!this.socket || !this.connected) {
			throw new Error('Not connected')
		}

		const data = [command, ...payload]
		const packet = buildCommandPacket(this.options.monitorId, data)

		return await new Promise<number[] | null>((resolve, reject) => {
			this.queue.push({
				packet,
				expectReportCode: options.expectReportCode,
				resolve,
				reject,
				attemptsLeft: this.options.retries + 1,
				timeoutMs: this.options.timeoutMs,
			})
			this.pumpQueue()
		})
	}

	private pumpQueue(): void {
		if (!this.connected || !this.socket || this.current || this.queue.length === 0) return
		this.current = this.queue.shift()
		if (!this.current) return
		this.writeCurrent()
	}

	private writeCurrent(): void {
		if (!this.current || !this.socket) return

		const item = this.current
		item.attemptsLeft -= 1
		this.socket.write(item.packet)

		if (item.timer) clearTimeout(item.timer)
		item.timer = setTimeout(() => {
			if (!this.current) return
			if (item.attemptsLeft > 0) {
				this.writeCurrent()
				return
			}

			this.current = undefined
			item.reject(new Error('Command timeout'))
			this.pumpQueue()
		}, item.timeoutMs)
	}

	private handleData(chunk: Buffer): void {
		this.rxBuffer = Buffer.concat([this.rxBuffer, chunk])

		while (this.rxBuffer.length > 0) {
			const parsed = parseSingleFrame(this.rxBuffer)
			if (!parsed) return

			this.rxBuffer = parsed.remaining
			if (parsed.frame) {
				this.handleFrame(parsed.frame)
			}
		}
	}

	private handleFrame(frame: ParsedFrame): void {
		const current = this.current
		if (!current) {
			this.emit('report', frame)
			return
		}

		const commandCode = frame.data[0]
		if (commandCode === 0x00) {
			const status = frame.data[1] ?? 0xff
			if (status !== 0x00) {
				this.resolveCurrentError(status)
				return
			}

			if (current.expectReportCode === undefined) {
				this.resolveCurrentSuccess(null)
			}
			return
		}

		if (current.expectReportCode !== undefined && current.expectReportCode === commandCode) {
			this.resolveCurrentSuccess(frame.data.slice(1))
			return
		}

		this.emit('report', frame)
	}

	private resolveCurrentSuccess(value: number[] | null): void {
		if (!this.current) return
		const item = this.current
		if (item.timer) clearTimeout(item.timer)
		this.current = undefined
		item.resolve(value)
		this.pumpQueue()
	}

	private resolveCurrentError(status: number): void {
		if (!this.current) return
		const item = this.current
		if (item.timer) clearTimeout(item.timer)
		this.current = undefined
		item.reject(new Error(mapAckStatus(status)))
		this.pumpQueue()
	}

	private handleDisconnect(error?: Error): void {
		const wasConnected = this.connected
		this.connected = false

		if (this.current) {
			if (this.current.timer) clearTimeout(this.current.timer)
			this.current.reject(new Error('Connection closed'))
			this.current = undefined
		}

		while (this.queue.length > 0) {
			const item = this.queue.shift()
			if (item) item.reject(new Error('Connection closed'))
		}

		if (wasConnected || error) {
			this.emit('disconnected', error)
		}
	}
}

function buildCommandPacket(monitorId: number, data: number[]): Buffer {
	const length = data.length + 2
	const bytes = [0xa6, monitorId & 0xff, 0x00, 0x00, 0x00, length, 0x01, ...data]
	const checksum = computeXor(bytes)
	return Buffer.from([...bytes, checksum])
}

function parseSingleFrame(buffer: Buffer): { frame?: ParsedFrame; remaining: Buffer<ArrayBufferLike> } | undefined {
	const startIndex = buffer.indexOf(0x21)
	if (startIndex < 0) {
		return { remaining: Buffer.alloc(0) }
	}

	if (startIndex > 0) {
		buffer = buffer.subarray(startIndex)
	}

	if (buffer.length < 6) return undefined

	const length = buffer[4]
	const totalLength = 5 + length
	if (buffer.length < totalLength) return undefined

	const frameBytes = buffer.subarray(0, totalLength)
	const expectedChecksum = computeXor(Array.from(frameBytes.subarray(0, totalLength - 1)))
	const frameChecksum = frameBytes[totalLength - 1]
	if (expectedChecksum !== frameChecksum) {
		return { remaining: buffer.subarray(totalLength) }
	}

	if (frameBytes[5] !== 0x01) {
		return { remaining: buffer.subarray(totalLength) }
	}

	const data = Array.from(frameBytes.subarray(6, totalLength - 1))
	return {
		frame: {
			monitorId: frameBytes[1],
			data,
		},
		remaining: buffer.subarray(totalLength),
	}
}

function computeXor(bytes: number[]): number {
	let checksum = 0
	for (const value of bytes) {
		checksum ^= value
	}
	return checksum & 0xff
}

function mapAckStatus(status: number): string {
	switch (status) {
		case 0x00:
			return 'Completed'
		case 0x01:
			return 'Limit over (upper)'
		case 0x02:
			return 'Limit over (lower)'
		case 0x03:
			return 'Command canceled or NACK'
		case 0x04:
			return 'Parse error or NAV'
		default:
			return `Unknown status 0x${status.toString(16).padStart(2, '0')}`
	}
}
