import type { ModuleInstance } from './main.js'

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	self.setVariableDefinitions([
		{ variableId: 'connection', name: 'Connection state' },
		{ variableId: 'power', name: 'Power state' },
		{ variableId: 'input_code', name: 'Input code' },
		{ variableId: 'input_label', name: 'Input label' },
		{ variableId: 'volume', name: 'Speaker volume (0-100)' },
		{ variableId: 'audio_out_volume', name: 'Audio out volume (0-100)' },
		{ variableId: 'model', name: 'Model number' },
		{ variableId: 'fw_version', name: 'Firmware version' },
		{ variableId: 'build_date', name: 'Firmware build date' },
		{ variableId: 'operating_hours', name: 'Operating hours' },
	])
}
