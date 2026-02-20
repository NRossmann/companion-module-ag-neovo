import { InstanceBase, runEntrypoint, InstanceStatus, SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { AgNeovoClient, PowerStateValues } from './neovo.js'
import { inputCodeToLabel, type ModuleState } from './model.js'

export class ModuleInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig // Setup in init()
	private client: AgNeovoClient | undefined
	private pollTimer: NodeJS.Timeout | undefined
	readonly state: ModuleState = {
		connection: 'disconnected',
		power: 'unknown',
		inputCode: null,
		brightness: null,
		volume: null,
		audioOutVolume: null,
		model: '',
		fwVersion: '',
		buildDate: '',
		operatingHours: null,
	}

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updatePresets() // export Presets
		this.updateVariableDefinitions() // export variable definitions
		this.updateAllVariables()

		await this.connectClient()
	}
	// When module gets deleted
	async destroy(): Promise<void> {
		this.stopPolling()
		this.client?.disconnect()
		this.client = undefined
		this.log('debug', 'destroy')
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config
		await this.connectClient()
	}

	// Return config fields for web config
	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updatePresets(): void {
		UpdatePresets(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	async actionPower(powerOn: boolean): Promise<void> {
		if (!this.client?.isConnected) throw new Error('Not connected')
		await this.client.setPower(powerOn ? PowerStateValues.on : PowerStateValues.off)
		this.state.power = powerOn ? 'on' : 'off'
		this.updateAllVariables()
		this.checkFeedbacks()
	}

	async actionInput(input: number): Promise<void> {
		if (!this.client?.isConnected) throw new Error('Not connected')
		await this.client.setInput(input)
		this.state.inputCode = input
		this.updateAllVariables()
		this.checkFeedbacks()
	}

	async actionSetVolume(volume: number): Promise<void> {
		if (!this.client?.isConnected) throw new Error('Not connected')
		const clipped = clampPercent(volume)
		const audioOut = this.state.audioOutVolume ?? clipped
		await this.client.setVolume(clipped, audioOut)
		this.state.volume = clipped
		this.state.audioOutVolume = audioOut
		this.updateAllVariables()
		this.checkFeedbacks()
	}

	async actionSetBrightness(brightness: number): Promise<void> {
		if (!this.client?.isConnected) throw new Error('Not connected')
		const clipped = clampPercent(brightness)
		await this.client.setBrightness(clipped)
		this.state.brightness = (await this.client.getBrightness()) ?? clipped
		this.updateAllVariables()
		this.checkFeedbacks()
	}

	async actionAdjustVolume(delta: number): Promise<void> {
		const current = this.state.volume ?? 0
		await this.actionSetVolume(current + delta)
	}

	async actionRefresh(): Promise<void> {
		await this.refreshState()
	}

	private async connectClient(): Promise<void> {
		this.stopPolling()
		if (this.client) {
			this.client.removeAllListeners()
			this.client.disconnect()
			this.client = undefined
		}

		if (!this.config.host || !this.config.port) {
			this.setDisconnectedState('Missing host or port')
			return
		}

		this.state.connection = 'connecting'
		this.updateAllVariables()
		this.checkFeedbacks()
		this.updateStatus(InstanceStatus.Connecting)

		const client = new AgNeovoClient({
			host: this.config.host,
			port: this.config.port,
			monitorId: this.config.monitorId,
			timeoutMs: this.config.timeoutMs,
			retries: this.config.retries,
		})

		client.on('connected', () => {
			this.state.connection = 'connected'
			this.updateStatus(InstanceStatus.Ok)
			this.log('debug', 'Connected to display')
			this.updateAllVariables()
			this.checkFeedbacks()
			void this.refreshState()
			this.startPolling()
		})

		client.on('disconnected', (error?: Error) => {
			this.log('debug', `Disconnected from display: ${error?.message ?? 'Connection closed'}`)
			this.setDisconnectedState(error?.message ?? 'Connection closed')
		})

		client.on('report', () => {
			this.checkFeedbacks()
		})

		client.on('tx', (event) => {
			if (!this.isVerboseDebugEnabled()) return
			this.log(
				'debug',
				`TX cmd=0x${event.commandCode.toString(16).padStart(2, '0')} attempt=${event.attempt} left=${event.attemptsRemaining} data=${event.packetHex}`,
			)
		})

		client.on('retry', (event) => {
			if (!this.isVerboseDebugEnabled()) return
			this.log(
				'debug',
				`Retry cmd=0x${event.commandCode.toString(16).padStart(2, '0')} left=${event.attemptsRemaining}`,
			)
		})

		client.on('timeout', (event) => {
			if (!this.isVerboseDebugEnabled()) return
			this.log('debug', `Timeout cmd=0x${event.commandCode.toString(16).padStart(2, '0')}`)
		})

		client.on('rx_raw', (event) => {
			if (!this.isVerboseDebugEnabled()) return
			this.log('debug', `RX raw bytes=${event.size} data=${event.chunkHex}`)
		})

		client.on('rx_frame', (event) => {
			if (!this.isVerboseDebugEnabled()) return
			this.log('debug', `RX frame monitor=${event.monitorId} data=${event.dataHex}`)
		})

		client.on('command_ok', (event) => {
			if (!this.isVerboseDebugEnabled()) return
			this.log(
				'debug',
				`Command OK cmd=0x${event.commandCode.toString(16).padStart(2, '0')} response=${event.responseHex || '<none>'}`,
			)
		})

		client.on('command_error', (event) => {
			if (!this.isVerboseDebugEnabled()) return
			this.log(
				'debug',
				`Command error cmd=0x${event.commandCode.toString(16).padStart(2, '0')} status=0x${event.status.toString(16).padStart(2, '0')} ${event.statusText}`,
			)
		})

		this.client = client

		try {
			await client.connect()
		} catch (error) {
			this.setDisconnectedState(error instanceof Error ? error.message : 'Connect failed')
		}
	}

	private startPolling(): void {
		this.stopPolling()
		if (this.config.pollInterval <= 0) return

		this.pollTimer = setInterval(() => {
			void this.refreshState()
		}, this.config.pollInterval)
	}

	private stopPolling(): void {
		if (this.pollTimer) {
			clearInterval(this.pollTimer)
			this.pollTimer = undefined
		}
	}

	private setDisconnectedState(message: string): void {
		this.state.connection = 'disconnected'
		this.state.power = 'unknown'
		this.state.inputCode = null
		this.state.brightness = null
		this.state.volume = null
		this.state.audioOutVolume = null
		this.updateStatus(InstanceStatus.ConnectionFailure, message)
		this.updateAllVariables()
		this.checkFeedbacks()
	}

	private async refreshState(): Promise<void> {
		if (!this.client?.isConnected) return
		if (this.isVerboseDebugEnabled()) this.log('debug', 'Starting poll cycle')

		try {
			const power = await this.client.getPower()
			if (power === PowerStateValues.on) this.state.power = 'on'
			else if (power === PowerStateValues.off) this.state.power = 'off'
			else this.state.power = 'unknown'
		} catch (error) {
			this.log('warn', `Power poll failed: ${formatError(error)}`)
		}

		if (this.state.power !== 'on') {
			this.updateAllVariables()
			this.checkFeedbacks()
			return
		}

		try {
			const input = await this.client.getInput()
			if (typeof input === 'number') this.state.inputCode = input
		} catch (error) {
			this.log(isRejectedCommandError(error) ? 'debug' : 'warn', `Input poll failed: ${formatError(error)}`)
		}

		try {
			this.state.brightness = (await this.client.getBrightness()) ?? this.state.brightness
		} catch (error) {
			this.log(isRejectedCommandError(error) ? 'debug' : 'warn', `Brightness poll failed: ${formatError(error)}`)
		}

		try {
			const volume = await this.client.getVolume()
			if (volume) {
				this.state.volume = volume.volume
				this.state.audioOutVolume = volume.audioOutVolume
			}
		} catch (error) {
			this.log(isRejectedCommandError(error) ? 'debug' : 'warn', `Volume poll failed: ${formatError(error)}`)
		}

		try {
			this.state.model = (await this.client.getPlatformInfo(0x01)) ?? this.state.model
			this.state.fwVersion = (await this.client.getPlatformInfo(0x00)) ?? this.state.fwVersion
			this.state.buildDate = ''
		} catch (error) {
			this.log('debug', `Device info poll failed: ${formatError(error)}`)
		}

		try {
			this.state.operatingHours = (await this.client.getOperatingHours()) ?? this.state.operatingHours
		} catch (error) {
			this.log('debug', `Operating hours poll failed: ${formatError(error)}`)
		}

		this.updateAllVariables()
		this.checkFeedbacks()
		if (this.isVerboseDebugEnabled()) this.log('debug', 'Completed poll cycle')
	}

	private updateAllVariables(): void {
		this.setVariableValues({
			connection: this.state.connection,
			power: this.state.power,
			input_code: this.state.inputCode === null ? '' : String(this.state.inputCode),
			input_label: inputCodeToLabel(this.state.inputCode),
			brightness: this.state.brightness === null ? '' : String(this.state.brightness),
			volume: this.state.volume === null ? '' : String(this.state.volume),
			audio_out_volume: this.state.audioOutVolume === null ? '' : String(this.state.audioOutVolume),
			model: this.state.model,
			fw_version: this.state.fwVersion,
			build_date: this.state.buildDate,
			operating_hours: this.state.operatingHours === null ? '' : String(this.state.operatingHours),
		})
	}

	private isVerboseDebugEnabled(): boolean {
		return Boolean(this.config.debugLogging)
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)

function clampPercent(value: number): number {
	return Math.max(0, Math.min(100, Math.round(value)))
}

function formatError(error: unknown): string {
	if (error instanceof Error) return error.message
	return String(error)
}

function isRejectedCommandError(error: unknown): boolean {
	if (!(error instanceof Error)) return false
	return error.message === 'Command canceled or NACK' || error.message === 'Parse error or NAV'
}
