import { InputSources } from './neovo.js'

export type ModuleState = {
	connection: 'connected' | 'disconnected' | 'connecting'
	power: 'on' | 'off' | 'unknown'
	inputCode: number | null
	volume: number | null
	audioOutVolume: number | null
	model: string
	fwVersion: string
	buildDate: string
	operatingHours: number | null
}

export const InputChoices: Array<{ id: number; label: string }> = [
	{ id: InputSources.video, label: 'VIDEO' },
	{ id: InputSources.svideo, label: 'S-VIDEO' },
	{ id: InputSources.component, label: 'COMPONENT' },
	{ id: InputSources.vga, label: 'VGA' },
	{ id: InputSources.hdmi2, label: 'HDMI 2' },
	{ id: InputSources.dp2, label: 'DisplayPort 2' },
	{ id: InputSources.usb2, label: 'USB 2' },
	{ id: InputSources.cardDviD, label: 'Card DVI-D' },
	{ id: InputSources.dp1, label: 'DisplayPort 1' },
	{ id: InputSources.cardOps, label: 'Card OPS' },
	{ id: InputSources.usb1, label: 'USB 1' },
	{ id: InputSources.hdmi, label: 'HDMI' },
	{ id: InputSources.dviD, label: 'DVI-D' },
	{ id: InputSources.hdmi3, label: 'HDMI 3' },
	{ id: InputSources.browser, label: 'BROWSER' },
	{ id: InputSources.smartCms, label: 'SMARTCMS' },
	{ id: InputSources.dms, label: 'DMS' },
	{ id: InputSources.internalStorage, label: 'INTERNAL STORAGE' },
	{ id: InputSources.mediaPlayer, label: 'MEDIA PLAYER' },
	{ id: InputSources.pdfPlayer, label: 'PDF PLAYER' },
	{ id: InputSources.custom, label: 'CUSTOM' },
	{ id: InputSources.hdmi4, label: 'HDMI 4' },
]

const InputLabelById = new Map<number, string>(InputChoices.map((choice) => [choice.id, choice.label]))

export function inputCodeToLabel(inputCode: number | null): string {
	if (inputCode === null) return 'Unknown'
	return InputLabelById.get(inputCode) ?? `Unknown (0x${inputCode.toString(16).padStart(2, '0')})`
}
