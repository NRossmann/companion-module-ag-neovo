## AG Neovo (RS232 over IP)

This module controls AG Neovo displays that support the SICP RS232 protocol over LAN.

### Connection

- Set the display IP address in `Target IP`.
- Set `Target Port` to `5000` (default from AG Neovo SICP documentation).
- Set `Monitor ID` to your display address (usually `1`).

### Supported in v1 (Core Control)

- Power on/off
- Input source switching
- Brightness set/read (0-100)
- Volume set and relative volume up/down
- Device info readout: model number and firmware version
- Operating hours readout

### Feedbacks

- Connection is active
- Power is on
- Input equals source

### Variables

- `$(ag-neovo:connection)`
- `$(ag-neovo:power)`
- `$(ag-neovo:input_code)`
- `$(ag-neovo:input_label)`
- `$(ag-neovo:brightness)`
- `$(ag-neovo:volume)`
- `$(ag-neovo:audio_out_volume)`
- `$(ag-neovo:model)`
- `$(ag-neovo:fw_version)`
- `$(ag-neovo:build_date)`
- `$(ag-neovo:operating_hours)`

### Notes

- RS232 command flow is sequential; this module uses a single-command queue.
- If a monitor ID is wrong, many models return no response. In that case commands will time out.
- Some protocol fields vary by model/firmware. Unsupported commands may return NAV/NACK.
- For protocol troubleshooting, enable `Enable verbose debug logging` in the module config to log TX/RX frames, retries, timeouts, and ACK/NACK details.
