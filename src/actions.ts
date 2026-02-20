import type { ModuleInstance } from './main.js'
import { InputChoices } from './model.js'

export function UpdateActions(self: ModuleInstance): void {
	self.setActionDefinitions({
		power: {
			name: 'Set power',
			options: [
				{
					id: 'state',
					type: 'dropdown',
					label: 'Power state',
					default: 'on',
					choices: [
						{ id: 'on', label: 'On' },
						{ id: 'off', label: 'Off' },
					],
				},
			],
			callback: async (event) => {
				await self.actionPower(event.options.state === 'on')
			},
		},
		input: {
			name: 'Set input source',
			options: [
				{
					id: 'source',
					type: 'dropdown',
					label: 'Input source',
					default: InputChoices[0]?.id ?? 0x0d,
					choices: InputChoices,
				},
			],
			callback: async (event) => {
				await self.actionInput(Number(event.options.source))
			},
		},
		set_volume: {
			name: 'Set volume',
			options: [
				{
					id: 'volume',
					type: 'number',
					label: 'Volume (0-100)',
					default: 50,
					min: 0,
					max: 100,
				},
			],
			callback: async (event) => {
				await self.actionSetVolume(Number(event.options.volume))
			},
		},
		adjust_volume: {
			name: 'Adjust volume by delta',
			options: [
				{
					id: 'delta',
					type: 'number',
					label: 'Delta (-100 to 100)',
					default: 5,
					min: -100,
					max: 100,
				},
			],
			callback: async (event) => {
				await self.actionAdjustVolume(Number(event.options.delta))
			},
		},
		refresh: {
			name: 'Refresh device state',
			options: [],
			callback: async () => {
				await self.actionRefresh()
			},
		},
	})
}
