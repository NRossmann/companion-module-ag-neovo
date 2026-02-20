import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export interface ModuleConfig {
	host: string
	port: number
	monitorId: number
	timeoutMs: number
	retries: number
	pollInterval: number
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Target IP',
			width: 8,
			regex: Regex.IP,
		},
		{
			type: 'number',
			id: 'port',
			label: 'Target Port',
			width: 4,
			min: 1,
			max: 65535,
			default: 5000,
		},
		{
			type: 'number',
			id: 'monitorId',
			label: 'Monitor ID',
			width: 4,
			min: 0,
			max: 255,
			default: 1,
		},
		{
			type: 'number',
			id: 'timeoutMs',
			label: 'Command Timeout (ms)',
			width: 4,
			min: 100,
			max: 5000,
			default: 500,
		},
		{
			type: 'number',
			id: 'retries',
			label: 'Retries',
			width: 4,
			min: 0,
			max: 10,
			default: 2,
		},
		{
			type: 'number',
			id: 'pollInterval',
			label: 'Poll Interval (ms)',
			width: 4,
			min: 0,
			max: 60000,
			default: 5000,
		},
	]
}
