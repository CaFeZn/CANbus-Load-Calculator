// modules/calculator.js

import { DLC_TO_LENGTH } from './config.js';

export function getFrameLength(frameType, dataLength) {
	let stuffableOverhead = 0;
	const fixedBits = 1 + 1 + 2 + 7 + 3; // SOF, CRC Del, ACK(Slot+Del), EOF, IFS
	let dataBits = dataLength * 8;
	let dlcVal;

	switch (frameType) {
		case 'CAN_STANDARD':
			stuffableOverhead = 11 + 1 + 1 + 1 + 4 + 15; // ID, RTR, IDE, r0, DLC, CRC
			break;
		case 'CAN_STANDARD_REMOTE':
			stuffableOverhead = 11 + 1 + 1 + 1 + 4 + 15; // ID, RTR, IDE, r0, DLC, CRC
			dataBits = 0;
			break;
		case 'CAN_EXTENDED':
			stuffableOverhead = 11 + 1 + 1 + 18 + 1 + 1 + 1 + 4 + 15; // BaseID, SRR, IDE, ExtID, RTR, r1, r0, DLC, CRC
			break;
		case 'CAN_EXTENDED_REMOTE':
			stuffableOverhead = 11 + 1 + 1 + 18 + 1 + 1 + 1 + 4 + 15; // BaseID, SRR, IDE, ExtID, RTR, r1, r0, DLC, CRC
			dataBits = 0;
			break;
		case 'FDCAN_STANDARD': {
			dlcVal = DLC_TO_LENGTH.findIndex(len => len >= dataLength);
			if (dlcVal === -1) dlcVal = 15;
			dataBits = DLC_TO_LENGTH[dlcVal] * 8;
			const crcBitCount = (dlcVal <= 10) ? 17 : 21;
			const nominalStuffableBits = 1 + 11 + 1 + 1 + 1 + 1 + 1; // SOF, ID, RRS, IDE, FDF, r, BRS
			const nominalFixedBits = 2 + 7 + 3; // ACK(Slot+Del), EOF, IFS
			const dataStuffableBits = 1 + 4 + dataBits + 4 + crcBitCount; // ESI, DLC, Data, StuffCount, CRC
			const dataFixedBits = 1; // CRC Del
			return getSplitFrameLength(nominalStuffableBits, nominalFixedBits, dataStuffableBits, dataFixedBits);
		}
		case 'FDCAN_EXTENDED': {
			dlcVal = DLC_TO_LENGTH.findIndex(len => len >= dataLength);
			if (dlcVal === -1) dlcVal = 15;
			dataBits = DLC_TO_LENGTH[dlcVal] * 8;
			const crcBitCount = (dlcVal <= 10) ? 17 : 21;
			const nominalStuffableBits = 1 + 11 + 1 + 1 + 18 + 1 + 1 + 1; // SOF, BaseID, SRR, IDE, ExtID, FDF, r, BRS
			const nominalFixedBits = 2 + 7 + 3; // ACK(Slot+Del), EOF, IFS
			const dataStuffableBits = 1 + 4 + dataBits + 4 + crcBitCount; // ESI, DLC, Data, StuffCount, CRC
			const dataFixedBits = 1; // CRC Del
			return getSplitFrameLength(nominalStuffableBits, nominalFixedBits, dataStuffableBits, dataFixedBits);
		}
		default:
			throw new Error(`Unsupported frame type: ${String(frameType)}`);
	}

	const stuffableBits = stuffableOverhead + dataBits;
	const minLength = stuffableBits + fixedBits;
	const maxStuffing = Math.floor(stuffableBits / 5);
	const maxLength = minLength + maxStuffing;

	return {
		min: minLength,
		max: maxLength,
		nominalMin: minLength,
		nominalMax: maxLength,
		dataMin: 0,
		dataMax: 0
	};
}

function getSplitFrameLength(nominalStuffableBits, nominalFixedBits, dataStuffableBits, dataFixedBits) {
	const nominalMin = nominalStuffableBits + nominalFixedBits;
	const nominalStuffing = Math.floor(nominalStuffableBits / 5);
	const dataStuffing = Math.floor(dataStuffableBits / 5);
	const totalStuffing = Math.floor((nominalStuffableBits + dataStuffableBits) / 5);
	const crossPhaseStuffing = totalStuffing - nominalStuffing - dataStuffing;
	const nominalMax = nominalMin + nominalStuffing;
	const dataMin = dataStuffableBits + dataFixedBits;
	const dataMax = dataMin + dataStuffing + crossPhaseStuffing;
	return {
		min: nominalMin + dataMin,
		max: nominalMax + dataMax,
		nominalMin,
		nominalMax,
		dataMin,
		dataMax
	};
}
