import { combineRgb } from '@companion-module/base'
import type { ModuleInstance } from './main.js'
import { InputChoices } from './model.js'

export function UpdateFeedbacks(self: ModuleInstance): void {
	self.setFeedbackDefinitions({
		connection: {
			name: 'Connection is active',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 150, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [],
			callback: () => {
				return self.state.connection === 'connected'
			},
		},
		power_on: {
			name: 'Power is on',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 150, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [],
			callback: () => {
				return self.state.power === 'on'
			},
		},
		input_is: {
			name: 'Input equals source',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(180, 80, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					id: 'source',
					type: 'dropdown',
					label: 'Input source',
					default: InputChoices[0]?.id ?? 0x0d,
					choices: InputChoices,
				},
			],
			callback: (feedback) => {
				return self.state.inputCode === Number(feedback.options.source)
			},
		},
	})
}
