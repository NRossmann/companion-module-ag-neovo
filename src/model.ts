import { InputSources } from './neovo.js'

export type ModuleState = {
	connection: 'connected' | 'disconnected' | 'connecting'
	power: 'on' | 'off' | 'unknown'
	inputCode: number | null
	brightness: number | null
	volume: number | null
	audioOutVolume: number | null
	model: string
	fwVersion: string
	buildDate: string
	operatingHours: number | null
}

export const InputChoices: Array<{ id: number; label: string }> = [
	{ id: InputSources.vga, label: 'VGA' },
	{ id: InputSources.dvi, label: 'DVI' },
	{ id: InputSources.hdmi, label: 'HDMI' },
	{ id: InputSources.dp, label: 'DisplayPort' },
]

const InputLabelById = new Map<number, string>(InputChoices.map((choice) => [choice.id, choice.label]))

export function inputCodeToLabel(inputCode: number | null): string {
	if (inputCode === null) return 'Unknown'
	if (inputCode === InputSources.noSignal) return 'No Signal'
	const directLabel = InputLabelById.get(inputCode)
	if (directLabel) return directLabel

	const normalizedCode = inputCode & 0x1f
	const normalizedLabel = InputLabelById.get(normalizedCode)
	if (normalizedLabel) {
		return `${normalizedLabel} (ext 0x${inputCode.toString(16).padStart(2, '0')})`
	}

	return `Unknown (0x${inputCode.toString(16).padStart(2, '0')})`
}
