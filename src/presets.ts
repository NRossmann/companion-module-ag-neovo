import type { ModuleInstance } from './main.js'
import { CompanionPresetDefinitions, combineRgb } from '@companion-module/base'
import { InputSources } from './neovo.js'

export function UpdatePresets(self: ModuleInstance): void {
	const presets: CompanionPresetDefinitions = {}
	presets.power_on = {
		type: 'button',
		category: 'Power',
		name: 'Power On',
		style: {
			text: 'Power\nOn',
			size: 'auto',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 120, 0),
			show_topbar: false,
		},
		steps: [
			{
				down: [
					{
						actionId: 'power',
						options: { state: 'on' },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'power_on',
				options: {},
				style: {
					bgcolor: combineRgb(0, 160, 0),
					color: combineRgb(255, 255, 255),
				},
			},
		],
	}

	presets.power_off = {
		type: 'button',
		category: 'Power',
		name: 'Power Off',
		style: {
			text: 'Power\nOff',
			size: 'auto',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(130, 0, 0),
			show_topbar: false,
		},
		steps: [
			{
				down: [
					{
						actionId: 'power',
						options: { state: 'off' },
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets.input_hdmi = {
		type: 'button',
		category: 'Input',
		name: 'Input HDMI',
		style: {
			text: 'Input\nHDMI',
			size: 'auto',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 60, 140),
			show_topbar: false,
		},
		steps: [
			{
				down: [
					{
						actionId: 'input',
						options: { source: InputSources.hdmi },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'input_is',
				options: { source: InputSources.hdmi },
				style: {
					bgcolor: combineRgb(0, 90, 200),
					color: combineRgb(255, 255, 255),
				},
			},
		],
	}

	presets.input_dp1 = {
		type: 'button',
		category: 'Input',
		name: 'Input DP1',
		style: {
			text: 'Input\nDP1',
			size: 'auto',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 60, 140),
			show_topbar: false,
		},
		steps: [
			{
				down: [
					{
						actionId: 'input',
						options: { source: InputSources.dp1 },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'input_is',
				options: { source: InputSources.dp1 },
				style: {
					bgcolor: combineRgb(0, 90, 200),
					color: combineRgb(255, 255, 255),
				},
			},
		],
	}

	presets.volume_up = {
		type: 'button',
		category: 'Audio',
		name: 'Volume +5',
		style: {
			text: 'Volume\n+5',
			size: 'auto',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(90, 90, 0),
			show_topbar: false,
		},
		steps: [
			{
				down: [
					{
						actionId: 'adjust_volume',
						options: { delta: 5 },
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets.volume_down = {
		type: 'button',
		category: 'Audio',
		name: 'Volume -5',
		style: {
			text: 'Volume\n-5',
			size: 'auto',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(90, 90, 0),
			show_topbar: false,
		},
		steps: [
			{
				down: [
					{
						actionId: 'adjust_volume',
						options: { delta: -5 },
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	self.setPresetDefinitions(presets)
}
